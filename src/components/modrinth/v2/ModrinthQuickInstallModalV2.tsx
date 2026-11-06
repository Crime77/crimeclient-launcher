"use client";

import React, { useState, useEffect } from 'react';
import type {
  ModrinthSearchHit,
  ModrinthVersion,
} from '../../../types/modrinth';
import type { UnifiedVersion } from '../../../types/unified';
import { AlertTriangle, ArrowLeft, Check, Copy, Download, FolderPlus, HardDrive, Loader2, Trash2, X, Zap } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/buttons/Button';
import { useThemeStore } from '../../../store/useThemeStore'; // For accent color on Installed button
import { cn } from '../../../lib/utils';
import { ModrinthQuickProfile } from './ModrinthQuickProfile'; // New import
// Potentially import Profile type if available and not 'any'
// import type { Profile } from '../../../types/profile';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ModrinthQuickInstallModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  project: ModrinthSearchHit | null;
  versions: UnifiedVersion[] | null;
  isLoading: boolean;
  error: string | null;
  profiles: any[]; // Replace 'any' with actual Profile type
  selectedProfileId?: string | null; // For highlighting
  installStatus: Record<string, boolean>;
  installingProfiles: Record<string, boolean>;
  onInstallToProfile: (profileId: string) => void;
  onUninstallClick?: (profileId: string, project: ModrinthSearchHit, version: UnifiedVersion) => Promise<void>;
  findBestVersionForProfile: (
    profile: any, // Replace 'any' with Profile type
    versions: UnifiedVersion[],
  ) => UnifiedVersion | null;
  onInstallToNewProfile: (
    profileName: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
    sourceProfileIdToCopy: string | null, // Added
  ) => Promise<void>;
}

