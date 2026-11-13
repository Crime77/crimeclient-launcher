//! CrimeClient Insider: a private profile that only devs and chosen Minecraft accounts see and download. The API
//! (mod-api `insider/launcher` and `insider/release/<jar>`) answers only with the store sign-in of such an account
//! (crime_store_command.rs): 401 means sign in again, 403 means this account has no access.
//!
//! The last answer per account is kept in `crimeclient_insider.json` in the launcher folder, so the profile stays
//! there while the API can't be reached. When the check can't be done (Mojang refuses the sign-in, as it does with
//! 429 after a few in a row), the public Insider list (`GET insiders`, `GET ranks`) decides instead, as long as this
//! PC knows the pack, and the UI asks again later (`InsiderStatus.retry`). Its pack and standard profile are merged into the lists after every fetch
//! of modpacks.json and versions.json (norisk_packs_state.rs, norisk_versions_state.rs), so `sync_standard_profiles`
//! makes the Insider copy just like the public one. The pack stays in the list even when no account has access any
//! more (otherwise `resolve_and_migrate_pack_id` would clear it from an installed Insider profile), the profile only
//! while some account on this PC has access. Which account sees it is decided in the UI (`get_insider_status`,
//! src/store/insider-store.ts), so switching to an account without access hides it and deletes nothing.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use log::{debug, info, warn};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::commands::crime_store_command::{self, API};
use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, CommandError};
use crate::integrations::norisk_packs::{NoriskModpacksConfig, NoriskPackDefinition};
use crate::integrations::norisk_versions::NoriskVersionsConfig;
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;

const CACHE_FILE: &str = "crimeclient_insider.json";

/// What `insider/launcher` answered: the Insider pack and its standard profile, shaped exactly like an entry of
/// modpacks.json `packs` and of versions.json `profiles`. Kept as JSON and read when merged, so a launcher update
/// that changes those types doesn't lose the cache.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub(crate) struct InsiderAnswer {
    pub pack_id: String,
    pub pack: Value,
    pub profile: Value,
}

impl InsiderAnswer {
    fn profile_id(&self) -> Option<Uuid> {
        self.profile.get("id").and_then(Value::as_str).and_then(|id| Uuid::parse_str(id).ok())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
struct AccountEntry {
    /// the account got the Insider profile at its last check that reached the API
    access: bool,
    /// when that check was (unix ms)
    #[serde(default)]
    checked_ms: i64,
    /// the last answer this account got; kept after a 403, so the pack stays known
    #[serde(default)]
    answer: Option<InsiderAnswer>,
    #[serde(default)]
    answer_ms: i64,
}

/// `crimeclient_insider.json`: per Minecraft account uuid the last answer of the API.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub(crate) struct InsiderCache {
    #[serde(default)]
    accounts: HashMap<Uuid, AccountEntry>,
}

impl InsiderCache {
    /// The newest answer any account on this PC got.
    fn newest(&self) -> Option<&InsiderAnswer> {
        self.accounts
            .values()
            .filter(|entry| entry.answer.is_some())
            .max_by_key(|entry| entry.answer_ms)
            .and_then(|entry| entry.answer.as_ref())
    }

    fn any_access(&self) -> bool {
        self.accounts.values().any(|entry| entry.access)
    }

    /// The account had access at its last check (false for an account that was never checked).
    pub(crate) fn access(&self, account: Uuid) -> bool {
        self.accounts.get(&account).is_some_and(|entry| entry.access)
    }

    fn granted(&mut self, account: Uuid, answer: InsiderAnswer, now_ms: i64) {
        let entry = self.accounts.entry(account).or_default();
        entry.access = true;
        entry.checked_ms = now_ms;
        entry.answer = Some(answer);
        entry.answer_ms = now_ms;
    }

    fn denied(&mut self, account: Uuid, now_ms: i64) {
        let entry = self.accounts.entry(account).or_default();
        entry.access = false;
        entry.checked_ms = now_ms;
    }

    /// The public list names `account` while its own check could not be done (Mojang refused the sign-in or could
    /// not be reached): it gets the profile when this PC knows the pack. That only shows it and lets files that are
    /// already downloaded start; the API still checks every download. Returns whether that gave it access.
    fn listed_publicly(&mut self, account: Uuid) -> bool {
        if self.newest().is_none() || self.access(account) {
            return false;
        }
        self.accounts.entry(account).or_default().access = true;
        true
    }

