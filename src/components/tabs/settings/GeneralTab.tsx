"use client";

import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Select } from "../../ui/Select";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { RangeSlider } from "../../ui/RangeSlider";
import { SettingsSection } from "../../ui/settings/SettingsSection";
import { SettingRow } from "../../ui/settings/SettingRow";
import { useThemeStore } from "../../../store/useThemeStore";
import { usePermission } from "../../../hooks/usePermission";
import { PERMISSION } from "../../../constants/permissions";
import { LANGUAGE_OPTIONS, type SupportedLanguage } from "../../../i18n";
import { useSettingsConfig, useSettingsKeywords } from "./settings-context";
import { isWindows } from "../../../utils/platform";

/** Language, launcher behaviour and download limits. Accent colour and corners live under Appearance. */
export function GeneralTab() {
  const { t } = useTranslation();
  const kw = useSettingsKeywords();
  const { config, tempConfig, setTempConfig, saving } = useSettingsConfig();
  const { language, setLanguage } = useThemeStore();

  const canShowExperimental =
    usePermission(PERMISSION.EXPERIMENTAL_MODE) ||
    !!tempConfig?.is_experimental ||
    !!config?.is_experimental;

  const handleConcurrentDownloadsChange = (value: number) => {
    if (tempConfig) setTempConfig({ ...tempConfig, concurrent_downloads: value });
  };
  const handleConcurrentIoLimitChange = (value: number) => {
    if (tempConfig) setTempConfig({ ...tempConfig, concurrent_io_limit: value });
  };

  return (
    <div className="space-y-8">
      <SettingsSection
        id="settings-section-language"
        title={t("settings.language")}
        keywords={kw("settings.language", "sprache", "language", "locale")}
      >
        <SettingRow
          label={t("settings.language")}
          description={t("settings.language.description")}
          searchKeywords={kw("settings.language", "sprache", "locale")}
        >
          <div className="w-48">
            <Select
              value={language}
              onChange={(value) => setLanguage(value as SupportedLanguage)}
              options={LANGUAGE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
                icon: <Icon icon={opt.flag} className="w-4 h-4" />,
              }))}
              size="sm"
              variant="flat"
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection id="settings-section-behaviour" title={t("settings.sections.behaviour")} keywords={kw("settings.sections.behaviour", "behaviour", "behavior", "verhalten")}>
        <SettingRow
          label={t("settings.auto_updates")}
          description={t("settings.auto_updates.tooltip")}
          searchKeywords={kw("settings.auto_updates", "update", "updates", "aktualisierung")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.auto_check_updates || false}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, auto_check_updates: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        {isWindows() && (
          <SettingRow
            label={t("settings.clips.enabled")}
            description={t("settings.clips.enabled.short")}
            searchKeywords={kw(
              "settings.clips.enabled",
              "clips",
              "clip",
              "replay",
              "aufnahme",
              "record",
              "highlight",
            )}
            disabled={saving}
          >
            <ToggleSwitch
              checked={tempConfig?.clips?.enabled || false}
              onChange={(checked) =>
                tempConfig &&
                setTempConfig({
                  ...tempConfig,
                  clips: { ...tempConfig.clips, enabled: checked },
                })
              }
              disabled={saving}
              size="md"
            />
          </SettingRow>
        )}
        <SettingRow
          label={t("settings.discord_presence")}
          description={t("settings.discord_presence.tooltip")}
          searchKeywords={kw("settings.discord_presence", "discord", "presence", "status", "rich")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.enable_discord_presence || false}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, enable_discord_presence: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        {/* no beta channel: CrimeClient has one update feed (latest.json) */}
        {canShowExperimental && (
          <SettingRow
            label={t("settings.experimental_mode")}
            description={t("settings.experimental_mode.tooltip")}
            searchKeywords={kw("settings.experimental_mode", "experimental", "experimentell", "beta")}
            disabled={saving}
          >
            <ToggleSwitch
              checked={tempConfig?.is_experimental || false}
              onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, is_experimental: checked })}
              disabled={saving}
              size="md"
            />
          </SettingRow>
        )}
        <SettingRow
          label={t("settings.open_logs")}
          description={t("settings.open_logs.tooltip")}
          searchKeywords={kw("settings.open_logs", "logs", "log", "protokoll")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.open_logs_after_starting || false}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, open_logs_after_starting: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.hide_window")}
          description={t("settings.hide_window.tooltip")}
          searchKeywords={kw("settings.hide_window", "window", "fenster", "hide", "verstecken", "minimize")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.hide_on_process_start || false}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, hide_on_process_start: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection id="settings-section-interface" title={t("settings.sections.downloads")} keywords={kw("settings.sections.downloads", "downloads", "interface", "oberfläche", "performance")}>
        <SettingRow
          label={t("settings.concurrent_downloads")}
          description={t("settings.concurrent_downloads.tooltip")}
          searchKeywords={kw("settings.concurrent_downloads", "download", "downloads", "herunterladen", "parallel")}
          disabled={saving}
        >
          <div className="w-60">
            <RangeSlider
              value={tempConfig?.concurrent_downloads || 3}
              onChange={handleConcurrentDownloadsChange}
              min={1}
              max={10}
              step={1}
              disabled={saving}
              variant="flat"
              size="sm"
              minLabel="1"
              maxLabel="10"
            />
          </div>
        </SettingRow>
        <SettingRow
          label={t("settings.concurrent_io")}
          description={t("settings.concurrent_io.tooltip")}
          searchKeywords={kw("settings.concurrent_io", "io", "disk", "parallel", "festplatte")}
          disabled={saving}
        >
          <div className="w-60">
            <RangeSlider
              value={tempConfig?.concurrent_io_limit || 10}
              onChange={handleConcurrentIoLimitChange}
              min={1}
              max={20}
              step={1}
              disabled={saving}
              variant="flat"
              size="sm"
              minLabel="1"
              maxLabel="20"
            />
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
