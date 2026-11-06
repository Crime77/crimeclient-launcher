"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  FolderOpen,
  Lock,
  LockOpen,
  X,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/buttons/Button";
import { SettingsSection } from "../../ui/settings/SettingsSection";
import { SettingRow } from "../../ui/settings/SettingRow";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { openExternalUrl } from "../../../services/tauri-service";
import { LEGAL_DOCUMENT_URLS } from "../../../config/legal";
import type { LauncherConfig } from "../../../types/launcherConfig";
import { useSettingsConfig, useSettingsKeywords } from "./settings-context";

/** text fields of this tab: s2 with a hairline, mono because they hold paths and commands */
const FIELD =
  "w-full h-8 px-2.5 bg-s2 border border-line text-fg font-mono text-xs placeholder:text-fg-4 " +
  "outline-none focus:border-line-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed";

type HookKey = "pre_launch" | "wrapper" | "post_exit";

export function AdvancedTab() {
  const { t } = useTranslation();
  const kw = useSettingsKeywords();
  const { tempConfig, setTempConfig, saving } = useSettingsConfig();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [isHooksExpanded, setIsHooksExpanded] = useState(false);
  const [isPreLaunchEditEnabled, setIsPreLaunchEditEnabled] = useState(false);
  const [isWrapperEditEnabled, setIsWrapperEditEnabled] = useState(false);
  const [isPostExitEditEnabled, setIsPostExitEditEnabled] = useState(false);

  const hooks: { key: HookKey; enabled: boolean; setEnabled: (on: boolean) => void }[] = [
    { key: "pre_launch", enabled: isPreLaunchEditEnabled, setEnabled: setIsPreLaunchEditEnabled },
    { key: "wrapper", enabled: isWrapperEditEnabled, setEnabled: setIsWrapperEditEnabled },
    { key: "post_exit", enabled: isPostExitEditEnabled, setEnabled: setIsPostExitEditEnabled },
  ];

  return (
    <div className="space-y-8">
      <SettingsSection id="settings-section-login_cache" title={t("settings.sections.login_cache")} keywords={kw("settings.sections.login_cache", "login", "cache", "anmeldung")}>
        <SettingRow
          label={t("settings.browser_login")}
          description={t("settings.browser_login.tooltip")}
          searchKeywords={kw("settings.browser_login", "browser", "login", "anmeldung", "auth", "microsoft")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.use_browser_based_login || false}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, use_browser_based_login: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.cache_natives")}
          description={t("settings.cache_natives.tooltip")}
          searchKeywords={kw("settings.cache_natives", "cache", "natives", "extraction", "performance")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={tempConfig?.cache_natives_extraction ?? true}
            onChange={(checked) => tempConfig && setTempConfig({ ...tempConfig, cache_natives_extraction: checked })}
            disabled={saving}
            size="md"
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        id="settings-section-gamedir"
        title={t("settings.game_data_dir.title")}
        keywords={kw("settings.game_data_dir.title", "game", "data", "directory", "ordner", "verzeichnis", "pfad", "path", "folder")}
        description={t("settings.game_data_dir.description")}
      >
        <div className="flex items-center gap-2 py-3">
          <input
            type="text"
            value={tempConfig?.custom_game_directory || ""}
            placeholder={t("settings.game_data_dir.placeholder")}
            className={cn(FIELD, "flex-1")}
            style={{ borderRadius: "var(--r-md)" }}
            disabled={saving}
            readOnly
            title={tempConfig?.custom_game_directory || undefined}
          />
          {tempConfig?.custom_game_directory && (
            <Button
              variant="ghost"
              size="sm"
              className="!px-2 hover:!text-err"
              disabled={saving}
              onClick={() => {
                if (tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    custom_game_directory: null,
                  });
                }
              }}
              title={t("settings.game_data_dir.reset_tooltip")}
              aria-label={t("settings.game_data_dir.reset_tooltip")}
              icon={<X size={14} strokeWidth={1.75} />}
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={async () => {
              try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const directory = await open({
                  multiple: false,
                  directory: true,
                });

                if (directory && tempConfig) {
                  setTempConfig({
                    ...tempConfig,
                    custom_game_directory: directory,
                  });
                }
              } catch (error) {
                console.error('Fehler beim Ordner-Dialog:', error);
              }
            }}
            title={t("settings.game_data_dir.select_tooltip")}
            icon={<FolderOpen size={14} strokeWidth={1.75} />}
          >
            {t("settings.game_data_dir.select")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-section-hooks"
        title={t("settings.hooks.title")}
        keywords={kw("settings.hooks.title", "hook", "hooks", "script", "skript", "command", "befehl", "wrapper")}
        description={t("settings.hooks.description")}
        headerActions={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsHooksExpanded((v) => !v)}
            iconPosition="right"
            icon={
              <ChevronDown
                size={14}
                strokeWidth={1.75}
                className={cn("transition-transform duration-med", isHooksExpanded && "rotate-180")}
              />
            }
          >
            {isHooksExpanded ? t("settings.hooks.hide") : t("settings.hooks.show")}
          </Button>
        }
      >
        {isHooksExpanded && (
          <div className="pt-1">
            <div className="divide-y divide-line">
              {hooks.map(({ key, enabled, setEnabled }) => (
                <HookField
                  key={key}
                  hookKey={key}
                  editEnabled={enabled}
                  saving={saving}
                  tempConfig={tempConfig}
                  setTempConfig={setTempConfig}
                  onToggleEdit={async () => {
                    if (enabled) {
                      setEnabled(false);
                      return;
                    }
                    const confirmed = await confirm({
                      title: t(`settings.hooks.${key}.confirm_title`),
                      message: t(`settings.hooks.${key}.confirm_message`),
                      confirmText: t("common.enable"),
                      cancelText: t("common.cancel"),
                      type: "warning",
                      fullscreen: true,
                    });
                    if (confirmed) {
                      setEnabled(true);
                      toast.success(t(`settings.hooks.${key}.enabled`));
                    }
                  }}
                />
              ))}
            </div>

            <div
              className="mt-3 flex items-start gap-2.5 border border-warn/30 bg-warn/[0.06] px-3 py-2.5"
              style={{ borderRadius: "var(--r-md)" }}
            >
              <AlertTriangle size={14} strokeWidth={1.75} className="text-warn flex-shrink-0 mt-0.5" />
              <p className="text-xs text-fg-2 leading-relaxed">
                <span className="font-[560] text-warn">{t("settings.hooks.warning.title")}. </span>
                {t("settings.hooks.warning.description")}
              </p>
            </div>

            <div className="mt-3 border border-line px-3 py-2.5" style={{ borderRadius: "var(--r-md)" }}>
              <div className="cc-eyebrow mb-2">{t("settings.hooks.examples.title")}</div>
              <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-fg-3">Pre-Launch</dt>
                <dd className="font-mono text-fg-2">echo "Starting game..."</dd>
                <dt className="text-fg-3">Wrapper</dt>
                <dd className="font-mono text-fg-2">firejail <span className="text-fg-4 font-sans">/</span> gamemoderun</dd>
                <dt className="text-fg-3">Post-Exit</dt>
                <dd className="font-mono text-fg-2">notify-send "Game finished"</dd>
              </dl>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-section-licenses"
        title={t("settings.licenses.title")}
        keywords={kw("settings.licenses.title", "license", "licenses", "lizenz", "lizenzen", "credits")}
      >
        <SettingRow
          label={t("settings.licenses.row")}
          description={t("settings.licenses.description")}
          searchKeywords={kw("settings.licenses.title", "license", "lizenz", "gpl")}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              // GPL-3.0; the README credits the NoRisk launcher this is forked from
              openExternalUrl(LEGAL_DOCUMENT_URLS.licenses)
            }}
            iconPosition="right"
            icon={<ArrowUpRight size={14} strokeWidth={1.75} />}
          >
            {t("settings.licenses.view")}
          </Button>
        </SettingRow>
      </SettingsSection>

      {confirmDialog}
    </div>
  );
}

