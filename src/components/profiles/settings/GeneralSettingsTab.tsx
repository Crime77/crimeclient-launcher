"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchStyleInput } from "../../ui/Input";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { gsap } from "gsap";
import { ProfileIcon } from "../ProfileIcon";
import { useMinecraftAuthStore } from "../../../store/minecraft-auth-store";
import { usePlayerAvatar } from "../../../hooks/usePlayerAvatar";
import type { MinecraftAccount } from "../../../types/minecraft";
import { cn } from "../../../lib/utils";
import { useTranslation } from "react-i18next";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "react-hot-toast";

interface GeneralSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onRefresh?: () => Promise<Profile>;
  onDelete?: () => void;
  isDeleting?: boolean;
}



export function GeneralSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  onRefresh,
  onDelete,
  isDeleting,
}: GeneralSettingsTabProps) {
  const { t } = useTranslation();
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const { accounts } = useMinecraftAuthStore();

  useEffect(() => {
    if (isBackgroundAnimationEnabled) {
      if (tabRef.current) {
        gsap.fromTo(
          tabRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
        );
      }

      if (formRef.current) {
        gsap.fromTo(
          formRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.2,
          },
        );
      }


    }
  }, [isBackgroundAnimationEnabled]);

  // Component for account avatar with caching
  function AccountAvatar({ account }: { account: MinecraftAccount }) {
    const avatarUrl = usePlayerAvatar({
      uuid: account.id,
      overlay: true,
    });

    if (!avatarUrl) {
      return null;
    }

    return (
      <img
        src={avatarUrl}
        alt={account.username}
        className="w-full h-full object-cover pixelated"
        style={{ imageRendering: 'pixelated' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  const handleAccountSelect = (accountId: string | null) => {
    updateProfile({ preferred_account_id: accountId });
  };

  const handleCopyProfileId = async () => {
    try {
      await writeText(profile.id);
      toast.success(t('profiles.settings.profileIdCopied'));
    } catch (e) {
      console.error("Failed to copy profile ID:", e);
    }
  };

  return (
    <div ref={tabRef} className="select-none">
      <div ref={formRef} className="space-y-8">
        <SettingsSection title={t('profiles.settings.general')}>
          <SettingsRow label={t('profiles.settings.profileName')}>
            <div className="flex items-center gap-2.5 w-[320px]">
              <ProfileIcon
                profileId={profile.id}
                banner={profile.banner}
                profileName={profile.name}
                accentColor="var(--fg-3)"
                onSuccessfulUpdate={async () => {
                  try {
                    if (onRefresh) {
                      await onRefresh();
                    }
                  } catch (error) {
                    console.error("Failed to refresh profile after icon update:", error);
                  }
                }}
                className="w-9 h-9 flex-shrink-0"
              />
              <SearchStyleInput
                value={editedProfile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder={t('profiles.settings.enterProfileName')}
                className="flex-1"
                disabled={profile.is_standard_version ? true : false}
              />
            </div>
          </SettingsRow>

          <SettingsRow label={t('profiles.settings.group')}>
            <div className="w-[320px]">
              <SearchStyleInput
                value={editedProfile.group || ""}
                onChange={(e) => updateProfile({ group: e.target.value || null })}
                placeholder={t('placeholders.group_name')}
                disabled={profile.is_standard_version ? true : false}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label={t('profiles.settings.useSharedFolder')}
            description={
              <>
                {t('profiles.settings.sharedFolderDescription')}
                <span className="block text-fg-4">{t('profiles.settings.canChangeAnytime')}</span>
              </>
            }
          >
            <ToggleSwitch
              checked={editedProfile.use_shared_minecraft_folder ?? false}
              onChange={(newValue) => {
                updateProfile({
                  use_shared_minecraft_folder: newValue
                });
              }}
            />
          </SettingsRow>

          <SettingsRow
            label={t('profiles.settings.quickPlayPath')}
            description={t('profiles.settings.quickPlayDescription')}
          >
            <div className="w-[320px]">
              <SearchStyleInput
                value={editedProfile.settings.quick_play_path || ""}
                onChange={(e) =>
                  updateProfile({
                    settings: {
                      ...editedProfile.settings,
                      quick_play_path: e.target.value || null
                    }
                  })
                }
                placeholder={t('profiles.settings.quickPlayPlaceholder')}
                className="font-mono text-[12px]"
              />
            </div>
          </SettingsRow>

          <div ref={accountRef}>
            <SettingsRow
              stacked
              label={t('profiles.settings.preferredAccount')}
              description={t('profiles.settings.preferredAccountDescription')}
            >
              {accounts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account) => {
                    const isSelected = editedProfile.preferred_account_id === account.id;

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => handleAccountSelect(isSelected ? null : account.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "h-9 flex items-center gap-2 pl-1.5 pr-2.5 border text-[13px] transition-colors duration-fast",
                          isSelected
                            ? "bg-s3 border-line-3 text-fg"
                            : "bg-s2 border-line text-fg-2 hover:bg-s3 hover:border-line-2 hover:text-fg",
                        )}
                        style={{ borderRadius: "var(--r-md)" }}
                        title={`${account.username} (${account.id})`}
                      >
                        <span className="w-6 h-6 flex-shrink-0 overflow-hidden bg-s4" style={{ borderRadius: "var(--r-sm)" }}>
                          <AccountAvatar account={account} />
                        </span>
                        <span className="max-w-[140px] truncate font-[520]">{account.username}</span>
                        {isSelected && <Check size={14} strokeWidth={2} className="text-fg-2 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[12px] text-fg-3">
                  {t('profiles.settings.noAccountsFound')}
                </div>
              )}
            </SettingsRow>
          </div>
        </SettingsSection>

        {/* Profile ID — discreet, click to copy */}
        <button
          type="button"
          onClick={handleCopyProfileId}
          title={t('profiles.settings.copyProfileId')}
          className="group flex items-center gap-1.5 text-fg-4 hover:text-fg-2 transition-colors duration-fast"
        >
          <Copy size={12} strokeWidth={1.75} />
          <span className="cc-num text-[11px]">
            {profile.id}
          </span>
        </button>
      </div>
    </div>
  );
}
