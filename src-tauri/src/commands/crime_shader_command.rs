//! Photon settings for CrimeClient Rust profiles (the profile's "Shader" page). The game writes what the page shows,
//! Photon's options, screens, profiles and texts, beside the pack as `shaderpacks/photon_v1.4.zip.options.json`
//! (crimeclient-rust/mods/crime/shaders.rs) when it first runs, so the launcher reads no GLSL. The page writes the
//! player's values to `photon_v1.4.zip.txt` (`NAME=value` lines without the defaults, as Iris and Horizon keep them)
//! and the pick to `horizon-graphics.txt`, never while the profile's game runs: the game reads both when it starts and
//! writes its own values over them.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use log::info;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::CommandError;
use crate::state::process_state::ProcessState;
use crate::state::state_manager::State;

/// The pack in the CrimeClient Rust release.
const PACK: &str = "photon_v1.4.zip";
/// Horizon's graphics settings beside options.txt (horizon-client-render/src/graphics.rs).
const GRAPHICS: &str = "horizon-graphics.txt";

#[derive(Serialize)]
pub struct ShaderPage {
    /// What the game wrote of the pack; `None` until the profile has run once.
    model: Option<serde_json::Value>,
    /// The values that differ from the defaults.
    chosen: BTreeMap<String, String>,
    /// Photon is the picked pack.
    on: bool,
    /// The profile's game runs, so nothing can be changed.
    running: bool,
    /// A Java profile has Photon values (Iris's file) to take over.
    java: bool,
}

/// The part of the game's model the launcher checks values against.
#[derive(Deserialize)]
struct Model {
    options: BTreeMap<String, ModelOption>,
}

#[derive(Deserialize)]
struct ModelOption {
    default: String,
    values: Vec<String>,
}

fn shader_error(message: impl Into<String>) -> CommandError {
    CommandError { message: message.into(), kind: "ShaderError".to_string(), ..Default::default() }
}

fn chosen_file() -> String {
    format!("{PACK}.txt")
}

fn model_file() -> String {
    format!("{PACK}.options.json")
}

/// `NAME=value` lines; blank lines and `#` comments are skipped.
fn parse_chosen(text: &str) -> BTreeMap<String, String> {
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .filter_map(|l| l.split_once('='))
        .map(|(k, v)| (k.trim().to_owned(), v.trim().to_owned()))
        .collect()
}

/// `chosen` without what the pack doesn't offer and without its defaults.
fn valid(model: &Model, chosen: BTreeMap<String, String>) -> BTreeMap<String, String> {
    chosen
        .into_iter()
        .filter(|(name, value)| model.options.get(name).is_some_and(|o| o.values.contains(value) && o.default != *value))
        .collect()
}

/// The value of `key` in horizon-graphics.txt (`key:value` lines).
fn graphics_value<'a>(text: &'a str, key: &str) -> Option<&'a str> {
    text.lines().filter_map(|l| l.split_once(':')).find(|(k, _)| k.trim() == key).map(|(_, v)| v.trim())
}

/// `text` with every `key:value` of `values` set, all other lines kept.
fn set_graphics(text: &str, values: &[(&str, &str)]) -> String {
    let mut lines: Vec<String> = text
        .lines()
        .filter(|l| !values.iter().any(|(key, _)| l.split_once(':').is_some_and(|(k, _)| k.trim() == *key)))
        .map(str::to_owned)
        .collect();
    lines.extend(values.iter().map(|(k, v)| format!("{k}:{v}")));
    lines.join("\n") + "\n"
}

/// The game folder of Rust profile `id`.
async fn game_dir(state: &State, id: Uuid) -> Result<PathBuf, CommandError> {
    let profile = state.profile_manager.get_profile(id).await?;
    if !profile.is_horizon() {
        return Err(shader_error("not a CrimeClient Rust profile"));
    }
    Ok(state.profile_manager.calculate_instance_path_for_profile(&profile)?)
}

async fn running(state: &State, id: Uuid) -> bool {
    state.process_manager.get_process_metadata_by_profile(id).await.iter().any(|p| {
        matches!(p.state, ProcessState::Starting | ProcessState::Running | ProcessState::Stopping)
    })
}

/// The game folder of Rust profile `id`, if its game doesn't run.
async fn writable(state: &State, id: Uuid) -> Result<PathBuf, CommandError> {
    let dir = game_dir(state, id).await?;
    if running(state, id).await {
        return Err(shader_error("the game is running"));
    }
    Ok(dir)
}

/// The Photon values of the Java profile that changed them last (Iris keeps them as `shaderpacks/<pack>.txt`).
async fn newest_java_values(state: &State) -> Option<(PathBuf, BTreeMap<String, String>)> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for profile in super::crime_wardrobe_command::all_profiles(state).await.iter().filter(|p| !p.is_horizon()) {
        let Ok(dir) = state.profile_manager.calculate_instance_path_for_profile(profile) else { continue };
        let Ok(mut entries) = tokio::fs::read_dir(dir.join("shaderpacks")).await else { continue };
        while let Ok(Some(entry)) = entries.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if !name.starts_with("photon") || !name.ends_with(".txt") {
                continue;
            }
            let Ok(modified) = entry.metadata().await.and_then(|m| m.modified()) else { continue };
            if best.as_ref().is_none_or(|(t, _)| modified > *t) {
                best = Some((modified, entry.path()));
            }
        }
    }
    let (_, file) = best?;
    let values = parse_chosen(&tokio::fs::read_to_string(&file).await.ok()?);
    Some((file, values))
}

