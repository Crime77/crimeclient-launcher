"use client";

import React, { useMemo, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { ArrowLeft, Check, Download, FolderPlus, FolderX, Loader2, Trash2 } from 'lucide-react';
import type { ModrinthSearchHit, ModrinthVersion } from '../../../types/modrinth';
import type { UnifiedVersion } from '../../../types/unified';
import type { Profile } from '../../../types/profile';
import { ProfileIconV2 } from '../../profiles/ProfileIconV2';
import { useThemeStore } from '../../../store/useThemeStore';
import { SearchWithFilters } from '../../ui/SearchWithFilters';
import type { DropdownOption } from '../../ui/CustomDropdown';
import { ModrinthQuickProfile } from './ModrinthQuickProfile';
import { Button } from '../../ui/buttons/Button';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { loaderIconSrc } from "../../../lib/loader-icons";

/**
 * Universal Profiles Modal for Modrinth Installation
 *
 * This modal supports both installation modes:
 * 1. Quick Install (legacy): Uses onProfileSelect callback
 * 2. Specific Version Install (new): Uses onInstallToProfile and onUninstallClick callbacks
 *
 * Usage Examples:
 *
 * // Quick Install Mode (compatible with existing usage)
 * <ModrinthQuickInstallProfilesModal
 *   project={project}
 *   profiles={profiles}
 *   onProfileSelect={(project, profile) => installToProfile(project, profile)}
 *   onProfileClick={(profile) => navigateToProfile(profile)}
 *   onClose={() => closeModal()}
 *   installingProfiles={installing}
 *   installStatus={status}
 * />
 *
 * // Specific Version Mode (compatible with ModrinthInstallModalV2)
 * <ModrinthQuickInstallProfilesModal
 *   project={project}
 *   version={selectedVersion}
 *   profiles={profiles}
 *   onInstallToProfile={(profileId) => installVersionToProfile(profileId)}
 *   onUninstallClick={(profileId, project, version) => uninstallFromProfile(profileId, project, version)}
 *   onProfileClick={(profile) => navigateToProfile(profile)}
 *   onClose={() => closeModal()}
 *   installingProfiles={installing}
 *   installStatus={status}
 * />
 */

interface ModrinthQuickInstallProfilesModalProps {
  project: ModrinthSearchHit;
  profiles: Profile[];
  // Legacy format for quick install (without specific version)
  onProfileSelect?: (project: ModrinthSearchHit, profile: Profile) => void;
  // New format for specific version install (compatible with ModrinthInstallModalV2)
  onInstallToProfile?: (profileId: string) => void;
  onUninstallClick?: (profileId: string, project: ModrinthSearchHit, version: UnifiedVersion) => Promise<void>;
  onInstallToNewProfile?: (
    profileName: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
    sourceProfileIdToCopy?: string | null
  ) => Promise<void>;
  onProfileClick?: (profile: Profile) => void;
  onClose: () => void;
  installingProfiles?: Record<string, boolean>;
  uninstallingProfiles?: Record<string, boolean>;
  installStatus?: Record<string, boolean>;
  // Optional version for specific version install
  version?: UnifiedVersion | null;
}

export function ModrinthQuickInstallProfilesModal({
  project,
  profiles,
  onProfileSelect,
  onInstallToProfile,
  onUninstallClick,
  onInstallToNewProfile,
  onProfileClick,
  onClose,
  installingProfiles = {},
  uninstallingProfiles = {},
  installStatus = {},
  version,
}: ModrinthQuickInstallProfilesModalProps) {
  const { t } = useTranslation();
  const { profilesTabSortBy, setProfilesTabSortBy, accentColor } = useThemeStore();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState(profilesTabSortBy);

  // States for profile creation view
  const [showQuickProfileView, setShowQuickProfileView] = useState(false);
  const [quickProfileName, setQuickProfileName] = useState('');
  const [quickProfileError, setQuickProfileError] = useState<string | null>(null);
  const [selectedSourceProfileId, setSelectedSourceProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Debug logging
  console.log('🎯 Modal rendered with:', {
    project: project.title,
    version: version?.version_number || 'latest',
    profilesCount: profiles.length,
    installStatus,
    installingProfiles,
    uninstallingProfiles,
    hasUninstallSupport: !!onUninstallClick,
    hasNewInstallFormat: !!onInstallToProfile
  });

  const handleProfileCardClick = (profile: Profile) => {
    // Navigate to profile page when clicking on the profile card
    if (onProfileClick) {
      onProfileClick(profile);
    }
  };

  const handleInstallClick = (profile: Profile) => {
    if (onInstallToProfile) {
      // New format: specific version install (compatible with ModrinthInstallModalV2)
      onInstallToProfile(profile.id);
    } else if (onProfileSelect) {
      // Legacy format: quick install without specific version
      onProfileSelect(project, profile);
    }
  };

  const handleUninstallClick = async (profile: Profile) => {
    if (onUninstallClick && version) {
      await onUninstallClick(profile.id, project, version);
    }
  };

  // Navigation functions
  const switchToQuickProfileView = () => {
    setQuickProfileName(''); // Set to empty string
    setQuickProfileError(null);
    setSelectedSourceProfileId(null);
    setShowQuickProfileView(true);
  };

  const switchToProfileListView = () => {
    setShowQuickProfileView(false);
    setQuickProfileName('');
    setQuickProfileError(null);
    setSelectedSourceProfileId(null);
  };

  // Handle profile creation with promise toast
  const handleCreateAndInstallProfile = async () => {
    if (!quickProfileName.trim()) {
      setQuickProfileError(t('modrinth.profile_name_empty'));
      return;
    }
    setQuickProfileError(null);

    setIsCreatingProfile(true);

    const profileNameToCreate = quickProfileName.trim();
    const createPromise = onInstallToNewProfile!(profileNameToCreate, project, version, selectedSourceProfileId);

    try {
      await toast.promise(createPromise, {
        loading: selectedSourceProfileId
          ? t('modrinth.creating_profile_copying', { name: profileNameToCreate, title: project.title })
          : t('modrinth.creating_profile_installing', { name: profileNameToCreate, title: project.title }),
        success: (result) => {
          console.log('✅ New profile created successfully');
          // Close the modal after successful profile creation
          onClose();
          return selectedSourceProfileId
            ? t('modrinth.profile_copy_success', { name: profileNameToCreate, title: project.title })
            : t('modrinth.profile_create_success', { name: profileNameToCreate, title: project.title });
        },
        error: (error) => {
          console.error('❌ Failed to create new profile:', error);
          setQuickProfileError(error instanceof Error ? error.message : t('modrinth.profile_create_failed'));
          return t('modrinth.profile_create_error', { error: error instanceof Error ? error.message : t('modrinth.unknown_error') });
        }
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSortChange = (value: string) => {
    setSortValue(value);
    setProfilesTabSortBy(value);
  };

  // Sort and filter profiles
  const processedProfiles = useMemo(() => {
    let filtered = [...profiles];

    // Filter by search term
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      filtered = filtered.filter(profile =>
        profile.name.toLowerCase().includes(searchTerm) ||
        profile.game_version?.toLowerCase().includes(searchTerm) ||
        profile.loader?.toLowerCase().includes(searchTerm) ||
        profile.loader_version?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort profiles
    switch (sortValue) {
      case 'last_played':
        return filtered.sort((a, b) => {
          const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
          const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
          return bTime - aTime; // Most recent first
        });

      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));

      case 'game_version':
        return filtered.sort((a, b) => {
          // Sort by Minecraft version - try to parse version numbers
          const aVersion = a.game_version || '';
          const bVersion = b.game_version || '';

          // Simple version comparison (this could be improved with proper semver)
          return aVersion.localeCompare(bVersion, undefined, { numeric: true });
        });

      case 'loader':
        return filtered.sort((a, b) => {
          // Sort by loader, then by name as secondary sort
          const loaderCompare = (a.loader || '').localeCompare(b.loader || '');
          if (loaderCompare !== 0) return loaderCompare;
          return a.name.localeCompare(b.name);
        });

      case 'created':
        return filtered.sort((a, b) => {
          const aTime = a.created ? new Date(a.created).getTime() : 0;
          const bTime = b.created ? new Date(b.created).getTime() : 0;
          return bTime - aTime; // Most recent first
        });

      default:
        // Default to last_played if unknown sort option
        return filtered.sort((a, b) => {
          const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
          const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
          return bTime - aTime;
        });
    }
  }, [profiles, searchValue, sortValue]);

  // Sort options for the dropdown
  const sortOptions: DropdownOption[] = [
    { value: 'last_played', label: t('profiles.sort.lastPlayed'), icon: 'solar:clock-circle-bold' },
    { value: 'name', label: t('profiles.sort.name'), icon: 'solar:text-bold' },
    { value: 'game_version', label: t('profiles.sort.mcVersion'), icon: 'solar:gamepad-bold' },
    { value: 'loader', label: t('profiles.sort.loader'), icon: 'solar:settings-bold' },
    { value: 'created', label: t('profiles.sort.dateCreated'), icon: 'solar:calendar-bold' },
  ];

  const getModLoaderIcon = (profile: Profile) => loaderIconSrc(profile.loader);

  // Format last played date - simplified version from ProfileCardV2.tsx
  const formatLastPlayed = (lastPlayed: string | null): string => {
    if (!lastPlayed) return t('profiles.card.neverPlayed');

    const date = new Date(lastPlayed);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMinutes < 1) return t('profiles.card.justNow');
    if (diffInMinutes < 60) return t('profiles.card.minutesAgo', { count: diffInMinutes });
    if (diffInHours < 24) return t('profiles.card.hoursAgo', { count: diffInHours });
    if (diffInDays < 7) return t('profiles.card.daysAgo', { count: diffInDays });
    if (diffInWeeks < 4) return t('profiles.card.weeksAgo', { count: diffInWeeks });
    if (diffInMonths < 12) return t('profiles.card.monthsAgo', { count: diffInMonths });

    return t('profiles.card.yearsAgo', { count: Math.floor(diffInDays / 365) });
  };

  const isActuallyCopying = selectedSourceProfileId !== null;

  return (
    <Modal
      title={
        showQuickProfileView
          ? (isActuallyCopying ? t('modrinth.copy_and_install_title', { title: project.title }) : t('modrinth.new_profile_for', { title: project.title }))
          : (version ? t('modrinth.install_title_version', { title: project.title, version: version.version_number }) : t('modrinth.install_title', { title: project.title }))
      }
      onClose={onClose}
      width="md"
      variant="3d"
      footer={
        showQuickProfileView ? (
          <div className="flex justify-between items-center w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={14} strokeWidth={1.75} />}
              onClick={() => {
                console.log('⬅️ Switching back to profile list view');
                switchToProfileListView();
              }}
            >
              {t('modrinth.back_to_profiles')}
            </Button>

            <Button
              variant="default"
              size="sm"
              icon={isCreatingProfile ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={1.75} />}
              disabled={!quickProfileName.trim() || isCreatingProfile}
              onClick={() => {
                console.log('✅ Creating profile and installing');
                handleCreateAndInstallProfile();
              }}
            >
              {isCreatingProfile ? t('modrinth.creating') : t('modrinth.create_and_install')}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end items-center w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                console.log('❌ Closing modal');
                onClose();
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        )
      }
    >
      <div className="px-5 py-4">
        {showQuickProfileView ? (
          // Quick Profile Creation View
          <ModrinthQuickProfile
            accentColor={accentColor}
            projectTitle={project.title}
            versionNumber={version?.version_number}
            profileName={quickProfileName}
            onProfileNameChange={(name) => {
              setQuickProfileName(name);
              if (quickProfileError && name.trim()) setQuickProfileError(null);
            }}
            error={quickProfileError}
            isLoading={isCreatingProfile}
            selectedSourceProfileId={selectedSourceProfileId}
            onSourceProfileChange={setSelectedSourceProfileId}
          />
        ) : (
          <>
            {/* Version info (placed above search) */}
            {version && (
              <p className="text-[12.5px] text-fg-3 mb-3">
                {t('modrinth.will_install_version', { version: version.version_number, title: project.title })}
              </p>
            )}

            {/* Search and Filters */}
            <div className="mb-3 flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <SearchWithFilters
                  placeholder={t('placeholders.search_profiles')}
                  searchValue={searchValue}
                  onSearchChange={handleSearchChange}
                  sortOptions={sortOptions}
                  sortValue={sortValue}
                  onSortChange={handleSortChange}
                  showFilter={false}
                  className="w-full"
                />
              </div>
              {onInstallToNewProfile && (
                <Button
                  variant="secondary"
                  size="md"
                  icon={<FolderPlus size={14} strokeWidth={1.75} />}
                  onClick={() => {
                    console.log('🆕 Switching to quick profile creation view');
                    switchToQuickProfileView();
                  }}
                >
                  {t('profiles.new_profile')}
                </Button>
              )}
            </div>

            {processedProfiles.length === 0 ? (
              <div className="min-h-[320px] flex flex-col items-center justify-center gap-2 text-center">
                <FolderX size={20} strokeWidth={1.5} className="text-fg-4" />
                <h3 className="text-[13px] font-[560] text-fg-2 normal-case tracking-normal">
                  {profiles.length === 0 ? t('modrinth.no_profiles_available') : t('modrinth.no_profiles_found')}
                </h3>
                <p className="text-[12.5px] text-fg-3">
                  {profiles.length === 0
                    ? t('modrinth.create_profile_first')
                    : t('modrinth.adjust_search_filters')
                  }
                </p>
              </div>
            ) : (
              <div
                className="min-h-[320px] max-h-[420px] overflow-y-auto custom-scrollbar border border-line"
                style={{ borderRadius: "var(--r-md)" }}
              >
                {processedProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => handleProfileCardClick(profile)}
                    className={cn(
                      "group h-12 flex items-center gap-3 px-3 border-b border-line last:border-b-0 hover:bg-s2 transition-colors duration-fast",
                      onProfileClick && "cursor-pointer",
                    )}
                  >
                    {/* Profile Icon */}
                    <div
                      className="w-8 h-8 flex-shrink-0 overflow-hidden"
                      style={{ borderRadius: "var(--r-sm)" }}
                    >
                      <ProfileIconV2 profile={profile} size="sm" className="w-full h-full" />
                    </div>

                    {/* Profile Info */}
                    <div className="flex-grow min-w-0">
                      <div className="text-[13px] font-[520] text-fg truncate" title={profile.name}>
                        {profile.name}
                      </div>

                      {/* Profile Details */}
                      <div className="flex items-center gap-1.5 cc-num text-[11px] text-fg-4 min-w-0 mt-px">
                        <span className="text-fg-3">{profile.game_version}</span>
                        <span>·</span>
                        <img
                          src={getModLoaderIcon(profile)}
                          alt=""
                          className="w-3 h-3 object-contain opacity-70"
                        />
                        <span className="truncate">
                          {profile.loader === "vanilla"
                            ? t('common.vanilla')
                            : profile.loader_version || profile.loader
                          }
                        </span>
                        <span>·</span>
                        <span className="truncate">{formatLastPlayed(profile.last_played)}</span>
                      </div>
                    </div>

                    {/* Install/Uninstall Button */}
                    {(() => {
                      const isInstalling = installingProfiles[profile.id];
                      const isUninstalling = uninstallingProfiles[profile.id];
                      const isInstalled = installStatus[profile.id];
                      const canUninstall = onUninstallClick && version && isInstalled && !isUninstalling && !isInstalling;

                      console.log(`🔘 Button for ${profile.name}:`, { isInstalling, isUninstalling, isInstalled, canUninstall });

                      if (isUninstalling) {
                        // Show uninstalling state with spinner
                        return (
                          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 text-[12px] text-fg-3">
                            <Loader2 size={13} className="animate-spin" />
                            {t('modrinth.uninstalling')}
                          </span>
                        );
                      } else if (canUninstall) {
                        // Installed: label plus a quiet uninstall control
                        return (
                          <span className="flex-shrink-0 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 text-[12px] text-fg-2">
                              <Check size={13} strokeWidth={2.25} className="text-ok" />
                              {t('modrinth.installed')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('🗑️ Starting uninstallation for:', profile.name);
                                handleUninstallClick(profile);
                              }}
                              disabled={isInstalling || isUninstalling}
                              className="cc-icon-btn hover:text-err"
                              title={t('common.uninstall')}
                              aria-label={t('common.uninstall')}
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          </span>
                        );
                      } else if (isInstalled) {
                        return (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 text-[12px] text-fg-2">
                            <Check size={13} strokeWidth={2.25} className="text-ok" />
                            {t('modrinth.installed')}
                          </span>
                        );
                      } else {
                        // Show install button (original logic)
                        return (
                          <Button
                            variant="secondary"
                            size="xs"
                            className="flex-shrink-0 min-w-[96px]"
                            icon={isInstalling ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} strokeWidth={1.75} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isInstalling && !isInstalled) {
                                console.log('🚀 Starting installation for:', profile.name);
                                handleInstallClick(profile);
                              } else {
                                console.log('⏳ Cannot install - already installing or installed:', profile.name);
                              }
                            }}
                            disabled={isInstalling || isInstalled}
                          >
                            {isInstalling ? t('modrinth.installing') : t('modrinth.install')}
                          </Button>
                        );
                      }
                    })()}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
