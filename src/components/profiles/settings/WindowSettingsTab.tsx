"use client";

import { useEffect, useRef } from "react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { SearchStyleInput } from "../../ui/Input";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils";
import { useTranslation } from "react-i18next";

interface WindowSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function WindowSettingsTab({
  editedProfile,
  updateProfile,
}: WindowSettingsTabProps) {
  const { t } = useTranslation();
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);
  const resolutionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBackgroundAnimationEnabled) {
      if (tabRef.current) {
        gsap.fromTo(
          tabRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
        );
      }

      if (resolutionRef.current) {
        gsap.fromTo(
          resolutionRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            delay: 0.2,
          },
        );
      }
    }
  }, [isBackgroundAnimationEnabled]);

  const resolutionPresets = [
    { width: 854, height: 480, label: "Default" },
    { width: 1280, height: 720, label: "720p" },
    { width: 1920, height: 1080, label: "1080p" },
    { width: 2560, height: 1440, label: "1440p" },
    { width: 3840, height: 2160, label: "4k" },
  ];

  const handleResolutionChange = (width: number, height: number) => {
    const newSettings = { ...editedProfile.settings };
    if (!newSettings.resolution) {
      newSettings.resolution = { width, height };
    } else {
      newSettings.resolution.width = width;
      newSettings.resolution.height = height;
    }
    updateProfile({ settings: newSettings });
  };

  const handleFullscreenChange = (fullscreen: boolean) => {
    const newSettings = { ...editedProfile.settings };
    newSettings.fullscreen = fullscreen;
    updateProfile({ settings: newSettings });
  };

  const handlePresetClick = (preset: { width: number; height: number }) => {
    if (isBackgroundAnimationEnabled) {
      gsap.fromTo(
        `.preset-${preset.width}x${preset.height}`,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.3,
          ease: "elastic.out(1.2, 0.4)",
        },
      );
    }

    handleResolutionChange(preset.width, preset.height);
  };

  const currentWidth = editedProfile.settings?.resolution?.width || 854;
  const currentHeight = editedProfile.settings?.resolution?.height || 480;

  return (
    <div ref={tabRef} className="select-none">
      <div ref={resolutionRef}>
        <SettingsSection
          title={t('profiles.settings.windowSettings')}
          description={t('profiles.settings.windowDescription')}
        >
          <SettingsRow label={t('profiles.settings.resolution')}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-fg-3">{t('profiles.settings.width')}</span>
              <div className="w-[84px]">
                <SearchStyleInput
                  type="number"
                  aria-label={t('profiles.settings.width')}
                  value={String(currentWidth)}
                  onChange={(e) => {
                    const width = Number.parseInt(e.target.value) || 854;
                    handleResolutionChange(
                      width,
                      editedProfile.settings?.resolution?.height || 480,
                    );
                  }}
                  className="cc-num text-[12px]"
                />
              </div>
              <span className="text-fg-4 text-[12px]">×</span>
              <span className="text-[11px] text-fg-3">{t('profiles.settings.height')}</span>
              <div className="w-[84px]">
                <SearchStyleInput
                  type="number"
                  aria-label={t('profiles.settings.height')}
                  value={String(currentHeight)}
                  onChange={(e) => {
                    const height = Number.parseInt(e.target.value) || 480;
                    handleResolutionChange(
                      editedProfile.settings?.resolution?.width || 854,
                      height,
                    );
                  }}
                  className="cc-num text-[12px]"
                />
              </div>
            </div>
          </SettingsRow>

          <SettingsRow label={t('profiles.settings.resolutionPresets')}>
            <div
              className="flex items-center gap-0.5 p-0.5 bg-s2 border border-line"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {resolutionPresets.map((preset) => {
                const isSelected =
                  editedProfile.settings?.resolution?.width === preset.width &&
                  editedProfile.settings?.resolution?.height === preset.height;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isSelected}
                    title={`${preset.width} × ${preset.height}`}
                    className={cn(
                      "h-7 px-2.5 text-[12px] transition-colors duration-fast preset-${preset.width}x${preset.height}",
                      isSelected ? "bg-s4 text-fg font-[560]" : "text-fg-2 hover:text-fg hover:bg-s3",
                    )}
                    style={{ borderRadius: "var(--r-sm)" }}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label === "Default" ? t('profiles.settings.resolutionDefault') : preset.label}
                  </button>
                );
              })}
            </div>
          </SettingsRow>

          <SettingsRow label={t('profiles.settings.fullscreen')}>
            <ToggleSwitch
              checked={editedProfile.settings?.fullscreen || false}
              onChange={(checked) => handleFullscreenChange(checked)}
            />
          </SettingsRow>
        </SettingsSection>
      </div>
    </div>
  );
}