async fn page(state: &State, id: Uuid) -> Result<ShaderPage, CommandError> {
    let dir = game_dir(state, id).await?;
    let packs = dir.join("shaderpacks");
    let model = tokio::fs::read(packs.join(model_file())).await.ok().and_then(|b| serde_json::from_slice(&b).ok());
    let chosen =
        tokio::fs::read_to_string(packs.join(chosen_file())).await.map(|t| parse_chosen(&t)).unwrap_or_default();
    let graphics = tokio::fs::read_to_string(dir.join(GRAPHICS)).await.unwrap_or_default();
    Ok(ShaderPage {
        model,
        chosen,
        on: graphics_value(&graphics, "pickedShaderPack") == Some(PACK),
        running: running(state, id).await,
        java: newest_java_values(state).await.is_some(),
    })
}

/// Writes the valid ones of `chosen` as the pack's values; none removes the file.
async fn write_chosen(dir: &Path, chosen: BTreeMap<String, String>) -> Result<(), CommandError> {
    let packs = dir.join("shaderpacks");
    let bytes = tokio::fs::read(packs.join(model_file()))
        .await
        .map_err(|_| shader_error("start the profile once, then Photon's options show here"))?;
    let model: Model = serde_json::from_slice(&bytes).map_err(|e| shader_error(e.to_string()))?;
    let chosen = valid(&model, chosen);
    let file = packs.join(chosen_file());
    let written = if chosen.is_empty() {
        match tokio::fs::remove_file(&file).await {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e),
            _ => Ok(()),
        }
    } else {
        let text: String = chosen.iter().map(|(k, v)| format!("{k}={v}\n")).collect();
        tokio::fs::write(&file, text).await
    };
    written.map_err(|e| shader_error(e.to_string()))
}

#[tauri::command]
pub async fn crime_shader_get(profile_id: Uuid) -> Result<ShaderPage, CommandError> {
    let state = State::get().await?;
    page(&state, profile_id).await
}

/// Sets the pack's values (name to value); the defaults and what the pack doesn't offer are left out.
#[tauri::command]
pub async fn crime_shader_set(profile_id: Uuid, chosen: BTreeMap<String, String>) -> Result<ShaderPage, CommandError> {
    let state = State::get().await?;
    write_chosen(&writable(&state, profile_id).await?, chosen).await?;
    page(&state, profile_id).await
}

/// Picks Photon or no pack. On also sets what the game's page sets (crime/shaders.rs): Photon smooths and upscales
/// itself, so a smaller world picture or Horizon's FXAA on top only blur it.
#[tauri::command]
pub async fn crime_shader_toggle(profile_id: Uuid, on: bool) -> Result<ShaderPage, CommandError> {
    let state = State::get().await?;
    let dir = writable(&state, profile_id).await?;
    let mut values = vec![("pickedShaderPack", if on { PACK } else { "" })];
    if on {
        values.extend([("resolutionScale", "100"), ("fxaa", "false"), ("upscaling", "native")]);
    }
    let file = dir.join(GRAPHICS);
    let text = tokio::fs::read_to_string(&file).await.unwrap_or_default();
    tokio::fs::write(&file, set_graphics(&text, &values)).await.map_err(|e| shader_error(e.to_string()))?;
    page(&state, profile_id).await
}

/// Takes over the Photon values of the Java profile that changed them last.
#[tauri::command]
pub async fn crime_shader_import_java(profile_id: Uuid) -> Result<ShaderPage, CommandError> {
    let state = State::get().await?;
    let dir = writable(&state, profile_id).await?;
    let (file, values) = newest_java_values(&state).await.ok_or_else(|| shader_error("no Photon values in a Java profile"))?;
    info!("[Shader] Taking over the Photon values in {}", file.display());
    write_chosen(&dir, values).await?;
    page(&state, profile_id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_only_values_the_pack_offers_and_not_its_defaults() {
        let model: Model = serde_json::from_str(
            r#"{"options":{"SHADOW":{"default":"true","values":["false","true"]},
                "LEVEL":{"default":"2","values":["1","2","3"]}}}"#,
        )
        .unwrap();
        let chosen = parse_chosen("# Iris\nSHADOW=false\nLEVEL = 2\nGONE=true\nBAD\n\nLEVEL_X=9\n");
        let kept = valid(&model, chosen);
        assert_eq!(kept, BTreeMap::from([("SHADOW".to_owned(), "false".to_owned())]));
    }

    #[test]
    fn sets_graphics_lines_and_keeps_the_others() {
        let text = "preset:custom\nfxaa:true\npickedShaderPack:\nresolutionScale:75\n";
        let out = set_graphics(text, &[("pickedShaderPack", PACK), ("fxaa", "false")]);
        assert_eq!(graphics_value(&out, "pickedShaderPack"), Some(PACK));
        assert_eq!(graphics_value(&out, "fxaa"), Some("false"));
        assert_eq!(graphics_value(&out, "resolutionScale"), Some("75"));
        assert_eq!(out.matches("fxaa").count(), 1);
        assert!(out.starts_with("preset:custom\n"));
        assert_eq!(set_graphics("", &[("fxaa", "false")]), "fxaa:false\n");
    }
}
