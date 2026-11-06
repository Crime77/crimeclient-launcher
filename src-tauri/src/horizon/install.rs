//! The CrimeClient Rust release: `rust.json` of the launcher API names the zip (crimeclient-rust/tools/package.py),
//! which is checked against its sha256 and unpacked to `<meta>/horizon/<version>`. `platforms` holds one zip per
//! system (`windows-x86_64`, `linux-x86_64`); the top-level `url` is the Windows zip, for launchers before 0.3.0.

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
/// What package.py packed into every release: its version, Horizon tag and resources key.
const INFO: &str = "crimeclient-rust.json";
/// horizon-prepare's work folder in a release (prepare.rs), the prepared resources included.
const PREPARED: &str = ".local";

#[derive(Deserialize, Debug)]
struct Release {
    version: String,
    horizon: String,
    url: String,
    sha256: String,
    size: u64,
    #[serde(default)]
    platforms: std::collections::HashMap<String, Package>,
}

/// One system's zip of a release.
#[derive(Deserialize, Debug, Clone)]
struct Package {
    url: String,
    sha256: String,
    size: u64,
}

/// This system's key in `rust.json` `platforms`.
fn platform_key() -> String {
    let os = match std::env::consts::OS {
        "macos" => "macos",
        other => other,
    };
    format!("{}-{}", os, std::env::consts::ARCH)
}

impl Release {
    /// The zip for this system: its `platforms` entry, else the top-level one, which is the Windows zip.
    fn for_platform(mut self, key: &str) -> Option<Release> {
        if let Some(package) = self.platforms.get(key).cloned() {
            self.url = package.url;
            self.sha256 = package.sha256;
            self.size = package.size;
            return Some(self);
        }
        (key == "windows-x86_64").then_some(self)
    }
}

/// The programs of a release; Python's zipfile (package.py on Windows) stores no Unix permissions.
#[cfg(unix)]
fn make_executable(dir: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    for name in ["horizon-client", "horizon-prepare", "horizon-ctl"] {
        let path = dir.join(name);
        if path.is_file() {
            let mut permissions = std::fs::metadata(&path)?.permissions();
            permissions.set_mode(permissions.mode() | 0o755);
            std::fs::set_permissions(&path, permissions)?;
        }
    }
    Ok(())
}

/// A release's `crimeclient-rust.json`.
#[derive(Deserialize)]
struct Info {
    horizon: String,
    /// What the prepared resources depend on; the Horizon tag unless a release changes horizon-prepare or its
    /// exporters itself (package.py --resources).
    #[serde(default)]
    resources: Option<String>,
}

/// The resources key of the release unpacked in `dir`: releases with the same key can share prepared resources.
async fn resources_key(dir: &Path) -> Option<String> {
    let info: Info = serde_json::from_slice(&tokio::fs::read(dir.join(INFO)).await.ok()?).ok()?;
    Some(info.resources.unwrap_or(info.horizon))
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
    let platform = platform_key();
    let Some(release) = release.for_platform(&platform) else {
        return Err(AppError::Other(format!("CrimeClient Rust is not available for this system yet ({})", platform)));
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
            .map_err(|e| AppError::Other(format!("CrimeClient Rust zip: {}", e)))?;
        #[cfg(unix)]
        make_executable(&into)?;
        Ok(())
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))??;
    tokio::fs::remove_file(&zip).await.ok();
    adopt_prepared(&root(), &staging).await;
    if dir.exists() {
        tokio::fs::remove_dir_all(&dir).await?;
    }
    tokio::fs::rename(&staging, &dir).await?;
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
/// same resources key into the release unpacked in `into`, so an update that keeps the Horizon tag starts without
/// preparing again.
async fn adopt_prepared(root: &Path, into: &Path) {
    let Some(key) = resources_key(into).await else {
        return;
    };
    for (_, path) in installed_in(root).await.into_iter().rev() {
        if resources_key(&path).await.as_ref() != Some(&key) || !path.join(PREPARED).is_dir() {
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

    /// A release folder as package.py packs it; `resources` is its own key, if it has one.
    async fn unpacked(dir: &Path, horizon: &str, resources: Option<&str>) {
        tokio::fs::create_dir_all(dir).await.unwrap();
        let info = serde_json::json!({ "version": "x", "horizon": horizon, "resources": resources });
        tokio::fs::write(dir.join(INFO), info.to_string()).await.unwrap();
    }

    async fn installed_release(root: &Path, version: &str, horizon: &str) {
        let dir = root.join(version);
        unpacked(&dir, horizon, None).await;
        tokio::fs::create_dir_all(dir.join(PREPARED)).await.unwrap();
        tokio::fs::write(dir.join(PREPARED).join("horizon-resources.json"), version).await.unwrap();
        tokio::fs::write(dir.join(INSTALLED), "sha").await.unwrap();
    }

    #[test]
    fn each_system_gets_its_own_zip() {
        let json = serde_json::json!({
            "version": "0.8.0", "horizon": "h", "url": "win.zip", "sha256": "w", "size": 1,
            "platforms": {
                "windows-x86_64": { "url": "win.zip", "sha256": "w", "size": 1 },
                "linux-x86_64": { "url": "linux.zip", "sha256": "l", "size": 2 }
            }
        });
        let release = |v: &serde_json::Value| serde_json::from_value::<Release>(v.clone()).unwrap();
        let linux = release(&json).for_platform("linux-x86_64").unwrap();
        assert_eq!((linux.url.as_str(), linux.sha256.as_str(), linux.size), ("linux.zip", "l", 2));
        assert_eq!(release(&json).for_platform("windows-x86_64").unwrap().url, "win.zip");
        assert!(release(&json).for_platform("macos-aarch64").is_none());
        // a rust.json from before platforms: only Windows
        let old = serde_json::json!({ "version": "0.7.0", "horizon": "h", "url": "win.zip", "sha256": "w", "size": 1 });
        assert_eq!(release(&old).for_platform("windows-x86_64").unwrap().url, "win.zip");
        assert!(release(&old).for_platform("linux-x86_64").is_none());
    }

    #[tokio::test]
    async fn update_takes_over_prepared_resources_of_the_same_horizon() {
        let root = tempfile::tempdir().unwrap();
        installed_release(root.path(), "0.1.0", "nightly-a").await;
        installed_release(root.path(), "0.1.1", "nightly-b").await;
        let staging = root.path().join(".0.1.2-1");
        unpacked(&staging, "nightly-a", None).await;

        adopt_prepared(root.path(), &staging).await;
        let adopted = tokio::fs::read_to_string(staging.join(PREPARED).join("horizon-resources.json")).await;
        assert_eq!(adopted.unwrap(), "0.1.0");
        assert!(!root.path().join("0.1.0").join(PREPARED).exists());

        // another Horizon tag, or the same one with its own resources key: prepare.rs prepares again
        for (version, horizon, resources) in [(".0.2.0-1", "nightly-c", None), (".0.2.1-1", "nightly-b", Some("own"))] {
            let other = root.path().join(version);
            unpacked(&other, horizon, resources).await;
            adopt_prepared(root.path(), &other).await;
            assert!(!other.join(PREPARED).exists());
        }
    }
}
