use crate::config::{ProjectDirsExt, CRIMECLIENT_DOWNLOAD_URL, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use log::{debug, error, info, trace, warn};
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

/// Discord application "CrimeClient" (the same one the mod uses when it runs without the launcher).
const DISCORD_APP_ID: &str = "1565767495040765972";
const RECONNECT_BACKOFF: Duration = Duration::from_secs(60);
/// How often the game's hand-off file is checked.
const CLIENT_POLL: Duration = Duration::from_secs(5);
/// While a game runs, the activity is sent again at least this often.
const IN_GAME_REFRESH: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, PartialEq)]
pub enum DiscordState {
    Idle,
    Custom(String),
    InGame {
        profile_name: String,
        mc_version: String,
    },
}

#[derive(Clone)]
pub struct DiscordManager {
    client: Arc<Mutex<Option<DiscordIpcClient>>>,
    current_state: Arc<RwLock<DiscordState>>,
    enabled: Arc<RwLock<bool>>,
    idle_start_timestamp: Arc<RwLock<Option<i64>>>,
    /// When the running game started (seconds); the in-game time counts from here instead of restarting on every refresh
    game_start_timestamp: Arc<RwLock<Option<i64>>>,
    /// (details, state) from the game's hand-off file at the last check
    last_client_state: Arc<RwLock<Option<(String, String)>>>,
    last_connect_failure: Arc<RwLock<Option<Instant>>>,
}

impl DiscordManager {
    pub async fn new(enabled: bool) -> Result<Self> {
        info!(
            "Initializing Discord Rich Presence Manager (enabled: {})",
            enabled
        );

        let initial_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .ok();

        let manager = Self {
            client: Arc::new(Mutex::new(None)),
            current_state: Arc::new(RwLock::new(DiscordState::Idle)),
            enabled: Arc::new(RwLock::new(enabled)),
            idle_start_timestamp: Arc::new(RwLock::new(initial_timestamp)),
            game_start_timestamp: Arc::new(RwLock::new(None)),
            last_client_state: Arc::new(RwLock::new(None)),
            last_connect_failure: Arc::new(RwLock::new(None)),
        };

        if enabled {
            debug!("Discord Rich Presence initially enabled, connecting...");
            if let Err(e) = manager.connect().await {
                debug!("Discord not connected during initialization: {}", e);
            }
            debug!("Setting initial Discord state to Idle");
            if let Err(e) = manager.set_state_internal(DiscordState::Idle, true).await {
                error!("Failed to set initial Discord state: {}", e);
            }
        } else {
            info!("Discord Rich Presence is disabled");
        }

        // Watches the game's hand-off file: changed texts show at once, and while a game runs the activity is sent
        // again at least every 15 s, so a closed or frozen game (file older than 30 s) falls back to the launcher's texts
        let poller_clone = manager.clone();
        tokio::spawn(async move {
            let mut last_refresh = Instant::now();
            loop {
                tokio::time::sleep(CLIENT_POLL).await;
                if !*poller_clone.enabled.read().await {
                    continue;
                }
                let new_client_state = Self::read_active_client_state().map(|j| Self::client_texts(&j));
                let current = poller_clone.current_state.read().await.clone();
                let in_game = new_client_state.is_some() || matches!(current, DiscordState::InGame { .. });
                let mut last = poller_clone.last_client_state.write().await;
                let changed = *last != new_client_state;
                if changed || (in_game && last_refresh.elapsed() >= IN_GAME_REFRESH) {
                    if changed {
                        debug!("Client state file changed: {:?} -> {:?}", *last, new_client_state);
                    }
                    *last = new_client_state;
                    drop(last);
                    poller_clone.set_state_internal(current, true).await.ok();
                    last_refresh = Instant::now();
                }
            }
        });

        info!("Successfully initialized Discord Rich Presence Manager");

        Ok(manager)
    }

    async fn in_reconnect_backoff(&self) -> bool {
        self.last_connect_failure
            .read()
            .await
            .map(|failed_at| failed_at.elapsed() < RECONNECT_BACKOFF)
            .unwrap_or(false)
    }

    async fn record_connect_failure(&self, error: &AppError) {
        let mut last_failure = self.last_connect_failure.write().await;
        if last_failure.is_none() {
            warn!(
                "Discord not reachable ({}); retrying at most every {}s",
                error,
                RECONNECT_BACKOFF.as_secs()
            );
        } else {
            debug!("Discord still not reachable: {}", error);
        }
        *last_failure = Some(Instant::now());
    }