/** One game hook: title and what it does, the lock that guards editing, the command field. */
function HookField({
  hookKey,
  editEnabled,
  saving,
  tempConfig,
  setTempConfig,
  onToggleEdit,
}: {
  hookKey: HookKey;
  editEnabled: boolean;
  saving: boolean;
  tempConfig: LauncherConfig | null;
  setTempConfig: (config: LauncherConfig) => void;
  onToggleEdit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-4 mb-2.5">
        <div className="min-w-0">
          <div className="text-[13px] font-[560] text-fg">{t(`settings.hooks.${hookKey}.title`)}</div>
          <p className="text-xs text-fg-3 mt-0.5 leading-relaxed">{t(`settings.hooks.${hookKey}.description`)}</p>
        </div>
        <Button
          variant={editEnabled ? "secondary" : "ghost"}
          size="xs"
          onClick={onToggleEdit}
          icon={editEnabled ? <LockOpen size={13} strokeWidth={1.75} /> : <Lock size={13} strokeWidth={1.75} />}
        >
          {editEnabled ? t("settings.hooks.disable_editing") : t("settings.hooks.enable_editing")}
        </Button>
      </div>
      <input
        type="text"
        value={tempConfig?.hooks?.[hookKey] || ""}
        onChange={(e) => {
          if (tempConfig) {
            setTempConfig({
              ...tempConfig,
              hooks: {
                ...tempConfig.hooks,
                [hookKey]: e.target.value || null,
              },
            });
          }
        }}
        placeholder={t(`settings.hooks.${hookKey}.placeholder`)}
        className={FIELD}
        style={{ borderRadius: "var(--r-md)" }}
        disabled={saving || !editEnabled}
        title={!editEnabled ? t(`settings.hooks.${hookKey}.disabled_tooltip`) : undefined}
      />
    </div>
  );
}
