//! The CrimeClient Rust release: `rust.json` of the launcher API names the zip (crimeclient-rust/tools/package.py),
//! which is checked against its sha256 and unpacked to `<meta>/horizon/<version>`.

use super::progress;
use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use crate::minecraft::api::NoRiskApi;
use crate::state::event_state::EventType;
use crate::state::state_manager::State;
use futures::StreamExt;
use log::{info, warn};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

/// Marks a complete unpacked release; holds the zip's sha256.
const INSTALLED: &str = ".installed";
/// Holds the release's resources key: releases with the same key can share prepared resources.
const RESOURCES_KEY: &str = ".resources";
/// horizon-prepare's work folder in a release (prepare.rs), the prepared resources included.
const PREPARED: &str = ".local";

#[derive(Deserialize, Debug)]
struct Release {
    version: String,
    horizon: String,
    /// What the prepared resources depend on; the Horizon tag unless a release changes horizon-prepare or its
    /// exporters itself.
    #[serde(default)]
    resources: Option<String>,
    url: String,
    sha256: String,
    size: u64,
}

impl Release {
    fn resources_key(&self) -> &str {
        self.resources.as_deref().unwrap_or(&self.horizon)
    }
}

pub fn root() -> PathBuf {
    LAUNCHER_DIRECTORY.meta_dir().join("horizon")
}

/// The folder of the current release, downloaded first if needed. Without the API (offline) the newest
/// installed release is used.
pub async fn ensure_installed(state: &State, profile_id: Uuid) -> Result<PathBuf> {
    let release: Release = match NoRiskApi::get_crimeclient_json("rust.json").await {
        Ok(release) => release,
        Err(e) => {
            warn!("[Horizon] rust.json not available ({}), using an installed release", e);
            return newest_installed().await.ok_or_else(|| {
                AppError::Other(format!("CrimeClient Rust could not be downloaded: {}", e))
            });
        }
    };
    if !valid_version(&release.version) {
        return Err(AppError::Other(format!("rust.json names an invalid version: {}", release.version)));
    }
    let dir = root().join(&release.version);
    let marker = dir.join(INSTALLED);
    if tokio::fs::read_to_string(&marker).await.ok().as_deref().map(str::trim) == Some(release.sha256.as_str()) {
        return Ok(dir);
    }
    info!("[Horizon] Installing CrimeClient Rust {} (Horizon {})", release.version, release.horizon);
    tokio::fs::create_dir_all(root()).await?;
    let zip = root().join(format!("{}.zip.part", release.version));
    download(state, profile_id, &release, &zip).await?;

    progress(state, EventType::DownloadingClient, profile_id, "CrimeClient Rust: unpacking...", 0.95).await?;
    let staging = root().join(format!(".{}-{}", release.version, std::process::id()));
    let (from, into) = (zip.clone(), staging.clone());
    tokio::task::spawn_blocking(move || -> Result<()> {
        if into.exists() {
            std::fs::remove_dir_all(&into)?;
        }
        let file = std::fs::File::open(&from)?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| AppError::Other(format!("CrimeClient Rust zip: {}", e)))?;
        archive
            .extract(&into)
            .map_err(|e| AppError::Other(format!("CrimeClient Rust zip: {}", e)))
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))??;
    tokio::fs::remove_file(&zip).await.ok();
    adopt_prepared(&root(), release.resources_key(), &staging).await;
    if dir.exists() {
        tokio::fs::remove_dir_all(&dir).await?;
    }
    tokio::fs::rename(&staging, &dir).await?;
    tokio::fs::write(dir.join(RESOURCES_KEY), release.resources_key()).await?;
    tokio::fs::write(&marker, &release.sha256).await?;
    remove_old(&release.version).await;
    progress(state, EventType::DownloadingClient, profile_id, "CrimeClient Rust installed", 1.0).await?;
    Ok(dir)
}

/// Downloads the zip to `to`, checking size and sha256.
async fn download(state: &State, profile_id: Uuid, release: &Release, to: &PathBuf) -> Result<()> {
    let response = HTTP_CLIENT
        .get(&release.url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| AppError::Download(format!("{}: {}", release.url, e)))?;
    let mut file = tokio::fs::File::create(to).await?;
    let mut hasher = Sha256::new();
    let mut done: u64 = 0;
    let mut shown = 0;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Download(format!("{}: {}", release.url, e)))?;
        hasher.update(&chunk);
        file.write_all(&chunk).await?;
        done += chunk.len() as u64;
        let percent = (done * 100 / release.size.max(1)).min(100);
        if percent >= shown + 5 {
            shown = percent;
            let message = format!("CrimeClient Rust: downloading {} MB ({}%)", release.size / 1_000_000, percent);
            progress(state, EventType::DownloadingClient, profile_id, &message, percent as f64 / 100.0 * 0.9).await?;
        }
    }
    file.flush().await?;
    drop(file);
    let digest = hex::encode(hasher.finalize());
    if done != release.size || !digest.eq_ignore_ascii_case(&release.sha256) {
        tokio::fs::remove_file(to).await.ok();
        return Err(AppError::Download(format!(
            "CrimeClient Rust download is damaged ({} bytes, sha256 {}), please try again",
            done, digest
        )));
    }
    Ok(())
}