    async fn connect(&self) -> Result<()> {
        if DISCORD_APP_ID.is_empty() || !*self.enabled.read().await {
            debug!("Discord Rich Presence is disabled, skipping connection");
            return Ok(());
        }

        trace!("Attempting to connect to Discord...");
        let mut client_lock = self.client.lock().await;

        if client_lock.is_none() {
            trace!("No existing Discord client, creating new one...");
            match DiscordIpcClient::new(DISCORD_APP_ID)
                .map_err(|e| AppError::DiscordError(format!("Discord error: {}", e)))
            {
                Ok(mut client) => {
                    trace!("Discord client created, connecting...");
                    match client.connect().map_err(|e| {
                        AppError::DiscordError(format!("Discord connection error: {}", e))
                    }) {
                        Ok(_) => {
                            info!("Successfully connected to Discord client");
                            *client_lock = Some(client);
                            *self.last_connect_failure.write().await = None;
                        }
                        Err(e) => {
                            self.record_connect_failure(&e).await;
                            return Err(e);
                        }
                    }
                }
                Err(e) => {
                    self.record_connect_failure(&e).await;
                    return Err(e);
                }
            }
        } else {
            trace!("Discord client already exists");
        }

        Ok(())
    }

    async fn disconnect(&self) -> Result<()> {
        debug!("Attempting to disconnect from Discord...");
        let mut client_lock = self.client.lock().await;

        if let Some(mut client) = client_lock.take() {
            debug!("Found active Discord client, closing connection...");
            match client
                .close()
                .map_err(|e| AppError::DiscordError(format!("Discord disconnect error: {}", e)))
            {
                Ok(_) => {
                    info!("Successfully disconnected from Discord client");
                }
                Err(e) => {
                    warn!("Error disconnecting from Discord client: {}", e);
                    return Err(e);
                }
            }
        } else {
            debug!("No active Discord client to disconnect");
        }

        Ok(())
    }

    pub async fn set_state(&self, state: DiscordState, force: bool) -> Result<()> {
        trace!("Setting Discord state to: {:?}", state);
        match self.set_state_internal(state, force).await {
            Ok(_) => Ok(()),
            Err(e) => {
                error!(
                    "Error setting Discord state: {}. Continuing without Discord presence.",
                    e
                );
                Ok(())
            }
        }
    }

    async fn set_state_internal(&self, state: DiscordState, force: bool) -> Result<()> {
        if !*self.enabled.read().await {
            debug!("Discord Rich Presence is disabled, ignoring state update");
            return Ok(());
        }

        {
            let mut current_state = self.current_state.write().await;
            if !force && *current_state == state {
                trace!("Discord state unchanged, skipping update");
                return Ok(());
            }
            trace!(
                "Updating Discord state from {:?} to {:?}",
                *current_state, state
            );
            *current_state = state.clone();
        }

        // Write launcher state to shared file
        self.write_launcher_state_file(&state);

        let mut client_lock = self.client.lock().await;

        if client_lock.is_none() {
            drop(client_lock);
            if self.in_reconnect_backoff().await {
                debug!("Discord unreachable, skipping reconnect during backoff");
                return Ok(());
            }
            debug!("No Discord client available, attempting to reconnect...");
            if self.connect().await.is_err() {
                return Ok(());
            }
            client_lock = self.client.lock().await;
        }

        if let Some(client_ref) = client_lock.as_mut() {
            trace!("Sending activity to Discord...");
            match self.build_and_set_activity(&state, client_ref).await {
                Ok(_) => {
                    trace!("Successfully updated Discord Rich Presence");
                }
                Err(e) => {
                    warn!("Failed to update Discord Rich Presence: {}", e);
                    debug!("Attempting to reconnect to Discord...");
                    if let Err(reconnect_e) = client_ref.reconnect().map_err(|e| {
                        AppError::DiscordError(format!("Discord reconnect error: {}", e))
                    }) {
                        *client_lock = None;
                        drop(client_lock);
                        self.record_connect_failure(&reconnect_e).await;
                        return Ok(());
                    }

                    debug!("Reconnection successful, trying to set activity again...");
                    if let Err(retry_e) = self.build_and_set_activity(&state, client_ref).await {
                        error!(
                            "Failed to update Discord Rich Presence after reconnect: {}",
                            retry_e
                        );
                        return Err(retry_e);
                    }
                    debug!("Successfully updated Discord Rich Presence after reconnect");
                }
            }
        } else {
            warn!("Failed to get Discord client, cannot set activity");
        }

        Ok(())
    }

