//! CrimeClient wardrobe for CrimeClient Rust profiles. Horizon has no screens for mods, so the cosmetics are chosen
//! here and written as the Java client writes them (`config/craftcosmetics.json`, `crimeclient-cape.txt`,
//! `crimeclient-skin.txt`) into the game folder of every Rust profile; the client rereads them within a second
//! (crimeclient-rust/mods/crime/selection.rs) and sends them to the server.
//!
//! The launcher keeps its own copy in `crimeclient-wardrobe/`. The first time, it starts from the newest
//! selection of a Java CrimeClient profile, so the Rust client wears what the player already wears there.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use log::{info, warn};
use serde::Serialize;

use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::CommandError;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;

const SELECTION: &str = "craftcosmetics.json";
const FILES: [&str; 3] = [SELECTION, "crimeclient-cape.txt", "crimeclient-skin.txt"];
const SLOTS: [&str; 9] = ["wings", "head", "back", "cape", "pet", "aura", "totem", "shield", "mace"];
/// The cape slot's id for an uploaded cape (`CustomCapes`), whose hash is in crimeclient-cape.txt.
const CUSTOM_CAPE: &str = "custom_cape";

#[derive(Serialize)]
pub struct Wardrobe {
    /// slot -> cosmetic id
    worn: BTreeMap<String, String>,
    /// an uploaded cape is worn (from the Java client's wardrobe)
    custom_cape: bool,
    /// an uploaded skin is worn (from the Java client's wardrobe)
    custom_skin: bool,
}

fn wardrobe_error(message: impl Into<String>) -> CommandError {
    CommandError { message: message.into(), kind: "WardrobeError".to_string(), ..Default::default() }
}

fn own_dir() -> PathBuf {
    LAUNCHER_DIRECTORY.root_dir().join("crimeclient-wardrobe")
}

/// `klein_mit_unterstrich`, as cosmetic ids are.
fn id_like(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

async fn read_worn(dir: &Path) -> BTreeMap<String, String> {
    let text = tokio::fs::read_to_string(dir.join(SELECTION)).await.unwrap_or_default();
    let raw: BTreeMap<String, serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    raw.into_iter()
        .filter(|(slot, _)| SLOTS.contains(&slot.as_str()))
        .filter_map(|(slot, id)| Some((slot, id.as_str().filter(|id| id_like(id))?.to_owned())))
        .collect()
}

async fn wardrobe(dir: &Path) -> Wardrobe {
    let worn = read_worn(dir).await;
    let has = |name: &'static str| async move {
        tokio::fs::read_to_string(dir.join(name)).await.is_ok_and(|s| !s.trim().is_empty())
    };
    Wardrobe {
        custom_cape: worn.get("cape").map(String::as_str) == Some(CUSTOM_CAPE) && has(FILES[1]).await,
        custom_skin: has(FILES[2]).await,
        worn,
    }
}

pub(crate) async fn all_profiles(state: &State) -> Vec<Profile> {
    let mut profiles = state.profile_manager.list_profiles().await.unwrap_or_default();
    profiles.extend(state.norisk_version_manager.get_config().await.profiles);
    profiles
}

/// The config folder of the Java profile whose selection changed last, if any has one.
async fn newest_java_config(state: &State) -> Option<PathBuf> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for profile in all_profiles(state).await.iter().filter(|p| !p.is_horizon()) {
        let Ok(dir) = state.profile_manager.calculate_instance_path_for_profile(profile) else { continue };
        let config = dir.join("config");
        let Ok(modified) = tokio::fs::metadata(config.join(SELECTION)).await.and_then(|m| m.modified()) else {
            continue;
        };
        if best.as_ref().is_none_or(|(t, _)| modified > *t) {
            best = Some((modified, config));
        }
    }
    best.map(|(_, dir)| dir)
}

/// Makes `to` hold the same three files as `from` (missing ones are removed).
async fn copy_files(from: &Path, to: &Path) -> std::io::Result<()> {
    tokio::fs::create_dir_all(to).await?;
    for name in FILES {
        match tokio::fs::read(from.join(name)).await {
            Ok(data) => tokio::fs::write(to.join(name), data).await?,
            Err(_) => match tokio::fs::remove_file(to.join(name)).await {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e),
                _ => {}
            },
        }
    }
    Ok(())
}

