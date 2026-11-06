"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SearchStyleInput } from "../../ui/Input";
import { IconButton } from "../../ui/buttons/IconButton";
import { Check, Copy, FolderX, Loader2, Search, X } from "lucide-react";
import type { AccentColor } from "../../../store/useThemeStore";
import { cn } from "../../../lib/utils";
import { useProfileStore } from "../../../store/profile-store";

interface ModrinthQuickProfileProps {
  accentColor: AccentColor;
  projectTitle: string;
  versionNumber?: string;
  profileName: string;
  onProfileNameChange: (name: string) => void;
  error: string | null;
  isLoading?: boolean;

  selectedSourceProfileId: string | null;
  onSourceProfileChange: (profileId: string | null) => void;
}



export const ModrinthQuickProfile: React.FC<ModrinthQuickProfileProps> = ({
  accentColor,
  projectTitle,
  versionNumber,
  profileName,
  onProfileNameChange,
  error,
  isLoading = false,
  selectedSourceProfileId,
  onSourceProfileChange,
}) => {
  const { t } = useTranslation();
  const [showSourceSelectInput, setShowSourceSelectInput] = useState(false);
  const [profileSearchValue, setProfileSearchValue] = useState('');
  const [maxProfilesToShow, setMaxProfilesToShow] = useState(9);
  const { profiles: storeProfiles, loading: profilesLoading } =
    useProfileStore();



  const handleToggleCopySection = () => {
    if (selectedSourceProfileId) {
      onSourceProfileChange(null);
      setShowSourceSelectInput(false);
    } else {
      setShowSourceSelectInput(!showSourceSelectInput);
    }
  };

  const isActuallyCopying = selectedSourceProfileId !== null;

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!profileSearchValue.trim()) return storeProfiles;
    const searchTerm = profileSearchValue.toLowerCase().trim();
    return storeProfiles.filter(profile =>
      profile.name.toLowerCase().includes(searchTerm) ||
      profile.game_version?.toLowerCase().includes(searchTerm) ||
      profile.loader?.toLowerCase().includes(searchTerm) ||
      profile.loader_version?.toLowerCase().includes(searchTerm)
    );
  }, [storeProfiles, profileSearchValue]);

  // Reset maxProfilesToShow when search changes
  useEffect(() => {
    setMaxProfilesToShow(9);
  }, [profileSearchValue]);

  const displayedProfiles = filteredProfiles.slice(0, maxProfilesToShow);

  const handleLoadMoreProfiles = () => {
    setMaxProfilesToShow(prev => prev + 9);
  };

  return (
    <div
      className={cn(
        "space-y-3",
        isLoading && "opacity-70 pointer-events-none",
      )}
    >
      <div>
        <h3 className="text-[16px] leading-[1.3] font-[620] text-fg normal-case tracking-normal">
          {isActuallyCopying
            ? t('modrinth.quick_profile.copy_prefix')
            : t('modrinth.quick_profile.install_prefix')}
          <span className="text-fg">{projectTitle}</span>
          {versionNumber && (
            <span className="cc-num text-[13px] font-[450] text-fg-3"> v{versionNumber}</span>
          )}
          {isActuallyCopying
            ? t('modrinth.quick_profile.copy_suffix')
            : t('modrinth.quick_profile.install_suffix')}
        </h3>
        <p className="mt-1 text-[12.5px] text-fg-3">
          {isActuallyCopying
            ? t('modrinth.quick_profile.copy_description', {
                name:
                  storeProfiles.find((p) => p.id === selectedSourceProfileId)?.name ||
                  t('modrinth.quick_profile.selected_profile'),
              })
            : t('modrinth.quick_profile.description')}
        </p>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-grow">
          <label
            htmlFor="quickProfileNameInput"
            className="sr-only"
          >
            {t('modrinth.quick_profile.name_label')}
          </label>
          <SearchStyleInput
            id="quickProfileNameInput"
            value={profileName}
            onChange={(e) => onProfileNameChange(e.target.value)}
            placeholder={t('placeholders.new_profile_name')}
            icon="solar:user-bold"
            error={error || undefined}
            disabled={isLoading}
          />
        </div>
        <IconButton
          icon={
            isActuallyCopying ? (
              <X size={15} strokeWidth={1.75} />
            ) : (
              <Copy size={15} strokeWidth={1.75} />
            )
          }
          onClick={handleToggleCopySection}
          variant="ghost"
          size="md"
          disabled={isLoading}
          title={
            isActuallyCopying
              ? t('modrinth.quick_profile.clear_source')
              : t('modrinth.quick_profile.copy_from_existing')
          }
          className="flex-shrink-0"
        />
      </div>


      {(showSourceSelectInput || isActuallyCopying) && (
        <div className="pt-1 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="cc-eyebrow">
              {t('mods.quick_profile.source_label')}
            </span>
            <span className="cc-num text-[11px] text-fg-4">
              {t('mods.quick_profile.count', { count: filteredProfiles.length })}
            </span>
          </div>

          {profilesLoading ? (
            <div className="flex items-center gap-2 py-2 text-[12.5px] text-fg-3">
              <Loader2 size={14} className="animate-spin" />
              <span>{t('profiles.loadingProfiles')}</span>
            </div>
          ) : storeProfiles.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-[12.5px] text-warn">
              <FolderX size={14} strokeWidth={1.75} />
              <span>{t('profiles.no_profiles_available')}</span>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <label
                className="h-8 flex items-center gap-2 px-2.5 bg-s2 border border-line focus-within:border-line-3 transition-colors duration-fast"
                style={{ borderRadius: "var(--r-md)" }}
              >
                <Search size={13} strokeWidth={1.75} className="text-fg-3 flex-shrink-0" />
                <input
                  type="text"
                  value={profileSearchValue}
                  onChange={(e) => setProfileSearchValue(e.target.value)}
                  placeholder={t('placeholders.search_profiles')}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] text-fg placeholder:text-fg-4 outline-none"
                  disabled={isLoading}
                />
                {profileSearchValue && (
                  <button
                    type="button"
                    onClick={() => setProfileSearchValue('')}
                    className="text-fg-4 hover:text-fg transition-colors duration-fast"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                )}
              </label>

              {/* Profile list */}
              <div
                className="max-h-40 overflow-y-auto scrollbar-hover border border-line"
                style={{ borderRadius: "var(--r-md)" }}
              >
                {displayedProfiles.map((profile) => {
                  const selected = selectedSourceProfileId === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        onSourceProfileChange(profile.id);
                        setShowSourceSelectInput(true);
                      }}
                      disabled={isLoading}
                      className={cn(
                        "w-full h-8 flex items-center gap-2 px-2.5 text-left border-b border-line last:border-b-0 transition-colors duration-fast",
                        selected ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s2 hover:text-fg",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="flex-1 min-w-0 truncate text-[12.5px]" title={profile.name}>
                        {profile.name}
                      </span>
                      <span className="cc-num text-[11px] text-fg-4 flex-shrink-0">
                        {[profile.loader, profile.game_version].filter(Boolean).join(" ")}
                      </span>
                      <span className="w-3.5 flex-shrink-0">
                        {selected && <Check size={13} strokeWidth={2.25} className="text-fg" />}
                      </span>
                    </button>
                  );
                })}

                {filteredProfiles.length > maxProfilesToShow && (
                  <button
                    type="button"
                    onClick={handleLoadMoreProfiles}
                    disabled={isLoading}
                    className="w-full h-8 px-2.5 text-left text-[12px] text-fg-3 hover:text-fg hover:bg-s2 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('mods.quick_profile.more', { count: Math.min(9, filteredProfiles.length - maxProfilesToShow) })}
                  </button>
                )}

                {filteredProfiles.length === 0 && profileSearchValue && (
                  <div className="px-2.5 py-2 text-[12px] text-fg-3">
                    {t('profiles.noProfilesFound')}
                  </div>
                )}
              </div>
            </>
          )}

          {storeProfiles.length === 0 && !profilesLoading && (
            <p className="text-[12px] text-fg-3">
              {t('mods.quick_profile.no_source_hint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