/// "0.1.0": digits and dots only, so it is safe as a folder name.
fn valid_version(version: &str) -> bool {
    !version.is_empty() && version.chars().all(|c| c.is_ascii_digit() || c == '.') && !version.starts_with('.')
}

async fn installed() -> Vec<(Vec<u64>, PathBuf)> {
    installed_in(&root()).await
}

/// The complete releases in `root`, oldest first.
async fn installed_in(root: &Path) -> Vec<(Vec<u64>, PathBuf)> {
    let mut found = Vec::new();
    if let Ok(mut entries) = tokio::fs::read_dir(root).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let name = entry.file_name().to_string_lossy().to_string();
            if valid_version(&name) && entry.path().join(INSTALLED).is_file() {
                let key = name.split('.').map(|p| p.parse().unwrap_or(0)).collect();
                found.push((key, entry.path()));
            }
        }
    }
    found.sort();
    found
}

async fn newest_installed() -> Option<PathBuf> {
    installed().await.pop().map(|(_, path)| path)
}

/// Moves the prepared resources (about 1.3 GB, a minute of horizon-prepare) of the newest installed release with the
/// same resources key into `into`, so an update that keeps the Horizon tag starts without preparing again.
async fn adopt_prepared(root: &Path, key: &str, into: &Path) {
    for (_, path) in installed_in(root).await.into_iter().rev() {
        let same = tokio::fs::read_to_string(path.join(RESOURCES_KEY)).await.ok();
        if same.as_deref().map(str::trim) != Some(key) || !path.join(PREPARED).is_dir() {
            continue;
        }
        match tokio::fs::rename(path.join(PREPARED), into.join(PREPARED)).await {
            Ok(()) => info!("[Horizon] Took over the prepared resources of {}", path.display()),
            // e.g. a game of the old release still running: prepare.rs prepares again
            Err(e) => warn!("[Horizon] Could not take over the prepared resources of {}: {}", path.display(), e),
        }
        return;
    }
}

/// Older releases go once a new one is complete (each holds its own prepared resources, about 1.3 GB).
async fn remove_old(current: &str) {
    for (_, path) in installed().await {
        if path.file_name().is_some_and(|n| n != current) {
            if let Err(e) = tokio::fs::remove_dir_all(&path).await {
                warn!("[Horizon] Could not remove the old release {}: {}", path.display(), e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn release(root: &Path, version: &str, key: &str) -> PathBuf {
        let dir = root.join(version);
        tokio::fs::create_dir_all(dir.join(PREPARED)).await.unwrap();
        tokio::fs::write(dir.join(PREPARED).join("horizon-resources.json"), version).await.unwrap();
        tokio::fs::write(dir.join(RESOURCES_KEY), key).await.unwrap();
        tokio::fs::write(dir.join(INSTALLED), "sha").await.unwrap();
        dir
    }

    #[tokio::test]
    async fn update_takes_over_prepared_resources_of_the_same_horizon() {
        let root = tempfile::tempdir().unwrap();
        release(root.path(), "0.1.0", "nightly-a").await;
        release(root.path(), "0.1.1", "nightly-b").await;
        let staging = root.path().join(".0.1.2-1");
        tokio::fs::create_dir_all(&staging).await.unwrap();

        adopt_prepared(root.path(), "nightly-a", &staging).await;
        let adopted = tokio::fs::read_to_string(staging.join(PREPARED).join("horizon-resources.json")).await;
        assert_eq!(adopted.unwrap(), "0.1.0");
        assert!(!root.path().join("0.1.0").join(PREPARED).exists());

        // another Horizon tag: nothing to take over, prepare.rs prepares again
        let other = root.path().join(".0.2.0-1");
        tokio::fs::create_dir_all(&other).await.unwrap();
        adopt_prepared(root.path(), "nightly-c", &other).await;
        assert!(!other.join(PREPARED).exists());
    }
}
