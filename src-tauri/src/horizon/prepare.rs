//! Horizon's resources from this launcher's vanilla files. horizon-prepare reads the version JSON, client jar,
//! libraries and assets from the meta folder (the official launcher's layout, so `--minecraft-dir` is the meta
//! folder itself) plus the server jar, checks them against Horizon's pins and writes
//! `<release>/.local/horizon-client/<version>`. Runs once per release, then the sounds are copied in.

use super::progress;
use crate::config::{ProjectDirsExt, HTTP_CLIENT, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use crate::minecraft::dto::piston_meta::{DownloadInfo, PistonMeta};
use crate::state::event_state::EventType;
use crate::state::state_manager::State;
use log::info;
use sha1::{Digest, Sha1};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use uuid::Uuid;

/// Lines horizon-prepare prints for a full preparation, for the progress bar.
const EXPECTED_LINES: f64 = 30.0;

/// The prepared resources for `piston_meta.id`, made first if this release has none yet.
pub async fn ensure_prepared(
    state: &State,
    profile_id: Uuid,
    release: &Path,
    piston_meta: &PistonMeta,
    version_url: &str,
    java_path: &Path,
) -> Result<PathBuf> {
    let version = &piston_meta.id;
    let resources = release.join(".local").join("horizon-client").join(version);
    let marker = release.join(".local").join(format!(".crimeclient-prepared-{}", version));
    if marker.is_file() && resources.join("horizon-resources.json").is_file() {
        return Ok(resources);
    }
    info!("[Horizon] Preparing resources for {} in {}", version, release.display());
    let meta = LAUNCHER_DIRECTORY.meta_dir();
    let manifest = meta.join("versions").join(version).join(format!("{}.json", version));
    if !manifest.is_file() {
        // The launcher keeps only the parsed version JSON; Horizon checks the file's own checksum.
        let bytes = fetch(version_url).await?;
        tokio::fs::create_dir_all(manifest.parent().unwrap()).await?;
        tokio::fs::write(&manifest, &bytes).await?;
    }
    let server = piston_meta
        .downloads
        .server
        .as_ref()
        .ok_or_else(|| AppError::Other(format!("Minecraft {} has no server jar to prepare from", version)))?;
    let server_jar = super::install::root().join(format!("server-{}.jar", version));
    ensure_file(server, &server_jar).await?;

    let java_home = java_path
        .parent()
        .and_then(Path::parent)
        .ok_or_else(|| AppError::Other(format!("No Java home above {}", java_path.display())))?;
    let program = release.join(if cfg!(windows) { "horizon-prepare.exe" } else { "horizon-prepare" });
    let root = release.as_os_str().to_owned();
    let meta = meta.as_os_str().to_owned();
    let prepare = [
        "--prepare".into(),
        "--root".into(),
        root.clone(),
        "--server-jar".into(),
        server_jar.as_os_str().to_owned(),
        "--minecraft-dir".into(),
        meta.clone(),
    ];
    run(state, profile_id, &program, &prepare, java_home, 0.0, 0.85).await?;
    let sounds = ["sounds".into(), "--root".into(), root, "--minecraft-dir".into(), meta];
    run(state, profile_id, &program, &sounds, java_home, 0.85, 0.15).await?;
    tokio::fs::write(&marker, version).await?;
    Ok(resources)
}

/// Runs horizon-prepare, showing each line it prints as a launch step between `start` and `start + share`.
async fn run(
    state: &State,
    profile_id: Uuid,
    program: &Path,
    args: &[std::ffi::OsString],
    java_home: &Path,
    start: f64,
    share: f64,
) -> Result<()> {
    let mut path = std::ffi::OsString::from(java_home.join("bin"));
    if let Some(old) = std::env::var_os("PATH") {
        path.push(if cfg!(windows) { ";" } else { ":" });
        path.push(old);
    }
    let mut command = tokio::process::Command::new(program);
    command
        .args(args)
        .env("JAVA_HOME", java_home)
        .env("PATH", path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = command
        .spawn()
        .map_err(|e| AppError::ProcessSpawnFailed(format!("{}: {}", program.display(), e)))?;
    let mut stderr = child.stderr.take().unwrap();
    let errors = tokio::spawn(async move {
        let mut text = String::new();
        stderr.read_to_string(&mut text).await.ok();
        text
    });
    let mut lines = BufReader::new(child.stdout.take().unwrap()).lines();
    let mut last = Vec::new();
    while let Ok(Some(line)) = lines.next_line().await {
        info!("[Horizon] prepare: {}", line);
        let shown = start + share * (last.len() as f64 / EXPECTED_LINES).min(0.95);
        progress(state, EventType::LaunchingMinecraft, profile_id, &format!("CrimeClient Rust: {}", line), shown)
            .await?;
        last.push(line);
    }
    let status = child.wait().await?;
    let errors = errors.await.unwrap_or_default();
    if !status.success() {
        let tail: Vec<&str> = last.iter().rev().take(5).rev().map(String::as_str).collect();
        return Err(AppError::Other(format!(
            "Preparing CrimeClient Rust failed ({}): {}\n{}",
            status,
            errors.trim(),
            tail.join("\n")
        )));
    }
    Ok(())
}

/// `to`, downloaded from `info` unless a copy with the right sha1 is there.
async fn ensure_file(info: &DownloadInfo, to: &Path) -> Result<()> {
    if let Ok(bytes) = tokio::fs::read(to).await {
        if hex::encode(Sha1::digest(&bytes)).eq_ignore_ascii_case(&info.sha1) {
            return Ok(());
        }
    }
    let bytes = fetch(&info.url).await?;
    let digest = hex::encode(Sha1::digest(&bytes));
    if !digest.eq_ignore_ascii_case(&info.sha1) {
        return Err(AppError::Download(format!("{} has sha1 {}, expected {}", info.url, digest, info.sha1)));
    }
    tokio::fs::create_dir_all(to.parent().unwrap()).await?;
    tokio::fs::write(to, &bytes).await?;
    Ok(())
}

async fn fetch(url: &str) -> Result<Vec<u8>> {
    let response = HTTP_CLIENT
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| AppError::Download(format!("{}: {}", url, e)))?;
    Ok(response
        .bytes()
        .await
        .map_err(|e| AppError::Download(format!("{}: {}", url, e)))?
        .to_vec())
}