/// The launcher's copy, started from a Java profile's selection the first time.
async fn ensure_own(state: &State) -> PathBuf {
    let own = own_dir();
    if tokio::fs::metadata(own.join(SELECTION)).await.is_err() {
        match newest_java_config(state).await {
            Some(java) => {
                info!("[Wardrobe] Starting from the selection in {}", java.display());
                if let Err(e) = copy_files(&java, &own).await {
                    warn!("[Wardrobe] Could not copy {}: {}", java.display(), e);
                }
            }
            None => {
                let _ = tokio::fs::create_dir_all(&own).await;
                let _ = tokio::fs::write(own.join(SELECTION), "{}").await;
            }
        }
    }
    own
}

/// Writes the wardrobe into a Rust profile's game folder; called before Horizon starts (horizon/launch.rs).
pub async fn apply_to(state: &State, game_directory: &Path) {
    let own = ensure_own(state).await;
    if let Err(e) = copy_files(&own, &game_directory.join("config")).await {
        warn!("[Wardrobe] Could not write the cosmetics into {}: {}", game_directory.display(), e);
    }
}

/// Every Rust profile that has been started (so its folder exists) gets the change at once; a running game shows it
/// within a second.
async fn apply_everywhere(state: &State) {
    for profile in all_profiles(state).await.iter().filter(|p| p.is_horizon()) {
        let Ok(dir) = state.profile_manager.calculate_instance_path_for_profile(profile) else { continue };
        if tokio::fs::metadata(&dir).await.is_ok() {
            apply_to(state, &dir).await;
        }
    }
}

#[tauri::command]
pub async fn crime_wardrobe_get() -> Result<Wardrobe, CommandError> {
    let state = State::get().await?;
    Ok(wardrobe(&ensure_own(&state).await).await)
}

/// Puts on `id` in `slot`, or takes the slot off with no id. Whether the player owns it is checked by the shop page,
/// as the Java client checks it only in its own wardrobe (`CosmeticsConfig.set`).
#[tauri::command]
pub async fn crime_wardrobe_wear(slot: String, id: Option<String>) -> Result<Wardrobe, CommandError> {
    if !SLOTS.contains(&slot.as_str()) || id.as_deref().is_some_and(|id| !id_like(id)) {
        return Err(wardrobe_error(format!("invalid cosmetic: {slot}={id:?}")));
    }
    let state = State::get().await?;
    let own = ensure_own(&state).await;
    let mut worn = read_worn(&own).await;
    match id {
        Some(id) => worn.insert(slot, id),
        None => worn.remove(&slot),
    };
    let text = serde_json::to_string_pretty(&worn).map_err(|e| wardrobe_error(e.to_string()))?;
    tokio::fs::write(own.join(SELECTION), text).await.map_err(|e| wardrobe_error(e.to_string()))?;
    apply_everywhere(&state).await;
    Ok(wardrobe(&own).await)
}

/// Takes over the newest selection of a Java CrimeClient profile, uploaded cape and skin included.
#[tauri::command]
pub async fn crime_wardrobe_import_java() -> Result<Wardrobe, CommandError> {
    let state = State::get().await?;
    let java = newest_java_config(&state).await.ok_or_else(|| wardrobe_error("no Java CrimeClient selection"))?;
    let own = own_dir();
    copy_files(&java, &own).await.map_err(|e| wardrobe_error(e.to_string()))?;
    apply_everywhere(&state).await;
    Ok(wardrobe(&own).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn copies_the_java_selection_and_keeps_only_valid_slots() {
        let root = tempfile::tempdir().unwrap();
        let (java, own) = (root.path().join("java"), root.path().join("own"));
        tokio::fs::create_dir_all(&java).await.unwrap();
        let selection = r#"{"wings":"bat_wings","cape":"custom_cape","head":"Not Valid","x.sk":"abc"}"#;
        tokio::fs::write(java.join(SELECTION), selection).await.unwrap();
        tokio::fs::write(java.join(FILES[1]), "ab".repeat(32)).await.unwrap();
        // an old skin in the copy goes, as the Java profile has none
        tokio::fs::create_dir_all(&own).await.unwrap();
        tokio::fs::write(own.join(FILES[2]), "old 0").await.unwrap();

        copy_files(&java, &own).await.unwrap();
        let w = wardrobe(&own).await;
        assert_eq!(w.worn.len(), 2);
        assert_eq!(w.worn["wings"], "bat_wings");
        assert!(w.custom_cape);
        assert!(!w.custom_skin);
        assert!(tokio::fs::metadata(own.join(FILES[2])).await.is_err());
    }
}
