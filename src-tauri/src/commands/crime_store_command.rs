//! CrimeClient shard store (the same account as the client's wardrobe, see mod-api/store_api.py).
//!
//! Sign-in works like joining a Minecraft server: the API hands out a server id, the launcher calls
//! Mojang's `join` with the active account's token and the API checks `hasJoined`. Done here rather than in
//! the webview because neither Mojang nor the API answer cross-origin requests.

use std::collections::HashMap;

use log::{debug, warn};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::HTTP_CLIENT;
use crate::error::CommandError;
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::state::state_manager::State;

const API: &str = "https://crime77.duckdns.org/mod/api";
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

/// Store tokens per Minecraft account, for this launcher session (they are valid for 30 days on the API).
static TOKENS: Lazy<Mutex<HashMap<Uuid, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

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

async fn active_account() -> Result<Credentials, CommandError> {
    let state = State::get().await?;
    state
        .minecraft_account_manager_v2
        .get_active_account()
        .await?
        .ok_or_else(|| store_error("not signed in", Some(401)))
}

async fn sign_in(account: &Credentials) -> Result<String, CommandError> {
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
        .map_err(|e| store_error(format!("Mojang not reachable: {e}"), None))?;
    if !joined.status().is_success() {
        warn!("[Store] Mojang join failed with {}", joined.status());
        return Err(store_error("Mojang rejected the sign-in", Some(joined.status().as_u16())));
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
    finish
        .get("token")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| store_error("bad answer from store", None))
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
    let cached = TOKENS.lock().await.get(&account.id).cloned();
    let token = match cached {
        Some(token) => token,
        None => {
            let token = sign_in(&account).await?;
            TOKENS.lock().await.insert(account.id, token.clone());
            token
        }
    };

    let response = send(&method, &path, &body, Some(&token)).await?;
    if response.status().as_u16() != 401 {
        return read_json(response).await;
    }
    // token expired or the API lost it: sign in again once
    let token = sign_in(&account).await?;
    TOKENS.lock().await.insert(account.id, token.clone());
    read_json(send(&method, &path, &body, Some(&token)).await?).await
}