    async fn build_and_set_activity(&self, state: &DiscordState, client_ref: &mut DiscordIpcClient) -> std::result::Result<(), AppError> {
        let buttons = vec![activity::Button::new("CrimeClient holen", CRIMECLIENT_DOWNLOAD_URL)];

        let client_texts = Self::read_active_client_state().map(|j| Self::client_texts(&j));
        trace!("Building activity for state: {:?}, client_active: {}", state, client_texts.is_some());

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        let idle_start = *self.idle_start_timestamp.read().await;
        let game_start = *self.game_start_timestamp.read().await;

        // While the game writes its hand-off file its texts win (details = where the player is, state = the client
        // version). The time counts from the game start, so a refresh does not reset it.
        let (details, state_line, start_time): (String, String, i64) = match (client_texts, state) {
            (Some((details, state_line)), _) => (details, state_line, game_start.or(idle_start).unwrap_or(now)),
            (None, DiscordState::InGame { mc_version, .. }) => (
                "Im Spiel".to_string(),
                format!("Minecraft {}", mc_version),
                game_start.unwrap_or(now),
            ),
            (None, DiscordState::Custom(text)) => (String::new(), text.clone(), idle_start.unwrap_or(now)),
            (None, DiscordState::Idle) => (String::new(), "Im Launcher".to_string(), idle_start.unwrap_or(now)),
        };

        // Discord rejects texts shorter than two characters, so those lines are left out
        let mut activity = activity::Activity::new();
        if details.chars().count() >= 2 {
            activity = activity.details(&details);
        }
        if state_line.chars().count() >= 2 {
            activity = activity.state(&state_line);
        }
        let activity = activity
            .assets(
                activity::Assets::new()
                    .large_image("icon_512px")
                    .large_text("CrimeClient"),
            )
            .timestamps(activity::Timestamps::new().start(start_time))
            .buttons(buttons);

        client_ref.set_activity(activity)
            .map_err(|e| AppError::DiscordError(format!("Discord activity error: {}", e)))?;
        Ok(())
    }

    // --- State File Methods ---

    /// Write launcher state to shared discord directory
    fn write_launcher_state_file(&self, state: &DiscordState) {
        let discord_dir = LAUNCHER_DIRECTORY.meta_dir().join("discord");
        if std::fs::create_dir_all(&discord_dir).is_err() {
            return;
        }
        let file = discord_dir.join("launcher.json");
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let (state_str, details) = match state {
            DiscordState::Idle => ("Im Launcher".to_string(), None),
            DiscordState::Custom(text) => (text.clone(), None),
            DiscordState::InGame {
                profile_name,
                mc_version,
            } => ("Im Spiel".to_string(), Some(format!("{} {}", profile_name, mc_version))),
        };

        let json = serde_json::json!({
            "source": "launcher",
            "state": state_str,
            "details": details,
            "timestamp": now
        });
        std::fs::write(&file, json.to_string()).ok();
    }

    /// (details, state) of a hand-off file, trimmed; a missing text is empty
    fn client_texts(json: &serde_json::Value) -> (String, String) {
        let text = |key: &str| json[key].as_str().unwrap_or("").trim().to_string();
        (text("details"), text("state"))
    }

    /// Read the most recent active client state file (not stale, < 30s)
    fn read_active_client_state() -> Option<serde_json::Value> {
        let discord_dir = LAUNCHER_DIRECTORY.meta_dir().join("discord");
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        std::fs::read_dir(&discord_dir)
            .ok()?
            .filter_map(|e| e.ok())
            .filter(|e| {
                // client.<pid>.json; the mod writes client.<pid>.json.part first and renames it
                e.file_name()
                    .to_str()
                    .map_or(false, |n| n.starts_with("client.") && n.ends_with(".json"))
            })
            .filter_map(|e| {
                let content = std::fs::read_to_string(e.path()).ok()?;
                let json: serde_json::Value = serde_json::from_str(&content).ok()?;
                let timestamp = json["timestamp"].as_u64()?;
                if now.saturating_sub(timestamp) > 30_000 {
                    // Stale — cleanup
                    std::fs::remove_file(e.path()).ok();
                    return None;
                }
                Some(json)
            })
            .max_by_key(|j| j["timestamp"].as_u64().unwrap_or(0))
    }

    /// Cleanup all client state files (called when game stops)
    fn cleanup_client_files() {
        let discord_dir = LAUNCHER_DIRECTORY.meta_dir().join("discord");
        if let Ok(entries) = std::fs::read_dir(&discord_dir) {
            for entry in entries.flatten() {
                if entry
                    .file_name()
                    .to_str()
                    .map_or(false, |n| n.starts_with("client."))
                {
                    std::fs::remove_file(entry.path()).ok();
                }
            }
        }
    }

