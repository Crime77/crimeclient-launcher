//! "Konto-Einstellungen": a built-in sync pack that every profile uses without subscribing to it.
//!
//! It works like any sync pack (`config/` is linked, `options.txt` is merged, `servers.dat` is copied), but its
//! shared copy lives per Minecraft account (`sync_packs/<id>/accounts/<account uuid>/` instead of `master/`):
//! all profiles share mod configs, game settings, key binds and the server list, and every account has its own
//! set. Switching the account switches the set on the next launch; a new account starts with a copy of the
//! account used last. Before a launch its shared copy wins over what the profile folder holds (that folder may
//! still carry another account's files), after the game the profile's files are written back to the account it
//! was launched with.
//!
//! The pack shows up on the Sync Packs page, where it can be switched off; if it is deleted there it is not
//! created again (a marker in `account_pack.json`).

use crate::error::Result;
use crate::state::state_manager::State;
use crate::sync::model::{default_local_keys, AdoptStrategy, MergeFormat, SyncTarget, SyncTargetKind};
use crate::sync::paths;
use crate::utils::path_utils;
use crate::utils::file_utils::write_atomic;
use log::{info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use once_cell::sync::Lazy;
use uuid::Uuid;

/// Fixed id, so every launcher finds the same pack.
pub const ACCOUNT_PACK_ID: Uuid = Uuid::from_u128(0x6c1f_3e2a_7b4d_4c8e_9a51_3d2e_8f0b_7c11);
const NAME: &str = "Konto-Einstellungen";
const DESCRIPTION: &str =
    "Configs, Spieleinstellungen und Serverliste gelten für alle Profile und werden pro Microsoft-Konto gespeichert.";
/// Folder name for launches without an account.
const OFFLINE: &str = "offline";
const STATE_FILE: &str = "account_pack.json";

/// What this pack shares: the mod configs (CrimeClient's too), Minecraft's settings and the server list.
const TARGETS: [&str; 3] = ["config", "options.txt", "servers.dat"];

static STATE_LOCK: Lazy<Arc<Mutex<()>>> = Lazy::new(|| Arc::new(Mutex::new(())));

#[derive(Serialize, Deserialize, Default)]
struct PackState {
    /// Set once the pack was created; a missing pack after that was deleted by the user.
    #[serde(default)]
    created: bool,
    /// Profile id to the account of its last launch, so the write back after the game reaches that account.
    #[serde(default)]
    launches: HashMap<Uuid, String>,
}

pub fn is_account_pack(pack_id: Uuid) -> bool {
    pack_id == ACCOUNT_PACK_ID
}

/// The folder name for an account: its Minecraft UUID, or "offline" without one.
pub fn account_key(account: Option<Uuid>) -> String {
    account.map(|id| id.simple().to_string()).unwrap_or_else(|| OFFLINE.to_string())
}

fn accounts_dir() -> PathBuf {
    paths::pack_dir(ACCOUNT_PACK_ID).join("accounts")
}

/// The shared copy of one account, in place of the pack's `master/` folder.
pub fn account_dir(key: &str) -> PathBuf {
    accounts_dir().join(key)
}

fn state_path() -> PathBuf {
    paths::sync_packs_root().join(STATE_FILE)
}

async fn load_state() -> PackState {
    match tokio::fs::read_to_string(state_path()).await {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => PackState::default(),
    }
}

async fn save_state(state: &PackState) -> Result<()> {
    let path = state_path();
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    write_atomic(&path, serde_json::to_string_pretty(state)?).await?;
    Ok(())
}

fn targets() -> Vec<SyncTarget> {
    TARGETS
        .iter()
        .map(|path| SyncTarget {
            id: Uuid::new_v4(),
            path: (*path).to_string(),
            enabled: true,
            kind: match *path {
                "config" => SyncTargetKind::DirLink { adopt: AdoptStrategy::BackupLocal },
                "options.txt" => SyncTargetKind::FileMerge {
                    format: MergeFormat::MinecraftOptions,
                    local_keys: default_local_keys(),
                },
                _ => SyncTargetKind::FileCopy,
            },
            external_path: None,
        })
        .collect()
}

/// Creates the pack on first use (not again after the user deleted it); true while it exists.
pub async fn ensure(state: &State) -> Result<bool> {
    let _guard = STATE_LOCK.lock().await;
    let mut saved = load_state().await;
    if state.sync_pack_manager.get_pack(ACCOUNT_PACK_ID).await?.is_some() {
        if !saved.created {
            saved.created = true;
            save_state(&saved).await?;
        }
        return Ok(true);
    }
    if saved.created {
        return Ok(false);
    }
    state
        .sync_pack_manager
        .create_pack_with_id(ACCOUNT_PACK_ID, NAME.to_string(), Some(DESCRIPTION.to_string()), None)
        .await?;
    for target in targets() {
        state.sync_pack_manager.upsert_target(ACCOUNT_PACK_ID, target).await?;
    }
    saved.created = true;
    save_state(&saved).await?;
    info!("Created the built-in sync pack '{}' ({})", NAME, ACCOUNT_PACK_ID);
    Ok(true)
}

/// Remembers the account a profile is launched with (also for the write back after a launcher restart).
pub async fn remember_launch(profile_id: Uuid, key: &str) {
    let _guard = STATE_LOCK.lock().await;
    let mut saved = load_state().await;
    if saved.launches.get(&profile_id).map(String::as_str) == Some(key) {
        return;
    }
    saved.launches.insert(profile_id, key.to_string());
    if let Err(e) = save_state(&saved).await {
        warn!("Could not store the account of the launch of profile {}: {}", profile_id, e);
    }
}

/// The account of the profile's last launch, if it had one.
pub async fn launch_account(profile_id: Uuid) -> Option<String> {
    load_state().await.launches.get(&profile_id).cloned()
}

async fn newest_other_account(key: &str) -> Option<PathBuf> {
    let mut entries = tokio::fs::read_dir(accounts_dir()).await.ok()?;
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if entry.file_name().to_string_lossy() == key || !path.is_dir() {
            continue;
        }
        let modified = newest_mtime(&path).await;
        if best.as_ref().map_or(true, |(t, _)| modified > *t) {
            best = Some((modified, path));
        }
    }
    best.map(|(_, path)| path)
}

