//! CrimeClient shard store (the same account as the client's wardrobe, see mod-api/store_api.py).
//!
//! Sign-in works like joining a Minecraft server: the API hands out a server id, the launcher calls
//! Mojang's `join` with the active account's token and the API checks `hasJoined`. Done here rather than in
//! the webview because neither Mojang nor the API answer cross-origin requests.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use log::{debug, warn};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::CommandError;
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::state::state_manager::State;

pub(crate) const API: &str = "https://crime77.duckdns.org/mod/api";
/// Names, slots and colours of all cosmetics (the client's cosmetics/index.json, kept current by publish_catalog.sh).
const CATALOG_INDEX: &str = "catalog/file?path=cosmetics/index.json";
const MOJANG_JOIN: &str = "https://sessionserver.mojang.com/session/minecraft/join";

/// Paths the frontend may call, so this command can't be turned into a general proxy.
const ALLOWED: &[(&str, &str)] = &[
    ("GET", "store"),
    ("GET", "ranks"),
    ("GET", CATALOG_INDEX),
    ("GET", "account"),
    ("POST", "store/buy"),
    ("POST", "streak/claim"),
    ("POST", "milestone/claim"),
];

/// Store tokens per Minecraft account, kept in this file in the launcher folder so a launcher start needs no new
/// sign-in: every sign-in is a Mojang `join`, and Mojang answers a few of them in a row with 429 (it did on
/// 2026-11-13 and so hid the Insider profile). Never logged.
const TOKEN_FILE: &str = "crimeclient_store_tokens.json";
/// The API keeps a token 30 days; an older one is not even tried.
const TOKEN_MAX_AGE_MS: i64 = 29 * 24 * 3600 * 1000;
/// After Mojang refused a sign-in or could not be reached, nobody asks it again for this long.
const SIGN_IN_COOLDOWN: Duration = Duration::from_secs(60);

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
struct SavedToken {
    token: String,
    /// when the API handed it out (unix ms)
    saved_ms: i64,
}

/// None until the file was read.
static TOKENS: Lazy<Mutex<Option<HashMap<Uuid, SavedToken>>>> = Lazy::new(|| Mutex::new(None));
/// One sign-in at a time: a caller that comes while another signs in takes the token that one got.
static SIGN_IN: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
/// When Mojang last refused a sign-in of an account or could not be reached.
static REFUSED: Lazy<Mutex<HashMap<Uuid, Instant>>> = Lazy::new(|| Mutex::new(HashMap::new()));

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn tokens_path() -> PathBuf {
    LAUNCHER_DIRECTORY.root_dir().join(TOKEN_FILE)
}

fn fresh(saved: &SavedToken, now_ms: i64) -> bool {
    now_ms - saved.saved_ms < TOKEN_MAX_AGE_MS
}

async fn read_tokens(path: &Path, now_ms: i64) -> HashMap<Uuid, SavedToken> {
    match tokio::fs::read_to_string(path).await {
        Ok(text) => match serde_json::from_str::<HashMap<Uuid, SavedToken>>(&text) {
            Ok(tokens) => tokens.into_iter().filter(|(_, saved)| fresh(saved, now_ms)).collect(),
            Err(e) => {
                // only where: serde's message may quote a value, and that could be a token
                warn!("[Store] Could not read {:?} (line {}, column {}), signing in again", path, e.line(), e.column());
                HashMap::new()
            }
        },
        Err(_) => HashMap::new(),
    }
}

async fn write_tokens(path: &Path, tokens: &HashMap<Uuid, SavedToken>) {
    let text = match serde_json::to_string_pretty(tokens) {
        Ok(text) => text,
        Err(e) => return warn!("[Store] Could not serialize the tokens: {}", e),
    };
    let temp = path.with_extension("json.tmp");
    let result = async {
        tokio::fs::write(&temp, text).await?;
        tokio::fs::rename(&temp, path).await
    }
    .await;
    if let Err(e) = result {
        warn!("[Store] Could not write {:?}: {}", path, e);
    }
}

/// The saved token of `account`, if it has a fresh one.
async fn saved_token(account: Uuid) -> Option<String> {
    let now = now_ms();
    let mut guard = TOKENS.lock().await;
    if guard.is_none() {
        *guard = Some(read_tokens(&tokens_path(), now).await);
    }
    guard
        .as_ref()
        .and_then(|tokens| tokens.get(&account))
        .filter(|saved| fresh(saved, now))
        .map(|saved| saved.token.clone())
}