    /// Cleanup launcher state file (called on shutdown)
    pub fn cleanup_launcher_file() {
        let file = LAUNCHER_DIRECTORY.meta_dir().join("discord").join("launcher.json");
        std::fs::remove_file(&file).ok();
    }

    // --- Public API ---

    pub async fn set_enabled(&self, enabled: bool) -> Result<()> {
        debug!("Setting Discord Rich Presence enabled: {}", enabled);
        let mut enabled_lock = self.enabled.write().await;
        let was_enabled = *enabled_lock;
        *enabled_lock = enabled;

        if !was_enabled && enabled {
            debug!("Discord was disabled, now enabled - spawning background connection...");
            drop(enabled_lock);
            *self.last_connect_failure.write().await = None;

            let manager_clone = self.clone();
            tokio::spawn(async move {
                info!("Discord: Starting background connection...");
                if let Err(e) = manager_clone.connect().await {
                    debug!("Discord not connected when enabling: {}", e);
                    return;
                }
                if let Err(e) = manager_clone
                    .set_state_internal(DiscordState::Idle, true)
                    .await
                {
                    error!("Failed to set initial Discord state: {}", e);
                    return;
                }
                info!("Discord: Background connection completed successfully.");
            });
        } else if was_enabled && !enabled {
            debug!("Discord was enabled, now disabled - disconnecting...");
            drop(enabled_lock);
            if let Err(e) = self.disconnect().await {
                error!("Failed to disconnect from Discord when disabling: {}", e);
            }
        } else {
            debug!("Discord enabled state unchanged: {}", enabled);
        }

        Ok(())
    }

    pub async fn clear_idle_timestamp(&self) {
        if !*self.enabled.read().await {
            return;
        }
        let mut timestamp_lock = self.idle_start_timestamp.write().await;
        if timestamp_lock.is_some() {
            debug!("Clearing Discord idle start timestamp.");
            *timestamp_lock = None;
        }
    }

    pub async fn get_current_state(&self) -> DiscordState {
        self.current_state.read().await.clone()
    }

    pub async fn is_enabled(&self) -> bool {
        *self.enabled.read().await
    }

    /// Whether a game started now should hand its Discord texts to the launcher (`-Dcrimeclient.launcher.discord=true`)
    /// instead of opening a second activity of its own.
    pub async fn hands_off_to_launcher(&self) -> bool {
        !DISCORD_APP_ID.is_empty() && self.is_enabled().await
    }

    pub async fn handle_focus_event(&self) -> Result<()> {
        trace!("Handling focus event within DiscordManager.");

        if !self.is_enabled().await {
            return Ok(());
        }

        // Re-apply the current state (force=true to refresh Discord with latest client files)
        let current = self.current_state.read().await.clone();
        trace!("Focus handling: Re-applying current state: {:?}", current);
        self.set_state_internal(current, true).await?;

        Ok(())
    }

    pub async fn set_custom_state(&self, text: String) {
        self.set_state(DiscordState::Custom(text), false).await.ok();
    }

    pub async fn notify_game_start(
        &self,
        process_id: Uuid,
        profile_name: Option<String>,
        mc_version: Option<String>,
    ) {
        debug!(
            "Game start notification for process {}: profile={:?}, version={:?}",
            process_id, profile_name, mc_version
        );
        self.clear_idle_timestamp().await;
        {
            let mut game_start = self.game_start_timestamp.write().await;
            if game_start.is_none() {
                *game_start = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .ok();
            }
        }

        if let (Some(name), Some(version)) = (profile_name, mc_version) {
            self.set_state(
                DiscordState::InGame {
                    profile_name: name,
                    mc_version: version,
                },
                true,
            )
            .await
            .ok();
        }
    }

    pub async fn notify_game_stop(&self, process_id: Uuid) {
        debug!("Game stop notification for process {}", process_id);
        Self::cleanup_client_files();
        *self.game_start_timestamp.write().await = None;
        self.ensure_idle_timestamp_set().await;
        self.set_state(DiscordState::Idle, true).await.ok();
    }

    async fn ensure_idle_timestamp_set(&self) {
        if !*self.enabled.read().await {
            return;
        }
        let mut timestamp_lock = self.idle_start_timestamp.write().await;
        if timestamp_lock.is_none() {
            debug!("Setting idle timestamp to current time.");
            *timestamp_lock = Some(
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0),
            );
        }
    }
}