/// Latest change among the shared files of an account folder (the folder's own time misses edits inside).
async fn newest_mtime(dir: &Path) -> std::time::SystemTime {
    let mut newest = std::time::SystemTime::UNIX_EPOCH;
    for name in TARGETS {
        if let Ok(meta) = tokio::fs::metadata(dir.join(name)).await {
            if let Ok(t) = meta.modified() {
                newest = newest.max(t);
            }
        }
    }
    newest
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_keys() {
        let id = Uuid::parse_str("0f3c6a1e-2b4d-4e8f-9a10-1b2c3d4e5f60").unwrap();
        assert_eq!(account_key(Some(id)), "0f3c6a1e2b4d4e8f9a101b2c3d4e5f60");
        assert_eq!(account_key(None), "offline");
        assert!(is_account_pack(ACCOUNT_PACK_ID));
        assert!(!is_account_pack(Uuid::new_v4()));
    }

    #[test]
    fn shared_targets() {
        let kinds: Vec<(String, &str)> = targets().into_iter().map(|t| (t.path, t.kind.discriminant())).collect();
        assert_eq!(
            kinds,
            vec![
                ("config".to_string(), "dir_link"),
                ("options.txt".to_string(), "file_merge"),
                ("servers.dat".to_string(), "file_copy"),
            ]
        );
        for target in targets() {
            assert!(paths::validate_target_path(&target.path, &target.kind).is_ok(), "{}", target.path);
        }
    }
}

/// A new account starts with a copy of the account used last; with none yet, the first profile's files are
/// adopted as usual.
pub async fn seed(state: &State, key: &str) -> Result<()> {
    let dir = account_dir(key);
    if tokio::fs::metadata(&dir).await.is_ok() {
        return Ok(());
    }
    if let Some(source) = newest_other_account(key).await {
        info!(
            "Account settings: starting '{}' with a copy of '{}'",
            key,
            source.file_name().unwrap_or_default().to_string_lossy()
        );
        path_utils::copy_dir_recursively(&source, &dir, Arc::clone(&state.io_semaphore)).await?;
    } else {
        tokio::fs::create_dir_all(&dir).await?;
    }
    Ok(())
}