/// Keeps `token` for `account` (None forgets its token) and writes the file.
async fn save_token(account: Uuid, token: Option<String>) {
    let now = now_ms();
    let mut guard = TOKENS.lock().await;
    if guard.is_none() {
        *guard = Some(read_tokens(&tokens_path(), now).await);
    }
    let Some(tokens) = guard.as_mut() else { return };
    match token {
        Some(token) => {
            tokens.insert(account, SavedToken { token, saved_ms: now });
        }
        None => {
            if tokens.remove(&account).is_none() {
                return;
            }
        }
    }
    write_tokens(&tokens_path(), tokens).await;
}

/// How long nobody may ask Mojang again after a refusal at `refused`; None once that is over.
fn cooldown_left(refused: Option<Instant>, now: Instant) -> Option<Duration> {
    let left = SIGN_IN_COOLDOWN.checked_sub(now.saturating_duration_since(refused?))?;
    (!left.is_zero()).then_some(left)
}

fn store_error(message: impl Into<String>, status: Option<u16>) -> CommandError {
    CommandError {
        message: message.into(),
        kind: "StoreError".to_string(),
        status,
        ..Default::default()
    }
}

async fn read_json(response: reqwest::Response) -> Result<Value, CommandError> {
    let status = response.status();
    let body: Value = response.json().await.unwrap_or(Value::Null);
    if status.is_success() {
        return Ok(body);
    }
    let message = body
        .get("error")
        .and_then(Value::as_str)
        .unwrap_or("request failed")
        .to_string();
    Err(store_error(message, Some(status.as_u16())))
}

pub(crate) async fn active_account() -> Result<Credentials, CommandError> {
    let state = State::get().await?;
    state
        .minecraft_account_manager_v2
        .get_active_account()
        .await?
        .ok_or_else(|| store_error("not signed in", Some(401)))
}

/// Why a sign-in failed; `mojang` when Mojang refused it or could not be reached (then nobody asks again for a while).
struct SignInError {
    mojang: bool,
    error: CommandError,
}

impl From<CommandError> for SignInError {
    fn from(error: CommandError) -> Self {
        SignInError { mojang: false, error }
    }
}

async fn sign_in(account: &Credentials) -> Result<String, SignInError> {
    debug!("[Store] signing in {}", account.username);
    let start = read_json(
        HTTP_CLIENT
            .post(format!("{API}/auth/start"))
            .send()
            .await
            .map_err(|e| store_error(format!("store not reachable: {e}"), None))?,
    )
    .await?;
    let server_id = start
        .get("serverId")
        .and_then(Value::as_str)
        .ok_or_else(|| store_error("bad answer from store", None))?
        .to_string();

    let joined = HTTP_CLIENT
        .post(MOJANG_JOIN)
        .json(&json!({
            "accessToken": account.access_token,
            "selectedProfile": account.id.simple().to_string(),
            "serverId": server_id,
        }))
        .send()
        .await
        .map_err(|e| SignInError { mojang: true, error: store_error(format!("Mojang not reachable: {e}"), None) })?;
    if !joined.status().is_success() {
        warn!("[Store] Mojang join failed with {}", joined.status());
        return Err(SignInError {
            mojang: true,
            error: store_error("Mojang rejected the sign-in", Some(joined.status().as_u16())),
        });
    }

    let finish = read_json(
        HTTP_CLIENT
            .post(format!("{API}/auth/finish"))
            .json(&json!({ "name": account.username, "serverId": server_id }))
            .send()
            .await
            .map_err(|e| store_error(format!("store not reachable: {e}"), None))?,
    )
    .await?;
    Ok(finish
        .get("token")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| store_error("bad answer from store", None))?)
}

/// The store token of `account` (saved from an earlier sign-in); signs in first when there is none.
pub(crate) async fn token_for(account: &Credentials) -> Result<String, CommandError> {
    match saved_token(account.id).await {
        Some(token) => Ok(token),
        None => renew_token(account, None).await,
    }
}

