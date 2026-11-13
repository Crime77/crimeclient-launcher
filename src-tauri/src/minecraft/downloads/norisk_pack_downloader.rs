use crate::commands::{crime_store_command, insider_command};
use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::{AppError, CommandError, Result};
use crate::integrations::norisk_packs::{self, NoriskModSourceDefinition, NoriskModpacksConfig};
use crate::minecraft::auth::minecraft_auth::Credentials;
use crate::minecraft::launch::launch_summary::DownloadStats;
use crate::utils::download_utils::{DownloadConfig, DownloadUtils};
use crate::utils::hash_utils;
use futures::stream::{iter, StreamExt};
use log::{error, info, trace, warn};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;

const DEFAULT_CONCURRENT_MOD_DOWNLOADS: usize = 4;
const MOD_CACHE_DIR_NAME: &str = "mod_cache"; // Reuse the same cache directory
const MODRINTH_MAVEN_URL: &str = "https://api.modrinth.com/maven"; // Modrinth Maven repo

#[derive(Clone)]
pub struct NoriskPackDownloadService {
    concurrent_downloads: usize,
    stats: Option<Arc<DownloadStats>>,
    /// CrimeClient: the account of this launch, which downloads CrimeClient Insider files
    account: Option<Credentials>,
}

impl NoriskPackDownloadService {
    pub fn new() -> Self {
        Self {
            concurrent_downloads: DEFAULT_CONCURRENT_MOD_DOWNLOADS,
            stats: None,
            account: None,
        }
    }

    pub fn with_concurrency(concurrent_downloads: usize) -> Self {
        Self {
            concurrent_downloads,
            stats: None,
            account: None,
        }
    }

    pub fn with_stats(mut self, stats: Arc<DownloadStats>) -> Self {
        self.stats = Some(stats);
        self
    }

    /// The account of this launch; Insider files are downloaded with its store sign-in (else the active account's).
    pub fn with_account(mut self, account: Option<Credentials>) -> Self {
        self.account = account;
        self
    }

