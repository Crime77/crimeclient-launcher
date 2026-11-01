//! Starts Horizon (Launch API 0.1.0, docs/api/launch.md in Horizon): the prepared resources, the profile's folder
//! for saves, options and logs, and this launcher's Microsoft account as session JSON on standard input, so the
//! game never shows a login of its own and joins online-mode servers.

use super::{install, prepare, progress};
use crate::error::Result;
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::minecraft::dto::piston_meta::PistonMeta;
use crate::state::event_state::EventType;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;
use log::{info, warn};
use std::path::Path;

/// Horizon's own settings beside options.txt (horizon-client-render/src/extras.rs).
const EXTRAS: &str = "horizon-extras.txt";

#[allow(clippy::too_many_arguments)]
pub async fn launch(
    state: &State,
    profile: &Profile,
    piston_meta: &PistonMeta,
    version_url: &str,
    java_path: &Path,
    game_directory: &Path,
    credentials: Option<&Credentials>,
    quick_play_singleplayer: Option<String>,
    quick_play_multiplayer: Option<String>,
) -> Result<()> {
    let release = install::ensure_installed(state, profile.id).await?;
    let resources =
        prepare::ensure_prepared(state, profile.id, &release, piston_meta, version_url, java_path).await?;
    progress(state, EventType::LaunchingMinecraft, profile.id, "Starting CrimeClient Rust...", 0.95).await?;

    // The launcher shows the Discord activity (as for Java with -Dcrimeclient.launcher.discord); Horizon's own
    // "Playing Horizon" would replace it.
    if state.discord_manager.hands_off_to_launcher().await {
        if let Err(e) = set_extra(game_directory, "discordPresence", "false").await {
            warn!("[Horizon] Could not switch off Horizon's Discord activity: {}", e);
        }
    }

    let program = release.join(if cfg!(windows) { "horizon-client.exe" } else { "horizon-client" });
    let mut command = std::process::Command::new(&program);
    command
        .arg("--resources")
        .arg(&resources)
        .arg("--game-dir")
        .arg(game_directory)
        .arg("--home")
        .arg(game_directory)
        .current_dir(game_directory)
        // Horizon's anonymous "I'm playing" count is for its own launcher; ours sends nothing to Horizon.
        .env("HORIZON_TELEMETRY_URL", "off");
    if let Some(world) = &quick_play_singleplayer {
        command.arg("--quickPlaySingleplayer").arg(world);
    } else if let Some(server) = &quick_play_multiplayer {
        command.arg("--quickPlayMultiplayer").arg(server);
    }
    let session = credentials.map(|c| {
        serde_json::json!({
            "name": c.username,
            "uuid": c.id.simple().to_string(),
            "access_token": c.access_token,
            "user_type": "msa",
        })
        .to_string()
        .into_bytes()
    });
    if session.is_some() {
        command.arg("--session-stdin");
    } else {
        info!("[Horizon] No account: starting offline");
    }
    info!("[Horizon] Executing {} --resources {} --game-dir {}", program.display(), resources.display(), game_directory.display());

    state
        .process_manager
        .start_process(
            profile.id,
            command,
            credentials.map(|c| c.id.to_string()),
            credentials.map(|c| c.username.clone()),
            Some(piston_meta.id.clone()),
            Some("horizon".to_string()),
            None,
            None,
            Some(profile.name.clone()),
            None,
            state.config_manager.get_config().await.hooks.post_exit.clone(),
            0,
            Vec::new(),
            None,
            session,
        )
        .await?;
    Ok(())
}

/// Sets `key:value` in horizon-extras.txt, keeping every other line.
async fn set_extra(game_directory: &Path, key: &str, value: &str) -> std::io::Result<()> {
    let path = game_directory.join(EXTRAS);
    let text = tokio::fs::read_to_string(&path).await.unwrap_or_default();
    let mut lines: Vec<String> = text
        .lines()
        .filter(|l| l.split_once(':').map(|(k, _)| k.trim()) != Some(key))
        .map(str::to_owned)
        .collect();
    lines.push(format!("{}:{}", key, value));
    tokio::fs::write(&path, lines.join("\n") + "\n").await
}
