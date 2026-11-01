//! CrimeClient Rust: Horizon (github.com/horizon-rust/horizon, MIT), Minecraft Java Edition written in Rust.
//!
//! Profiles with `"game": "horizon"` ([`Profile::is_horizon`]) start it instead of Java, after the usual downloads
//! of the vanilla files (client jar, libraries, assets, Java). [`install`] fetches the release named in
//! `rust.json` of the CrimeClient launcher API, [`prepare`] builds Horizon's resources from those vanilla files
//! once per release, [`launch`] starts the game with the account of this launcher over its standard input.
//!
//! [`Profile::is_horizon`]: crate::state::profile_state::Profile::is_horizon

mod install;
mod launch;
mod prepare;

pub use launch::launch;

use crate::error::Result;
use crate::state::event_state::{EventPayload, EventType};
use crate::state::state_manager::State;
use uuid::Uuid;

/// A launch status line for the profile (shown like the Java launch steps).
async fn progress(state: &State, event_type: EventType, profile_id: Uuid, message: &str, progress: f64) -> Result<()> {
    state
        .emit_event(EventPayload {
            event_id: Uuid::new_v4(),
            event_type,
            target_id: Some(profile_id),
            message: message.to_string(),
            progress: Some(progress),
            error: None,
        })
        .await
}