    /// Downloads mods specified in a Norisk pack definition to the central mod cache.
    /// Requires the pack config, the ID of the pack to download, the target Minecraft version, and loader.
    pub async fn download_pack_mods_to_cache(
        &self,
        config: &NoriskModpacksConfig,
        pack_id: &str,
        minecraft_version: &str,
        loader: &str,
    ) -> Result<()> {
        info!(
            "Checking/Downloading Norisk Pack mods to cache. Pack ID: '{}', MC: {}, Loader: {} (Concurrency: {})",
            pack_id, minecraft_version, loader, self.concurrent_downloads
        );

        let mod_cache_dir = LAUNCHER_DIRECTORY.meta_dir().join(MOD_CACHE_DIR_NAME);
        if !mod_cache_dir.exists() {
            info!("Creating mod cache directory: {:?}", mod_cache_dir);
            fs::create_dir_all(&mod_cache_dir).await?;
        }

        let pack_definition = config.get_resolved_pack_definition(pack_id)?;

        let mut download_futures = Vec::new();

        for mod_entry in &pack_definition.mods {
            let compatibility_target = match mod_entry
                .compatibility
                .get(minecraft_version)
                .and_then(|loader_map| loader_map.get(loader))
            {
                Some(target) => target.clone(),
                None => {
                    warn!(
                        "No compatible version found for mod '{}' (ID: {}) for MC {} / Loader {}. Skipping.",
                        mod_entry.display_name.as_deref().unwrap_or(&mod_entry.id),
                        mod_entry.id,
                        minecraft_version,
                        loader
                    );
                    continue;
                }
            };

            let cache_dir_clone = mod_cache_dir.clone();
            let source = mod_entry.source.clone();
            let mod_id = mod_entry.id.clone();
            let display_name_opt = mod_entry.display_name.clone();
            let target_clone = compatibility_target.clone();
            let stats = self.stats.clone();
            let account = self.account.clone();

            download_futures.push(async move {
                let display_name = display_name_opt.unwrap_or_else(|| mod_id.clone());
                let identifier = target_clone.identifier.clone(); // Keep identifier for version/URL

                // --- Proceed with download logic using derived/provided filename & identifier ---
                // Use source override from target if available, otherwise use the original source
                let effective_source = target_clone.source.as_ref().unwrap_or(&source);
                // Use the identifier from target (already cloned above as `identifier`)
                let effective_identifier = identifier;

                // --- Determine filename using the effective source ---
                let filename_result =
                    norisk_packs::get_norisk_pack_mod_filename(effective_source, &target_clone, &mod_id);

                // Check if filename retrieval was successful
                let filename = match filename_result {
                    Ok(fname) => fname,
                    Err(e) => {
                        // Log the error and skip this mod download
                        error!("Skipping download for mod '{}': {}", display_name, e);
                        return Err(e); // Return error to the future stream
                    }
                };

                let target_path = cache_dir_clone.join(&filename);

                match effective_source {
                    NoriskModSourceDefinition::Modrinth {
                        project_id: _project_id,
                        project_slug,
                    } => {
                        let group_id = "maven.modrinth".to_string();
                        let artifact_id = project_slug;
                        let version = effective_identifier;

                        Self::download_maven_mod(
                            MODRINTH_MAVEN_URL.to_string(),
                            group_id,
                            artifact_id.clone(),
                            version,
                            filename,
                            target_path,
                            None,
                            target_clone.sha256.as_deref(),
                            stats,
                        )
                        .await
                        .map_err(|e| {
                            error!("Failed to download Modrinth mod '{}': {}", display_name, e);
                            e
                        })?;

                        Ok(())
                    }
                    NoriskModSourceDefinition::Maven {
                        repository_ref,
                        group_id,
                        artifact_id,
                    } => {
                        // Get the repository URL
                        let repo_url = config
                            .repositories
                            .get(repository_ref)
                            .ok_or_else(|| {
                                AppError::Download(format!(
                                    "Repository reference '{}' not found for mod '{}'",
                                    repository_ref, display_name
                                ))
                            })?
                            .trim_end_matches('/')
                            .to_string();

                        Self::download_maven_mod(
                            repo_url,
                            group_id.clone(),
                            artifact_id.clone(),
                            effective_identifier,
                            filename,
                            target_path,
                            None,
                            target_clone.sha256.as_deref(),
                            stats,
                        )
                        .await
                        .map_err(|e| {
                            error!("Failed to download Maven mod '{}': {}", display_name, e);
                            e
                        })?;

                        Ok(())
                    }
                    NoriskModSourceDefinition::Url => {
                        // For URL mods, use the identifier as direct URL
                        trace!(
                            "Downloading URL mod for cache: {} ({}) from {}",
                            display_name, filename, effective_identifier
                        );

                        let sha256 = target_clone.sha256.as_deref();
                        let result = if insider_command::is_insider_url(&effective_identifier) {
                            Self::download_insider_file(&effective_identifier, &target_path, sha256, account, stats).await
                        } else {
                            Self::download_and_verify_file(&effective_identifier, &target_path, None, sha256, None, stats)
                                .await
                        };
                        result.map_err(|e| {
                            error!("Failed to download URL mod '{}': {}", display_name, e);
                            e
                        })?;

                        Ok(())
                    }
                }
            });
        }

        info!(
            "Executing {} Norisk pack mod cache tasks for pack '{}'...",
            download_futures.len(),
            pack_id
        );
        let results: Vec<Result<()>> = iter(download_futures)
            .buffer_unordered(self.concurrent_downloads)
            .collect()
            .await;

        let mut errors = Vec::new();
        for result in results {
            if let Err(e) = result {
                errors.push(e);
            }
        }

        if errors.is_empty() {
            info!(
                "Norisk pack mod cache check/download process completed successfully for pack: '{}'",
                pack_id
            );
            Ok(())
        } else {
            error!(
                "Norisk pack mod cache check/download process completed with {} errors for pack: '{}'",
                errors.len(), pack_id
            );
            Err(errors.remove(0))
        }
    }

    /// Helper function to download a mod from a Maven repository.
    async fn download_maven_mod(
        repo_url: String,
        group_id: String,
        artifact_id: String,
        version: String,
        filename: String,
        target_path: PathBuf,
        expected_sha1: Option<&str>,
        expected_sha256: Option<&str>,
        stats: Option<Arc<DownloadStats>>,
    ) -> Result<()> {
        let group_path = group_id.replace('.', "/");
        let artifact_path = format!("{}/{}/{}/{}", group_path, artifact_id, version, filename);
        let download_url = format!("{}/{}", repo_url, artifact_path);

        trace!(
            "Preparing Maven mod for cache: {} (Group: {}, Artifact: {}, Version: {}) from {}",
            filename, group_id, artifact_id, version, repo_url
        );

        Self::download_and_verify_file(&download_url, &target_path, expected_sha1, expected_sha256, None, stats).await
    }

