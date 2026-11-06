import { useState, useEffect } from "react";
import { ArrowRight, File, Folder, FolderOpen, Lock, Trash2 } from "lucide-react";
import type { Profile, SymlinkInfo } from "../../../types/profile";
import { Button } from "../../ui/buttons/Button";
import { IconButton } from "../../ui/buttons/IconButton";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLaunchStateStore, LaunchState } from "../../../store/launch-state-store";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { useGlobalModal } from "../../../hooks/useGlobalModal";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { SymlinkConfigModal } from "./SymlinkConfigModal";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { logError, logWarn, logInfo } from "../../../utils/logging-utils";
import {
  getProfileInstancePath,
  addProfileSymlink,
  removeProfileSymlink,
  getProfileSymlinks, getDefaultProfilePath
} from "../../../services/profile-service";
import { parseErrorMessage } from "../../../utils/error-utils";

interface SymlinkSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  allProfiles: Profile[];
}

export function SymlinkSettingsTab({
  editedProfile,
  updateProfile,
  allProfiles,
}: SymlinkSettingsTabProps) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModal();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [symlinks, setSymlinks] = useState<SymlinkInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { getProfileState } = useLaunchStateStore();
  const profileState = getProfileState(editedProfile.id);
  const isProfileRunning = profileState.launchState === LaunchState.RUNNING || 
                          profileState.launchState === LaunchState.LAUNCHING;

  // Load symlinks from filesystem
  useEffect(() => {
    loadSymlinks();
  }, [editedProfile.id]);

  const loadSymlinks = async () => {
    try {
      setLoading(true);
      const links = await getProfileSymlinks(editedProfile.id);
      setSymlinks(links);
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      logError(`Failed to load symlinks for profile ${editedProfile.id}: ${errorMessage}`);
      console.error("Failed to load symlinks:", error);
      toast.error(t('symlinks.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const openFolderPickerAndConfigure = async () => {
    try {
      // Step 1: Open folder picker
      const profilesPath = await getDefaultProfilePath();
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: profilesPath,
        title: t('symlinks.dialog_title_folder'),
      });

      if (selected && typeof selected === "string") {
        // Step 2: Get the profile instance path from backend
        const profileInstancePath = await getProfileInstancePath(editedProfile.id);
        
        // Step 3: Open configuration modal
        const modalId = "symlink-config";
        showModal(
          modalId,
          <SymlinkConfigModal
            externalPath={selected}
            profileInstancePath={profileInstancePath}
            onConfirm={async (targetPath) => {
              hideModal(modalId);
              await createSymlink(selected, targetPath);
            }}
            onCancel={() => hideModal(modalId)}
          />
        );
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error);
      toast.error(t('symlinks.folder_picker_failed'));
    }
  };

  const openFilePickerAndConfigure = async () => {
    try {
      // Step 1: Open file picker
      const profilesPath = await getDefaultProfilePath();
      const selected = await open({
        directory: false,
        multiple: false,
        defaultPath: profilesPath,
        title: t('symlinks.dialog_title_file'),
      });

      if (selected && typeof selected === "string") {
        // Step 2: Get the profile instance path from backend
        const profileInstancePath = await getProfileInstancePath(editedProfile.id);
        
        // Step 3: Open configuration modal
        const modalId = "symlink-config";
        showModal(
          modalId,
          <SymlinkConfigModal
            externalPath={selected}
            profileInstancePath={profileInstancePath}
            onConfirm={async (targetPath) => {
              hideModal(modalId);
              await createSymlink(selected, targetPath);
            }}
            onCancel={() => hideModal(modalId)}
          />
        );
      }
    } catch (error) {
      console.error("Failed to open file picker:", error);
      toast.error(t('symlinks.file_picker_failed'));
    }
  };

  const createSymlink = async (externalPath: string, targetPath: string) => {
    try {
      logInfo(`Creating symlink for profile ${editedProfile.id}: ${targetPath} → ${externalPath}`);
      await addProfileSymlink({
        profile_id: editedProfile.id,
        relative_path: targetPath,
        external_path: externalPath,
      });

      toast.success(t('symlinks.created_success', { target: targetPath, external: externalPath }));
      await loadSymlinks(); // Reload symlinks from filesystem
    } catch (error: any) {
      const errorMessage = error?.message || parseErrorMessage(error);
      logError(`Symlink creation failed for profile ${editedProfile.id}: ${errorMessage}. Target: ${targetPath}, External: ${externalPath}`);
      console.error("Symlink creation failed:", error);
      
      // Check if it's a permission error on Windows
      if (errorMessage.includes("os error 1314") || errorMessage.includes("erforderliches Recht")) {
        logWarn(`Symlink creation failed due to Windows permissions. Profile: ${editedProfile.id}`);
        toast.error(
          t('symlinks.windows_admin_required'),
          { duration: 8000 }
        );
      } else {
        toast.error(t('symlinks.create_failed', { error: errorMessage }));
      }
    }
  };

  const removeSymlink = async (path: string) => {
    const confirmed = await confirm({
      title: t('symlinks.remove_title'),
      message: t('symlinks.remove_confirm', { path }),
      confirmText: t('symlinks.remove_button'),
      cancelText: t('common.cancel'),
      type: "danger",
    });

    if (!confirmed) return;

    try {
      logInfo(`Removing symlink for profile ${editedProfile.id}: ${path}`);
      await removeProfileSymlink(editedProfile.id, path);
      toast.success(t('symlinks.removed_success', { path }));
      await loadSymlinks(); // Reload symlinks from filesystem
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      logError(`Failed to remove symlink for profile ${editedProfile.id}: ${errorMessage}. Path: ${path}`);
      toast.error(t('symlinks.remove_failed', { error: errorMessage }));
    }
  };

  const openInternalPath = async (relativePath: string) => {
    try {
      const instancePath = await getProfileInstancePath(editedProfile.id);
      // Normalize path separators for the platform
      const normalizedInstancePath = instancePath.replace(/\\/g, '/');
      const normalizedRelativePath = relativePath.replace(/\\/g, '/');
      const fullPath = `${normalizedInstancePath}/${normalizedRelativePath}`.replace(/\//g, '\\');
      
      logInfo(`Opening internal path for profile ${editedProfile.id}: ${fullPath}`);
      console.log('Opening internal path:', {
        instancePath,
        relativePath,
        fullPath
      });
      
      await openPath(fullPath);
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      logError(`Failed to open internal path for profile ${editedProfile.id}: ${errorMessage}. Path: ${relativePath}`);
      console.error("Failed to open internal path:", error);
      toast.error(t('symlinks.open_path_failed', { error: errorMessage }));
    }
  };

  if (isProfileRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <Lock size={18} strokeWidth={1.75} className="text-fg-3 mb-3" />
        <p className="text-[13px] text-fg-2">{t('symlinks.profile_running')}</p>
        <p className="text-[12px] text-fg-3 mt-1 select-none">
          {t('symlinks.stop_profile_to_manage')}
        </p>
      </div>
    );
  }

  return (
    <>
      {confirmDialog}
      <div className="space-y-8 overflow-x-hidden min-w-0 select-none">
        <SettingsSection title={t('symlinks.title')} description={t('symlinks.description')}>
          <SettingsRow
            label={t('symlink.add_new')}
            description={
              <>
                <ol className="list-decimal list-inside space-y-0.5 mt-1">
                  <li>{t('symlinks.step_1')}</li>
                  <li>{t('symlinks.step_2')}</li>
                  <li>{t('symlinks.step_3')}</li>
                </ol>
                <span className="block mt-1.5 text-fg-4">{t('symlinks.perfect_for')}</span>
              </>
            }
          >
            <Button
              onClick={openFolderPickerAndConfigure}
              variant="secondary"
              size="sm"
              icon={<Folder size={14} strokeWidth={1.75} />}
            >
              {t('symlinks.link_folder')}
            </Button>
            <Button
              onClick={openFilePickerAndConfigure}
              variant="secondary"
              size="sm"
              icon={<File size={14} strokeWidth={1.75} />}
            >
              {t('symlinks.link_file')}
            </Button>
          </SettingsRow>
        </SettingsSection>

        {/* Existing Symlinks */}
        <SettingsSection
          title={t('symlinks.active_symlinks')}
          aside={!loading && symlinks.length > 0 ? <span className="cc-num text-[11px] text-fg-3">{symlinks.length}</span> : undefined}
        >
          {loading ? (
            <div className="py-3.5 text-[12px] text-fg-3">{t('symlinks.loading')}</div>
          ) : symlinks.length === 0 ? (
            <div className="py-3.5 text-[12px] text-fg-3">{t('symlinks.no_symlinks')}</div>
          ) : (
            symlinks.map((symlink) => (
              <div
                key={symlink.link_path}
                className="group flex items-center gap-3 py-2.5 min-w-0"
              >
                <span
                  className="w-7 h-7 flex-shrink-0 grid place-items-center bg-s2 border border-line text-fg-3"
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  {symlink.is_directory ? <Folder size={14} strokeWidth={1.75} /> : <File size={14} strokeWidth={1.75} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="cc-num text-[12px] text-fg truncate min-w-0" title={symlink.link_path}>
                      {symlink.link_path}
                    </span>
                    <span className="cc-num text-[11px] text-fg-4 flex-shrink-0 whitespace-nowrap">
                      {symlink.link_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                    <ArrowRight size={11} strokeWidth={1.75} className="text-fg-4 flex-shrink-0" />
                    <span className="cc-num text-[11px] text-fg-3 truncate min-w-0" title={symlink.target_path}>
                      {symlink.target_path}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => openInternalPath(symlink.link_path)}
                    icon={<FolderOpen size={14} strokeWidth={1.75} />}
                    label={t('symlink.open_in_profile')}
                  />
                  <IconButton
                    variant="destructive"
                    size="sm"
                    onClick={() => removeSymlink(symlink.link_path)}
                    icon={<Trash2 size={14} strokeWidth={1.75} />}
                    label={t('symlink.remove_symlink')}
                  />
                </div>
              </div>
            ))
          )}
        </SettingsSection>
      </div>
    </>
  );
}