export const ModrinthQuickInstallModalV2: React.FC<ModrinthQuickInstallModalV2Props> = ({
  isOpen,
  onClose,
  project,
  versions,
  isLoading,
  error,
  profiles,
  selectedProfileId,
  installStatus,
  installingProfiles,
  onInstallToProfile,
  onUninstallClick,
  findBestVersionForProfile,
  onInstallToNewProfile,
}) => {
  const { t } = useTranslation();
  const accentColor = useThemeStore((state) => state.accentColor); // Moved hook to the top
  const [showQuickProfileView, setShowQuickProfileView] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [quickProfileName, setQuickProfileName] = useState('');
  const [quickProfileError, setQuickProfileError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<'success' | 'error' | null>(null); // New state
  const [lastCreationErrorMessage, setLastCreationErrorMessage] = useState<string | null>(null); // New state for creation error
  const [sourceProfileToCopyId, setSourceProfileToCopyId] = useState<string | null>(null); // New state for copy

  useEffect(() => {
    if (!isOpen) {
      setShowQuickProfileView(false);
      setIsCreatingProfile(false);
      setQuickProfileName('');
      setQuickProfileError(null);
      setCreationResult(null); // Reset on close
      setLastCreationErrorMessage(null); // Reset on close
      setSourceProfileToCopyId(null); // Reset on close
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const switchToQuickProfileView = () => {
    setQuickProfileName(''); // Ensure name is empty when switching
    setQuickProfileError(null);
    setCreationResult(null); // Clear previous result
    setSourceProfileToCopyId(null); // Reset for fresh start
    setShowQuickProfileView(true);
  };

  const switchToProfileListView = () => {
    setShowQuickProfileView(false);
    setQuickProfileName('');
    setQuickProfileError(null);
    setCreationResult(null); // Clear previous result
  };

  const handleCreateAndInstallProfile = async () => {
    if (!quickProfileName.trim()) {
      setQuickProfileError(t('modrinth.profile_name_empty'));
      return;
    }
    setQuickProfileError(null);
    setLastCreationErrorMessage(null);

    if (!project || !versions || versions.length === 0) { // Guard clause
        toast.error(t('modrinth.errors.missing_data'));
        setCreationResult('error'); // Set error state if essential data is missing
        setLastCreationErrorMessage(t('modrinth.errors.missing_data'));
        return;
    }
    const versionToInstall = versions[0];
    if (!versionToInstall) {
        toast.error(t('modrinth.errors.no_suitable_version'));
        setCreationResult('error');
        setLastCreationErrorMessage(t('modrinth.errors.no_suitable_version'));
        return;
    }

    setIsCreatingProfile(true);
    try {
      await onInstallToNewProfile(quickProfileName.trim(), project, versionToInstall, sourceProfileToCopyId);
      setCreationResult('success');
    } catch (err: any) {
      console.error("Error in handleCreateAndInstallProfile (quick install):", err);
      setCreationResult('error');
      setLastCreationErrorMessage(err?.message || t('modrinth.unknown_error'));
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const spinner = <Loader2 size={13} className="animate-spin" />;

  const modalContent = (
    <>
      {showQuickProfileView && project ? (
        <ModrinthQuickProfile
          accentColor={accentColor}
          projectTitle={project.title}
          versionNumber={versions && versions.length > 0 ? versions[0].version_number : undefined}
          profileName={quickProfileName}
          onProfileNameChange={(name) => {
            setQuickProfileName(name);
            if (quickProfileError && name.trim()) setQuickProfileError(null);
          }}
          error={quickProfileError}
          isLoading={isCreatingProfile}
          selectedSourceProfileId={sourceProfileToCopyId}
          onSourceProfileChange={setSourceProfileToCopyId}
        />
      ) : isLoading ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-fg-3">
          <Loader2 size={15} className="animate-spin" />
          <span>{t('modrinth.finding_compatible_versions')}</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-err">
          <AlertTriangle size={15} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      ) : versions && versions.length > 0 ? (
        <div>
          <p className="text-[12.5px] text-fg-3 mb-3">
            {t('modrinth.quick_install_description')}
          </p>

          <div
            className="max-h-72 overflow-y-auto custom-scrollbar border border-line"
            style={{ borderRadius: "var(--r-md)" }}
          >
            {profiles.length > 0 ? (
              [...profiles]
                .sort((a, b) => {
                  if (a.id === selectedProfileId) return -1;
                  if (b.id === selectedProfileId) return 1;
                  return 0;
                })
                .map((profile) => {
                  const bestVersion = findBestVersionForProfile(
                    profile,
                    versions,
                  );
                  const isCompatible = !!bestVersion;

                  return (
                    <div
                      key={profile.id}
                      className={cn(
                        "h-12 px-3 border-b border-line last:border-b-0 flex justify-between items-center gap-3 transition-colors duration-fast",
                        profile.id === selectedProfileId ? "bg-s2" : "hover:bg-s2",
                      )}
                    >
                      <div className="flex-grow min-w-0">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className={cn("text-[13px] font-[520] truncate", isCompatible ? "text-fg" : "text-fg-3")}>
                            {profile.name}
                          </span>
                          {profile.id === selectedProfileId && (
                            <span className="text-[11px] text-fg-3 flex-shrink-0">
                              {t('modrinth.current_profile')}
                            </span>
                          )}
                        </div>
                        <div className="cc-num text-[11px] text-fg-4 truncate mt-px">
                          {[profile.loader, profile.game_version].filter(Boolean).join(" ")}
                          {isCompatible && bestVersion && (
                            <span className="text-fg-3"> · {bestVersion.version_number}</span>
                          )}
                        </div>
                      </div>

                      {installingProfiles[profile.id] ? (
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled
                          icon={spinner}
                          iconPosition="left"
                          className="flex-shrink-0 min-w-[96px]"
                        >
                          {t('modrinth.installing')}
                        </Button>
                      ) : installStatus[profile.id] && bestVersion && onUninstallClick ? (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 px-1.5 text-[12px] text-fg-2">
                            <Check size={13} strokeWidth={2.25} className="text-ok" />
                            {t('common.installed')}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (project && bestVersion) {
                                try {
                                  await onUninstallClick(profile.id, project, bestVersion);
                                } catch (err) {
                                  console.error("Uninstall from quick modal failed:", err);
                                }
                              }
                            }}
                            className="cc-icon-btn hover:text-err"
                            title={t('common.uninstall')}
                            aria-label={t('common.uninstall')}
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </span>
                      ) : !isCompatible ? (
                        <span className="inline-flex items-center gap-1 px-1.5 text-[12px] text-fg-4 flex-shrink-0">
                          <X size={13} strokeWidth={2} />
                          {t('modrinth.not_compatible')}
                        </span>
                      ) : (
                        <Button
                          onClick={() => onInstallToProfile(profile.id)}
                          disabled={installingProfiles[profile.id]}
                          size="xs"
                          variant="secondary"
                          icon={installingProfiles[profile.id] ? spinner : <Download size={13} strokeWidth={1.75} />}
                          iconPosition="left"
                          className="flex-shrink-0 min-w-[96px]"
                        >
                          {installingProfiles[profile.id] ? t('modrinth.installing') : t('modrinth.install')}
                        </Button>
                      )}
                    </div>
                  );
                })
            ) : (
              <p className="px-3 py-4 text-[12.5px] text-fg-3">
                {t('modrinth.no_profiles_available')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 text-[13px] text-fg-3">
          {t('modrinth.no_versions_found')}
        </div>
      )}
    </>
  );

  const handleModalClose = () => {
    setShowQuickProfileView(false); 
    setIsCreatingProfile(false);
    setQuickProfileName('');
    setQuickProfileError(null);
    setCreationResult(null); // Reset creation result
    setLastCreationErrorMessage(null);
    setSourceProfileToCopyId(null);
    onClose();
  };

  let modalContentLayout;

  if (creationResult === 'success') {
    modalContentLayout = (
      <div className="flex items-start gap-3 py-2">
        <Check size={18} strokeWidth={2} className="text-ok flex-shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-[14px] font-[600] text-fg normal-case tracking-normal">
            {sourceProfileToCopyId ? t('modrinth.profile_copied_installed') : t('modrinth.profile_created_installed')}
          </h3>
          <p className="text-[12.5px] text-fg-2">
            {t('modrinth.install_success_message', { title: project.title, version: versions?.[0]?.version_number || 'latest', profile: quickProfileName.trim() })}
            {sourceProfileToCopyId && profiles.find(p => p.id === sourceProfileToCopyId) && (
              <>
                <br />
                {t('modrinth.settings_copied_from', { source: profiles.find(p => p.id === sourceProfileToCopyId)?.name })}
              </>
            )}
          </p>
        </div>
      </div>
    );
  } else if (creationResult === 'error') {
    modalContentLayout = (
      <div className="flex items-start gap-3 py-2">
        <AlertTriangle size={18} strokeWidth={1.75} className="text-err flex-shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-[14px] font-[600] text-fg normal-case tracking-normal">{t('modrinth.operation_failed')}</h3>
          <p className="text-[12.5px] text-err">
            {lastCreationErrorMessage || t('modrinth.error_creating_or_installing')}
          </p>
        </div>
      </div>
    );
  } else {
    modalContentLayout = modalContent;
  }

  const titleIconProps = { size: 16, strokeWidth: 1.75 } as const;

  return (
    <Modal
      title={
        creationResult ?
          (creationResult === 'success' ? t('modrinth.operation_successful') : t('modrinth.operation_failed')) :
        showQuickProfileView ?
          (sourceProfileToCopyId ? t('modrinth.copy_profile_install_title', { title: project.title }) : t('modrinth.new_profile_for', { title: project.title })) :
          t('modrinth.quick_install_title', { title: project.title })
      }
      titleIcon={
        creationResult ?
          (creationResult === 'success' ? <Check {...titleIconProps} /> : <AlertTriangle {...titleIconProps} />) :
        showQuickProfileView ?
          (sourceProfileToCopyId ? <Copy {...titleIconProps} /> : <FolderPlus {...titleIconProps} />) :
          <Zap {...titleIconProps} />
      }
      onClose={handleModalClose}
      width="md"
      footer={
        <div className="flex justify-between items-center w-full gap-2">
          {creationResult ? (
            <div className="w-full flex justify-end">
              <Button onClick={handleModalClose} variant="secondary" size="sm">
                {t('common.close')}
              </Button>
            </div>
          ) : showQuickProfileView ? (
            <>
              <Button
                variant="ghost"
                onClick={switchToProfileListView}
                disabled={isCreatingProfile}
                size="sm"
                icon={<ArrowLeft size={14} strokeWidth={1.75} />}
                className="mr-auto"
              >
                {t('modrinth.back_to_profiles')}
              </Button>
              <Button
                variant="default"
                onClick={handleCreateAndInstallProfile}
                disabled={isCreatingProfile || !quickProfileName.trim()}
                size="sm"
                icon={isCreatingProfile ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} strokeWidth={1.75} />}
              >
                {isCreatingProfile ? (sourceProfileToCopyId ? t('modrinth.copying') : t('modrinth.creating')) : (sourceProfileToCopyId ? t('modrinth.copy_and_install') : t('modrinth.create_and_install'))}
              </Button>
            </>
          ) : (
            // Footer for profile list view (or initial loading/error states)
            <>
              { !isLoading && !error && versions && versions.length > 0 ? (
                <Button
                  variant="ghost"
                  onClick={switchToQuickProfileView}
                  icon={<FolderPlus size={14} strokeWidth={1.75} />}
                  size="sm"
                  className="mr-auto"
                >
                  {t('modrinth.new_profile')}
                </Button>
              ) : <div className="mr-auto"></div> }
              <Button
                onClick={handleModalClose}
                variant="secondary"
                size="sm"
              >
                {t('common.close')}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="px-5 py-4">
        {modalContentLayout}
      </div>
    </Modal>
  );
};