    /// CrimeClient Insider files need the store sign-in of an account with access (commands/insider_command.rs).
    /// A jar that is already in the cache with the listed SHA-256 is used without asking the API.
    async fn download_insider_file(
        url: &str,
        target_path: &PathBuf,
        expected_sha256: Option<&str>,
        account: Option<Credentials>,
        stats: Option<Arc<DownloadStats>>,
    ) -> Result<()> {
        let account = insider_command::download_account(account).await?;
        if let Some(expected) = expected_sha256 {
            if Self::has_sha256(target_path, expected).await {
                trace!("Insider file already cached with the right SHA-256: {:?}", target_path);
                if let Some(stats) = &stats {
                    stats.record_cached();
                }
                return Ok(());
            }
        }

        let sign_in_failed =
            |e: CommandError| AppError::Download(format!("CrimeClient Insider sign-in failed: {}", e.message));
        let bearer = |token: &str| Some(("Authorization".to_string(), format!("Bearer {token}")));
        let token = crime_store_command::token_for(&account).await.map_err(sign_in_failed)?;
        match Self::download_and_verify_file(url, target_path, None, expected_sha256, bearer(&token), stats.clone()).await
        {
            // the token expired or the API lost it: sign in again once (download_utils reports the status as text)
            Err(e) if e.to_string().contains("returned status 401") => {
                let token = crime_store_command::renew_token(&account, Some(&token)).await.map_err(sign_in_failed)?;
                Self::download_and_verify_file(url, target_path, None, expected_sha256, bearer(&token), stats).await
            }
            result => result,
        }
    }

    async fn has_sha256(path: &Path, expected: &str) -> bool {
        match hash_utils::calculate_sha256_from_file(path).await {
            Ok(actual) => actual.eq_ignore_ascii_case(expected),
            Err(_) => false,
        }
    }

    /// Downloads a file from a URL to a target path, optionally verifying its SHA1 or SHA-256 hash and sending one
    /// extra header.
    async fn download_and_verify_file(
        url: &str,
        target_path: &PathBuf,
        expected_sha1: Option<&str>,
        expected_sha256: Option<&str>,
        header: Option<(String, String)>,
        stats: Option<Arc<DownloadStats>>,
    ) -> Result<()> {
        // Explicit hash wins; else best-effort Maven `.sha1` sidecar (None = ZIP heuristic fallback).
        // Not with a SHA-256 or a header (Insider files: the sidecar request would go out without the token).
        let resolved_sha1 = match expected_sha1 {
            Some(hash) => Some(hash.to_string()),
            None if expected_sha256.is_none() && header.is_none() => DownloadUtils::try_fetch_sha1_sidecar(url).await,
            None => None,
        };

        let mut config = DownloadConfig::new()
            .with_streaming(true)  // Use streaming for potentially large mod files
            .with_retries(3)
            .with_stats(stats);

        if let Some(hash) = resolved_sha1 {
            config = config.with_sha1(hash);
        }
        if let Some(hash) = expected_sha256 {
            config = config.with_sha256(hash);
        }
        if let Some((name, value)) = header {
            config = config.with_header(name, value);
        }

        match (DownloadUtils::download_file(url, target_path, config).await, expected_sha256) {
            (Err(error), Some(expected)) => Err(Self::sha256_failure(target_path, expected, error).await),
            (result, _) => result,
        }
    }

    /// A download that should have had `expected` as SHA-256 failed. A file left behind with another hash is deleted
    /// (download_utils keeps what its last attempt wrote), and a checksum mismatch gets a plain error.
    async fn sha256_failure(target_path: &Path, expected: &str, error: AppError) -> AppError {
        let Ok(actual) = hash_utils::calculate_sha256_from_file(target_path).await else {
            return error; // nothing left behind
        };
        if actual.eq_ignore_ascii_case(expected) {
            return error;
        }
        if let Err(e) = fs::remove_file(target_path).await {
            warn!("Could not delete {:?} after a failed download: {}", target_path, e);
        }
        if !error.to_string().contains("SHA256 mismatch") {
            return error;
        }
        let name = target_path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        AppError::Download(format!(
            "{} does not match its SHA-256 checksum (expected {}, got {}), the file was deleted",
            name, expected, actual
        ))
    }


}

