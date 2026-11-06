use crate::error::Result;
use crate::state::profile_state::Profile;
use crate::state::state_manager::State;
use crate::state::sync_pack_state::SyncPackManager;
use crate::sync::account_pack;
use crate::sync::model::{SyncPack, SyncTarget};
use crate::sync::paths;
use crate::sync::report::{PreviewAction, SyncPreviewEntry};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Semaphore;
use uuid::Uuid;

pub struct SyncContext<'a> {
    pub pack: &'a SyncPack,
    pub target: &'a SyncTarget,
    pub profile: &'a Profile,
    pub instance_dir: &'a Path,
    pub subscriber_instances: &'a [(Uuid, PathBuf)],
    pub linked_dirs: &'a HashSet<String>,
    pub instance_shared_with_other_subscriber: bool,
    pub manager: &'a SyncPackManager,
    pub io_semaphore: Arc<Semaphore>,
    /// Account folder for the built-in account pack (see `account_pack`); unused by other packs.
    pub account: Option<String>,
}

impl<'a> SyncContext<'a> {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        pack: &'a SyncPack,
        target: &'a SyncTarget,
        profile: &'a Profile,
        instance_dir: &'a Path,
        subscriber_instances: &'a [(Uuid, PathBuf)],
        linked_dirs: &'a HashSet<String>,
        instance_shared_with_other_subscriber: bool,
        state: &'a State,
    ) -> Self {
        Self {
            pack,
            target,
            profile,
            instance_dir,
            subscriber_instances,
            linked_dirs,
            instance_shared_with_other_subscriber,
            manager: &state.sync_pack_manager,
            io_semaphore: Arc::clone(&state.io_semaphore),
            account: None,
        }
    }

    /// The account whose shared copy the built-in account pack uses.
    pub fn with_account(mut self, account: Option<String>) -> Self {
        self.account = account;
        self
    }

    /// True for the built-in account pack: its shared copy belongs to one account, so before a launch it wins
    /// over the profile folder (which may hold another account's files) and other profiles are never read.
    pub fn per_account(&self) -> bool {
        account_pack::is_account_pack(self.pack.id)
    }

    pub fn master_path(&self) -> Result<PathBuf> {
        if self.per_account() {
            let key = self.account.clone().unwrap_or_else(|| account_pack::account_key(None));
            let mut out = account_pack::account_dir(&key);
            for segment in paths::normalize_target_path(&self.target.path)?.split('/') {
                out.push(segment);
            }
            return Ok(out);
        }
        if let Some(external) = self.target.external_path.as_deref() {
            if !external.is_empty() {
                return paths::validate_external_master(external);
            }
        }
        paths::master_path_for(self.pack.id, &self.target.path)
    }

    pub fn instance_path(&self) -> Result<PathBuf> {
        paths::instance_path_for(self.instance_dir, &self.target.path)
    }

    pub fn subscriber_target_paths(&self) -> Vec<(Uuid, PathBuf)> {
        if self.per_account() {
            return Vec::new();
        }
        self.subscriber_instances
            .iter()
            .filter_map(|(id, dir)| {
                paths::instance_path_for(dir, &self.target.path)
                    .ok()
                    .map(|p| (*id, p))
            })
            .collect()
    }

    pub fn preview_entry(&self, action: PreviewAction) -> SyncPreviewEntry {
        SyncPreviewEntry::new(
            self.pack.id,
            &self.pack.name,
            &self.target.path,
            self.target.kind.discriminant(),
            action,
        )
    }

    pub fn is_dir_linked(&self, path: &str) -> bool {
        self.linked_dirs.contains(path)
    }
}