    /// What the pack and profile lists get from this cache; they need merging again when it changes.
    fn listed(&self) -> (Option<&InsiderAnswer>, bool) {
        (self.newest(), self.any_access())
    }
}

/// Puts the Insider pack into a pack list (freshly fetched or loaded), even when no account has access any more.
pub(crate) fn merge_packs(config: &mut NoriskModpacksConfig, cache: &InsiderCache) {
    let Some(answer) = cache.newest() else { return };
    match serde_json::from_value::<NoriskPackDefinition>(answer.pack.clone()) {
        Ok(pack) => {
            config.packs.insert(answer.pack_id.clone(), pack);
        }
        Err(e) => warn!("[Insider] The cached pack '{}' is not a valid pack: {}", answer.pack_id, e),
    }
}

/// Puts the Insider profile into the standard profiles while some account on this PC has access, else takes it out
/// (`sync_standard_profiles` then removes the copy, but only if it was never installed or played).
pub(crate) fn merge_versions(config: &mut NoriskVersionsConfig, cache: &InsiderCache) {
    let Some(answer) = cache.newest() else { return };
    let profile = match serde_json::from_value::<Profile>(answer.profile.clone()) {
        Ok(profile) => profile,
        Err(e) => {
            warn!("[Insider] The cached profile is not a valid profile: {}", e);
            return;
        }
    };
    config.profiles.retain(|p| p.id != profile.id);
    if cache.any_access() {
        config.profiles.push(profile);
    }
}

/// None until the file was read.
static CACHE: Lazy<Mutex<Option<InsiderCache>>> = Lazy::new(|| Mutex::new(None));
/// One check at a time (the app start and the first account change come at once).
static REFRESH: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

fn cache_path() -> PathBuf {
    LAUNCHER_DIRECTORY.root_dir().join(CACHE_FILE)
}

async fn read_cache(path: &Path) -> InsiderCache {
    match tokio::fs::read_to_string(path).await {
        Ok(text) => serde_json::from_str(&text).unwrap_or_else(|e| {
            warn!("[Insider] Could not read {:?}, starting empty: {}", path, e);
            InsiderCache::default()
        }),
        Err(_) => InsiderCache::default(),
    }
}

async fn write_cache(path: &Path, cache: &InsiderCache) {
    let text = match serde_json::to_string_pretty(cache) {
        Ok(text) => text,
        Err(e) => return warn!("[Insider] Could not serialize the cache: {}", e),
    };
    let temp = path.with_extension("json.tmp");
    let result = async {
        tokio::fs::write(&temp, text).await?;
        tokio::fs::rename(&temp, path).await
    }
    .await;
    if let Err(e) = result {
        warn!("[Insider] Could not write {:?}: {}", path, e);
    }
}

/// The cache as it is now (read from disk the first time).
pub(crate) async fn snapshot() -> InsiderCache {
    let mut guard = CACHE.lock().await;
    if guard.is_none() {
        *guard = Some(read_cache(&cache_path()).await);
    }
    guard.clone().unwrap_or_default()
}

/// Changes the cache, writes it when something changed and returns it before and after.
async fn update(change: impl FnOnce(&mut InsiderCache)) -> (InsiderCache, InsiderCache) {
    let mut guard = CACHE.lock().await;
    if guard.is_none() {
        *guard = Some(read_cache(&cache_path()).await);
    }
    let before = guard.clone().unwrap_or_default();
    let mut after = before.clone();
    change(&mut after);
    if after != before {
        write_cache(&cache_path(), &after).await;
    }
    *guard = Some(after.clone());
    (before, after)
}

enum Check {
    Granted(InsiderAnswer),
    /// 401 even after a new sign-in, or 403
    Denied,
    /// the API or Mojang couldn't be reached or answered something else: keep what this PC knew
    Unknown(String),
}

fn parse_answer(body: Value) -> Result<InsiderAnswer, String> {
    let pack_id = body
        .get("pack_id")
        .and_then(Value::as_str)
        .filter(|id| !id.trim().is_empty())
        .ok_or("no pack_id")?
        .to_string();
    let pack = body.get("pack").cloned().ok_or("no pack")?;
    let profile = body.get("profile").cloned().ok_or("no profile")?;
    serde_json::from_value::<NoriskPackDefinition>(pack.clone()).map_err(|e| format!("bad pack: {e}"))?;
    serde_json::from_value::<Profile>(profile.clone()).map_err(|e| format!("bad profile: {e}"))?;
    let answer = InsiderAnswer { pack_id, pack, profile };
    // without a fixed id every merge would make a new standard profile
    answer.profile_id().ok_or("profile without id")?;
    Ok(answer)
}

async fn ask(token: &str) -> Result<reqwest::Response, String> {
    HTTP_CLIENT
        .get(format!("{API}/insider/launcher"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("API not reachable: {e}"))
}

async fn check(account: &Credentials) -> Check {
    let token = match crime_store_command::token_for(account).await {
        Ok(token) => token,
        Err(e) => return Check::Unknown(format!("sign-in failed: {}", e.message)),
    };
    let mut response = match ask(&token).await {
        Ok(response) => response,
        Err(e) => return Check::Unknown(e),
    };
    if response.status().as_u16() == 401 {
        // token expired or the API lost it: sign in again once
        let token = match crime_store_command::renew_token(account, Some(&token)).await {
            Ok(token) => token,
            Err(e) => return Check::Unknown(format!("sign-in failed: {}", e.message)),
        };
        response = match ask(&token).await {
            Ok(response) => response,
            Err(e) => return Check::Unknown(e),
        };
    }
    match response.status().as_u16() {
        200 => match response.json::<Value>().await {
            Ok(body) => match parse_answer(body) {
                Ok(answer) => Check::Granted(answer),
                Err(e) => Check::Unknown(format!("bad answer: {e}")),
            },
            Err(e) => Check::Unknown(format!("bad answer: {e}")),
        },
        401 | 403 => Check::Denied,
        status => Check::Unknown(format!("insider/launcher answered {status}")),
    }
}

/// Whether `GET insiders` and `GET ranks` (public, no sign-in) name `account` as an Insider or a dev.
fn listed_in(insiders: &Value, ranks: &Value, account: Uuid) -> bool {
    let id = account.to_string();
    let insider = insiders
        .get("insiders")
        .and_then(Value::as_array)
        .is_some_and(|list| list.iter().filter_map(Value::as_str).any(|uuid| uuid.eq_ignore_ascii_case(&id)));
    let dev = ranks
        .get("ranks")
        .and_then(Value::as_object)
        .is_some_and(|ranks| ranks.iter().any(|(uuid, rank)| uuid.eq_ignore_ascii_case(&id) && rank == "dev"));
    insider || dev
}

/// The public lists for `account`; None when the API can't be read either.
async fn publicly_listed(account: Uuid) -> Option<bool> {
    async fn get(path: &str) -> Option<Value> {
        let response = HTTP_CLIENT.get(format!("{API}/{path}")).send().await.ok()?;
        if !response.status().is_success() {
            return None;
        }
        response.json::<Value>().await.ok()
    }
    let insiders = get("insiders").await?;
    let ranks = get("ranks").await?;
    Some(listed_in(&insiders, &ranks, account))
}

/// Merges the cache into the pack and standard profile lists (and saves them); with `sync` the standard profiles
/// are synced too, which adds or removes the Insider copy.
async fn apply(sync: bool) {
    let state = match State::get().await {
        Ok(state) => state,
        Err(e) => return warn!("[Insider] No state to merge into: {}", e),
    };
    if let Err(e) = state.norisk_pack_manager.merge_insider().await {
        warn!("[Insider] Could not merge the pack: {}", e);
    }
    if let Err(e) = state.norisk_version_manager.merge_insider().await {
        warn!("[Insider] Could not merge the profile: {}", e);
    }
    if sync {
        if let Err(e) = state.profile_manager.sync_standard_profiles().await {
            warn!("[Insider] Could not sync the standard profiles: {}", e);
        }
    }
}

pub(crate) struct Refreshed {
    pub access: bool,
    /// the pack or profile list changed
    pub changed: bool,
    /// the check could not be done (Mojang or the API): worth trying again later
    pub unknown: bool,
}

/// Asks the API whether `account` gets the Insider profile, keeps the answer and merges the lists again when they
/// change (with `sync` also the standard profile copies). When the check can't be done, the public Insider list
/// may still give the account the profile (`InsiderCache::listed_publicly`).
pub(crate) async fn refresh_account(account: &Credentials, sync: bool) -> Refreshed {
    let _one_at_a_time = REFRESH.lock().await;
    let checked = check(account).await;
    let public = match &checked {
        Check::Unknown(_) => publicly_listed(account.id).await,
        _ => None,
    };
    let now_ms = chrono::Utc::now().timestamp_millis();
    let (before, after) = update(|cache| match &checked {
        Check::Granted(answer) => cache.granted(account.id, answer.clone(), now_ms),
        Check::Denied => cache.denied(account.id, now_ms),
        Check::Unknown(_) => {
            if public == Some(true) {
                cache.listed_publicly(account.id);
            }
        }
    })
    .await;
    match &checked {
        Check::Granted(answer) => info!("[Insider] {} has access ({})", account.username, answer.pack_id),
        Check::Denied => debug!("[Insider] {} has no access", account.username),
        Check::Unknown(reason) => warn!(
            "[Insider] Could not check {} ({}), public list: {}, access: {}",
            account.username,
            reason,
            match public {
                Some(true) => "listed",
                Some(false) => "not listed",
                None => "not readable",
            },
            after.access(account.id)
        ),
    }
    let changed = before.listed() != after.listed();
    if changed {
        apply(sync).await;
    }
    Refreshed { access: after.access(account.id), changed, unknown: matches!(checked, Check::Unknown(_)) }
}

/// The pack id of the Insider profile, if this PC knows one.
pub(crate) async fn insider_pack_id() -> Option<String> {
    snapshot().await.newest().map(|answer| answer.pack_id.clone())
}

/// Files of the Insider part of the API, which need the store token of an account with access.
pub(crate) fn is_insider_url(url: &str) -> bool {
    url.starts_with(&format!("{API}/insider/"))
}

/// The account that downloads Insider files: the one of this launch, else the active one. It must have had access
/// at its last check.
pub(crate) async fn download_account(account: Option<Credentials>) -> Result<Credentials, AppError> {
    let account = match account {
        Some(account) => account,
        None => crime_store_command::active_account()
            .await
            .map_err(|e| AppError::Download(format!("CrimeClient Insider needs a signed-in account: {}", e.message)))?,
    };
    if !snapshot().await.access(account.id) {
        return Err(AppError::Download(format!(
            "The account {} has no access to CrimeClient Insider",
            account.username
        )));
    }
    Ok(account)
}

/// What the UI needs to show or hide the Insider profile for the active account.
#[derive(Serialize, Debug, Clone, PartialEq)]
pub struct InsiderStatus {
    /// the active account gets the Insider profile
    access: bool,
    /// the Insider pack this PC knows (hidden in pack pickers without access)
    pack_id: Option<String>,
    /// the Insider standard profile this PC knows (it and its copies are hidden without access)
    profile_id: Option<Uuid>,
    /// the pack or profile lists changed with this check, so the UI loads them again
    changed: bool,
    /// the check could not be done (Mojang refused the sign-in or could not be reached): the UI asks again later
    retry: bool,
}

fn status(cache: &InsiderCache, account: Option<Uuid>, changed: bool, retry: bool) -> InsiderStatus {
    let newest = cache.newest();
    InsiderStatus {
        access: account.is_some_and(|id| cache.access(id)),
        pack_id: newest.map(|answer| answer.pack_id.clone()),
        profile_id: newest.and_then(InsiderAnswer::profile_id),
        changed,
        retry,
    }
}

/// What this PC knows about the active account, without asking the API.
#[tauri::command]
pub async fn get_insider_status() -> Result<InsiderStatus, CommandError> {
    let state = State::get().await?;
    let active = state
        .minecraft_account_manager_v2
        .get_all_accounts()
        .await?
        .into_iter()
        .find(|account| account.active)
        .map(|account| account.id);
    Ok(status(&snapshot().await, active, false, false))
}

/// Asks the API whether the active account gets the Insider profile (on app start and every account change).
#[tauri::command]
pub async fn refresh_insider() -> Result<InsiderStatus, CommandError> {
    let state = State::get().await?;
    let account = match state.minecraft_account_manager_v2.get_active_account().await {
        Ok(account) => account,
        Err(e) => {
            warn!("[Insider] No active account to check: {}", e);
            None
        }
    };
    let (changed, retry) = match &account {
        Some(account) => {
            let refreshed = refresh_account(account, true).await;
            (refreshed.changed, refreshed.unknown)
        }
        None => (false, false),
    };
    Ok(status(&snapshot().await, account.map(|account| account.id), changed, retry))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn pack(name: &str) -> Value {
        json!({ "displayName": name, "description": "", "mods": [] })
    }

    fn answer(profile_id: &str) -> InsiderAnswer {
        InsiderAnswer {
            pack_id: "crimeclient-insider".to_string(),
            pack: pack("CrimeClient Insider"),
            profile: json!({
                "id": profile_id, "name": "CrimeClient Insider 26.3", "path": "crimeclient-insider",
                "game_version": "26.3", "loader": "fabric", "selected_norisk_pack_id": "crimeclient-insider",
                "is_standard_version": true, "group": "CRIMECLIENT",
            }),
        }
    }

    const PROFILE: &str = "6b1c7f0e-3c55-4e0e-9d11-1c2a3b4c5d6e";

    fn public_lists() -> (NoriskModpacksConfig, NoriskVersionsConfig) {
        let mut packs = NoriskModpacksConfig::default();
        packs.packs.insert("crimeclient".to_string(), serde_json::from_value(pack("CrimeClient")).unwrap());
        let public: Profile = serde_json::from_value(json!({
            "id": "11111111-1111-1111-1111-111111111111", "name": "CrimeClient 26.3", "path": "crimeclient",
            "game_version": "26.3", "loader": "fabric", "selected_norisk_pack_id": "crimeclient",
        }))
        .unwrap();
        (packs, NoriskVersionsConfig { profiles: vec![public] })
    }

    #[test]
    fn merges_pack_and_profile_while_an_account_has_access() {
        let (a, b) = (Uuid::new_v4(), Uuid::new_v4());
        let mut cache = InsiderCache::default();
        cache.denied(b, 5);
        cache.granted(a, answer(PROFILE), 10);
        assert!(cache.access(a) && !cache.access(b));

        let (mut packs, mut versions) = public_lists();
        for _ in 0..2 {
            merge_packs(&mut packs, &cache);
            merge_versions(&mut versions, &cache);
        }
        assert!(packs.packs.contains_key("crimeclient") && packs.packs.contains_key("crimeclient-insider"));
        let insider: Vec<_> = versions.profiles.iter().filter(|p| p.id.to_string() == PROFILE).collect();
        assert_eq!(insider.len(), 1, "merging twice keeps one Insider profile");
        assert_eq!(insider[0].selected_norisk_pack_id.as_deref(), Some("crimeclient-insider"));
        assert_eq!(versions.profiles.len(), 2);

        let status = status(&cache, Some(b), false, false);
        assert!(!status.access);
        assert_eq!(status.pack_id.as_deref(), Some("crimeclient-insider"));
        assert_eq!(status.profile_id.map(|id| id.to_string()).as_deref(), Some(PROFILE));
    }

    #[test]
    fn keeps_the_pack_but_drops_the_profile_when_nobody_has_access_any_more() {
        let a = Uuid::new_v4();
        let mut cache = InsiderCache::default();
        cache.granted(a, answer(PROFILE), 10);
        let (mut packs, mut versions) = public_lists();
        merge_versions(&mut versions, &cache);
        assert_eq!(versions.profiles.len(), 2);

        let listed_before = cache.listed().1;
        cache.denied(a, 20);
        assert_ne!(listed_before, cache.listed().1, "losing access changes the lists");
        merge_packs(&mut packs, &cache);
        merge_versions(&mut versions, &cache);
        assert!(packs.packs.contains_key("crimeclient-insider"), "resolve_and_migrate_pack_id must still find it");
        assert_eq!(versions.profiles.len(), 1);
        assert!(!cache.access(a));
    }

    #[test]
    fn empty_cache_leaves_the_public_lists_alone() {
        let cache = InsiderCache::default();
        let (mut packs, mut versions) = public_lists();
        merge_packs(&mut packs, &cache);
        merge_versions(&mut versions, &cache);
        assert_eq!(packs.packs.len(), 1);
        assert_eq!(versions.profiles.len(), 1);
        assert_eq!(status(&cache, Some(Uuid::new_v4()), false, false).pack_id, None);
    }

    #[test]
    fn public_lists_name_insiders_and_devs() {
        let (insider, dev, vip, other) = (Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4());
        let insiders = json!({ "insiders": [insider.to_string().to_uppercase()] });
        let ranks = json!({ "ranks": { dev.to_string(): "dev", vip.to_string(): "vip" } });
        assert!(listed_in(&insiders, &ranks, insider));
        assert!(listed_in(&insiders, &ranks, dev));
        assert!(!listed_in(&insiders, &ranks, vip));
        assert!(!listed_in(&insiders, &ranks, other));
        assert!(!listed_in(&json!({}), &json!(null), insider));
    }

    #[test]
    fn the_public_list_shows_the_profile_only_when_the_pack_is_known() {
        let (a, b) = (Uuid::new_v4(), Uuid::new_v4());
        let mut cache = InsiderCache::default();
        assert!(!cache.listed_publicly(a), "without a known pack there is nothing to show");
        assert!(!cache.access(a));

        cache.granted(b, answer(PROFILE), 10);
        cache.denied(a, 5);
        assert!(cache.listed_publicly(a));
        assert!(cache.access(a));
        assert!(!cache.listed_publicly(a), "already had access");
        let (mut packs, mut versions) = public_lists();
        merge_packs(&mut packs, &cache);
        merge_versions(&mut versions, &cache);
        assert_eq!(versions.profiles.len(), 2);

        cache.denied(a, 20);
        assert!(!cache.access(a), "the next real answer of the API wins");
    }

    #[test]
    fn the_newest_answer_wins() {
        let (a, b) = (Uuid::new_v4(), Uuid::new_v4());
        let mut cache = InsiderCache::default();
        let mut old = answer(PROFILE);
        old.pack = pack("old");
        cache.granted(a, old, 10);
        cache.granted(b, answer(PROFILE), 20);
        assert_eq!(cache.newest().unwrap().pack["displayName"], "CrimeClient Insider");
    }

    #[test]
    fn parses_the_api_answer_and_rejects_broken_ones() {
        let good = answer(PROFILE);
        let body = json!({ "pack_id": good.pack_id, "pack": good.pack, "profile": good.profile });
        assert_eq!(parse_answer(body).unwrap(), good);

        let mut no_id = good.profile.clone();
        no_id.as_object_mut().unwrap().remove("id");
        assert!(parse_answer(json!({ "pack_id": "x", "pack": good.pack, "profile": no_id })).is_err());
        assert!(parse_answer(json!({ "pack": good.pack, "profile": good.profile })).is_err());
        assert!(parse_answer(json!({ "pack_id": "x", "pack": { "mods": 3 }, "profile": good.profile })).is_err());
    }

    #[tokio::test]
    async fn cache_file_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(CACHE_FILE);
        assert_eq!(read_cache(&path).await, InsiderCache::default());
        let mut cache = InsiderCache::default();
        cache.granted(Uuid::new_v4(), answer(PROFILE), 10);
        write_cache(&path, &cache).await;
        assert_eq!(read_cache(&path).await, cache);
        tokio::fs::write(&path, "not json").await.unwrap();
        assert_eq!(read_cache(&path).await, InsiderCache::default());
    }

    #[test]
    fn insider_urls() {
        assert!(is_insider_url(&format!("{API}/insider/release/crimeclient-insider-1.0.0.jar")));
        assert!(!is_insider_url(&format!("{API}/release/crimeclient-2.5.1.jar")));
        assert!(!is_insider_url("https://cdn.modrinth.com/data/AANobbMI/versions/x/sodium.jar"));
    }
}