// Note: Syncing logic (like `sync_mods_to_profile` from ModDownloadService)
// is not included here as it depends on a specific Profile's mod list,
// not directly on the Norisk Pack definition. Syncing would still use
// ModDownloadService after the Profile's mod list has been potentially
// updated based on a selected Norisk Pack.

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    const BODY: &[u8] = b"CrimeClient Insider test build";

    /// HTTP server on localhost that answers BODY to requests with `Authorization: Bearer good`, else 401.
    async fn serve() -> (String, Arc<AtomicUsize>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/insider/release/test.bin", listener.local_addr().unwrap());
        let requests = Arc::new(AtomicUsize::new(0));
        let counter = requests.clone();
        tokio::spawn(async move {
            while let Ok((mut socket, _)) = listener.accept().await {
                counter.fetch_add(1, Ordering::SeqCst);
                let mut buf = vec![0u8; 8192];
                let n = socket.read(&mut buf).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]).to_ascii_lowercase();
                if request.contains("\r\nauthorization: bearer good\r\n") {
                    let head = format!("HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", BODY.len());
                    let _ = socket.write_all(head.as_bytes()).await;
                    let _ = socket.write_all(BODY).await;
                } else {
                    let _ = socket
                        .write_all(b"HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
                        .await;
                }
                let _ = socket.shutdown().await;
            }
        });
        (url, requests)
    }

    fn bearer(token: &str) -> Option<(String, String)> {
        Some(("Authorization".to_string(), format!("Bearer {token}")))
    }

    #[tokio::test]
    async fn sends_the_header_and_keeps_a_file_with_the_right_sha256() {
        let (url, requests) = serve().await;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("test.bin");
        let sha256 = hash_utils::calculate_sha256_from_bytes(BODY);

        NoriskPackDownloadService::download_and_verify_file(&url, &target, None, Some(&sha256), bearer("good"), None)
            .await
            .unwrap();
        assert_eq!(tokio::fs::read(&target).await.unwrap(), BODY);
        assert!(NoriskPackDownloadService::has_sha256(&target, &sha256.to_uppercase()).await);
        assert_eq!(requests.load(Ordering::SeqCst), 1, "no .sha1 sidecar request with a SHA-256 or a header");

        // the cached file is used again without a request
        NoriskPackDownloadService::download_and_verify_file(&url, &target, None, Some(&sha256), bearer("good"), None)
            .await
            .unwrap();
        assert_eq!(requests.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn deletes_a_download_with_the_wrong_sha256() {
        let (url, _) = serve().await;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("test.bin");
        let wrong = hash_utils::calculate_sha256_from_bytes(b"another build");

        let error = NoriskPackDownloadService::download_and_verify_file(&url, &target, None, Some(&wrong), bearer("good"), None)
            .await
            .unwrap_err()
            .to_string();
        assert!(error.contains("does not match its SHA-256 checksum"), "{error}");
        assert!(!target.exists(), "the wrong file must not stay in the cache");
        assert!(!NoriskPackDownloadService::has_sha256(&target, &wrong).await);
    }

    #[tokio::test]
    async fn a_missing_token_ends_in_a_401_the_downloader_recognises() {
        let (url, _) = serve().await;
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("test.bin");
        let sha256 = hash_utils::calculate_sha256_from_bytes(BODY);

        let error = NoriskPackDownloadService::download_and_verify_file(&url, &target, None, Some(&sha256), bearer("old"), None)
            .await
            .unwrap_err()
            .to_string();
        // download_insider_file signs in again on exactly this text
        assert!(error.contains("returned status 401"), "{error}");
        assert!(!target.exists());
    }

    #[test]
    fn sha256_is_optional_in_pack_files() {
        let with: norisk_packs::CompatibilityTarget =
            serde_json::from_str(r#"{"identifier": "https://x/a.jar", "filename": "a.jar", "sha256": "ab"}"#).unwrap();
        assert_eq!(with.sha256.as_deref(), Some("ab"));
        let without: norisk_packs::CompatibilityTarget =
            serde_json::from_str(r#"{"identifier": "https://x/a.jar", "filename": "a.jar"}"#).unwrap();
        assert_eq!(without.sha256, None);
        assert!(!serde_json::to_string(&without).unwrap().contains("sha256"));
    }
}