/// Signs `account` in again because the API did not take `stale` (the token the caller used; None when it had
/// none) and saves the new token. A caller that comes while another one signs the account in gets that token
/// instead, and for a minute after Mojang refused or could not be reached the answer is an error without asking it.
pub(crate) async fn renew_token(account: &Credentials, stale: Option<&str>) -> Result<String, CommandError> {
    let _one_at_a_time = SIGN_IN.lock().await;
    if let Some(current) = saved_token(account.id).await {
        if stale != Some(current.as_str()) {
            return Ok(current);
        }
        save_token(account.id, None).await;
    }
    let refused = REFUSED.lock().await.get(&account.id).copied();
    if let Some(left) = cooldown_left(refused, Instant::now()) {
        return Err(store_error(
            format!("Mojang refused the last sign-in, trying again in {} s", left.as_secs().max(1)),
            Some(429),
        ));
    }
    match sign_in(account).await {
        Ok(token) => {
            REFUSED.lock().await.remove(&account.id);
            save_token(account.id, Some(token.clone())).await;
            Ok(token)
        }
        Err(SignInError { mojang, error }) => {
            if mojang {
                REFUSED.lock().await.insert(account.id, Instant::now());
            }
            Err(error)
        }
    }
}

async fn send(method: &str, path: &str, body: &Option<Value>, token: Option<&str>) -> Result<reqwest::Response, CommandError> {
    let url = format!("{API}/{path}");
    let mut request = if method == "POST" {
        HTTP_CLIENT.post(url).json(body.as_ref().unwrap_or(&json!({})))
    } else {
        HTTP_CLIENT.get(url)
    };
    if let Some(token) = token {
        request = request.bearer_auth(token);
    }
    request
        .send()
        .await
        .map_err(|e| store_error(format!("store not reachable: {e}"), None))
}

/// Calls the store API; signs in with the active Minecraft account first where needed.
#[tauri::command]
pub async fn crime_store_request(method: String, path: String, body: Option<Value>) -> Result<Value, CommandError> {
    let method = method.to_uppercase();
    if !ALLOWED.iter().any(|(m, p)| *m == method && *p == path) {
        return Err(store_error(format!("not allowed: {method} {path}"), Some(403)));
    }
    if path == "store" || path == "ranks" || path == CATALOG_INDEX {
        return read_json(send(&method, &path, &body, None).await?).await;
    }

    let account = active_account().await?;
    let token = token_for(&account).await?;

    let response = send(&method, &path, &body, Some(&token)).await?;
    if response.status().as_u16() != 401 {
        return read_json(response).await;
    }
    // token expired or the API lost it: sign in again once
    let token = renew_token(&account, Some(&token)).await?;
    read_json(send(&method, &path, &body, Some(&token)).await?).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn tokens_file_round_trip_drops_old_tokens() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(TOKEN_FILE);
        let now = 100 * 24 * 3600 * 1000;
        assert!(read_tokens(&path, now).await.is_empty());

        let (fresh_id, old_id) = (Uuid::new_v4(), Uuid::new_v4());
        let mut tokens = HashMap::new();
        tokens.insert(fresh_id, SavedToken { token: "a".into(), saved_ms: now - 1000 });
        tokens.insert(old_id, SavedToken { token: "b".into(), saved_ms: now - TOKEN_MAX_AGE_MS - 1 });
        write_tokens(&path, &tokens).await;

        let read = read_tokens(&path, now).await;
        assert_eq!(read.len(), 1);
        assert_eq!(read[&fresh_id].token, "a");

        tokio::fs::write(&path, "not json").await.unwrap();
        assert!(read_tokens(&path, now).await.is_empty());
    }

    #[test]
    fn cooldown_after_a_refusal() {
        let refused = Instant::now();
        assert_eq!(cooldown_left(None, refused), None);
        assert_eq!(cooldown_left(Some(refused), refused), Some(SIGN_IN_COOLDOWN));
        let left = cooldown_left(Some(refused), refused + Duration::from_secs(45)).unwrap();
        assert_eq!(left, Duration::from_secs(15));
        assert_eq!(cooldown_left(Some(refused), refused + SIGN_IN_COOLDOWN), None);
        assert_eq!(cooldown_left(Some(refused), refused + Duration::from_secs(600)), None);
    }
}
