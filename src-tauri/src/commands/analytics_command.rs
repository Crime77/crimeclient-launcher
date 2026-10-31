//! CrimeClient sends no usage statistics. NoRisk's analytics sender, its frontend commands and the screen-time
//! report are gone; `track`/`track_event` stay as no-ops so the clip, skin and profile code keeps its call sites.

use serde_json::Value;
use std::collections::HashMap;

pub fn tenths(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

pub fn megabytes(bytes: u64) -> f64 {
    tenths(bytes as f64 / 1e6)
}

pub fn track(_event_type: impl Into<String>, _properties: Value) {}

pub fn track_event(_event_type: impl Into<String>, _properties: HashMap<String, Value>) {}
