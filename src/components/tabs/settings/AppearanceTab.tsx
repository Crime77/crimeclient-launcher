"use client";

import { useTranslation } from "react-i18next";
import { FolderOpen, Palette, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { RangeSlider } from "../../ui/RangeSlider";
import { SnowEffectToggle } from "../../ui/SnowEffectToggle";
import { SettingsSection } from "../../ui/settings/SettingsSection";
import { SettingRow } from "../../ui/settings/SettingRow";
import { ThemeSelector } from "../../ThemeSelector";
import { FontSelector } from "../../FontSelector";
import { ColorPicker } from "../../ColorPicker";
import { ColorPickerModal } from "../../modals/ColorPickerModal";
import EffectPreviewCard from "../../EffectPreviewCard";
import {
  MAX_BORDER_RADIUS,
  MIN_BORDER_RADIUS,
  useThemeStore,
} from "../../../store/useThemeStore";
import { BACKGROUND_EFFECTS, useBackgroundEffectStore } from "../../../store/background-effect-store";
import { useQualitySettingsStore } from "../../../store/quality-settings-store";
import { useSnowEffectStore } from "../../../store/snow-effect-store";
import { useGlobalModal } from "../../../hooks/useGlobalModal";
import { useLauncherTheme } from "../../../hooks/useLauncherTheme";
import { isWebGLAvailable } from "@noriskclient/nrc-skin-renderer";
import { useSettingsConfig, useSettingsKeywords } from "./settings-context";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "../../ui/buttons/Button";

type Level = "low" | "medium" | "high";

/** Low / medium / high as a segmented control: s2 track, s3 on the chosen one. */
function LevelSegments({
  value,
  onChange,
  disabled,
}: {
  value: Level;
  onChange: (level: Level) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const levels: { id: Level; label: string }[] = [
    { id: "low", label: t("settings.background.quality_low") },
    { id: "medium", label: t("settings.background.quality_medium") },
    { id: "high", label: t("settings.background.quality_high") },
  ];
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex h-8 p-0.5 gap-0.5 bg-s2 border border-line", disabled && "opacity-45 pointer-events-none")}
      style={{ borderRadius: "var(--r-md)" }}
    >
      {levels.map((level) => (
        <button
          key={level.id}
          type="button"
          role="radio"
          aria-checked={value === level.id}
          onClick={() => onChange(level.id)}
          className={cn(
            "px-3 text-xs font-[520] transition-colors duration-fast ease-out",
            value === level.id ? "bg-s3 text-fg" : "text-fg-3 hover:text-fg-2",
          )}
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

/** the file name of a picked background, without its folders */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function AppearanceTab() {
  const { t } = useTranslation();
  const kw = useSettingsKeywords();
  const { saving } = useSettingsConfig();
  const {
    staticBackground,
    toggleStaticBackground,
    toggleBackgroundAnimation,
    accentColor,
    borderRadius,
    setBorderRadius,
  } = useThemeStore();
  const {
    currentEffect, setCurrentEffect,
    customMediaUrl, customMediaOpacity, customMediaBlur, customMediaQuality, customMediaOnlyOnPlay, customMediaHideEffects,
    setCustomMedia, setCustomMediaOpacity, setCustomMediaBlur, setCustomMediaQuality, setCustomMediaOnlyOnPlay, setCustomMediaHideEffects
  } = useBackgroundEffectStore();
  const webglOk = isWebGLAvailable();
  const { qualityLevel, setQualityLevel, cosmeticRenderer3d, setCosmeticRenderer3d } =
    useQualitySettingsStore();
  const snowEnabled = useSnowEffectStore((s) => s.isEnabled);
  const { showModal, hideModal } = useGlobalModal();
  const { isThemeActive } = useLauncherTheme();
  const isAccentColorDisabled = isThemeActive;

  const backgroundOptions = [
    { id: BACKGROUND_EFFECTS.NONE, name: t("settings.background.calm") },
    { id: BACKGROUND_EFFECTS.GRID, name: t("settings.background.grid") },
  ];

  const openColorPicker = () => {
    if (isAccentColorDisabled) return;
    showModal(
      "color-picker-modal",
      <ColorPickerModal onClose={() => hideModal("color-picker-modal")} />,
    );
  };

  return (
    <div className="space-y-8">
      <SettingsSection
        id="settings-section-accent"
        title={t("settings.accent_color.title")}
        keywords={kw("settings.accent_color.title", "color", "colour", "farbe", "akzent", "accent", "theme")}
        description={
          <>
            {t("settings.accent_color.description")}
            {isThemeActive && <span className="text-fg-2 ml-1.5">{t("settings.accent_color.disabled_theme")}</span>}
          </>
        }
      >
        <SettingRow
          label={t("settings.accent_color.preset")}
          searchKeywords={kw("settings.accent_color.preset", "color", "farbe", "akzent")}
          disabled={isAccentColorDisabled}
        >
          <ColorPicker shape="square" size="md" showCustomOption={false} disabled={isAccentColorDisabled} />
        </SettingRow>
        <SettingRow
          label={t("settings.accent_color.custom_row")}
          description={t("settings.accent_color.custom_description")}
          searchKeywords={kw("settings.accent_color.custom_row", "hex", "custom", "eigene")}
          disabled={isAccentColorDisabled}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={openColorPicker}
            disabled={isAccentColorDisabled}
            title={
              isAccentColorDisabled
                ? t("settings.accent_color.custom_tooltip_disabled")
                : t("settings.accent_color.custom_tooltip")
            }
            icon={
              <span
                className="w-3.5 h-3.5 border border-white/[0.14]"
                style={{ backgroundColor: accentColor.value, borderRadius: 3 }}
              />
            }
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-fg-2">{accentColor.value}</span>
              <Palette size={14} strokeWidth={1.75} className="text-fg-3" />
            </span>
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        id="settings-section-theme"
        title={t("settings.theme.title")}
        keywords={kw("settings.theme.title", "color", "colour", "farbe", "theme", "thema", "design", "skin", "aussehen")}
      >
        <SettingRow
          label={t("settings.theme.row")}
          description={t("settings.theme.description")}
          searchKeywords={kw("settings.theme.title", "theme", "thema", "weihnachten", "christmas")}
        >
          <ThemeSelector />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        id="settings-section-font"
        title={t("settings.font.title")}
        keywords={kw("settings.font.title", "font", "schrift", "schriftart", "typography", "typografie", "text")}
        description={t("settings.font.description")}
      >
        <div className="pt-2 pb-1">
          <FontSelector disabled={saving} />
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-section-ui"
        title={t("settings.sections.ui")}
        keywords={kw("settings.sections.ui", "interface", "oberfläche", "ecken", "radius", "animation")}
      >
        <SettingRow
          label={t("settings.border_radius")}
          description={t("settings.border_radius.tooltip")}
          searchKeywords={kw("settings.border_radius", "border", "rand", "ecken", "eckenradius", "corner", "radius", "rounding", "rundung")}
          disabled={saving}
        >
          <div className="w-60">
            <RangeSlider
              value={borderRadius}
              onChange={setBorderRadius}
              min={MIN_BORDER_RADIUS}
              max={MAX_BORDER_RADIUS}
              step={1}
              disabled={saving}
              variant="flat"
              size="sm"
              unit="px"
              minLabel={`${MIN_BORDER_RADIUS}px`}
              maxLabel={`${MAX_BORDER_RADIUS}px`}
            />
          </div>
        </SettingRow>
        <SettingRow
          label={t("settings.background.animations")}
          description={t("settings.background.animations.description")}
          searchKeywords={kw("settings.background.animations", "animation", "animationen", "motion")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={!staticBackground}
            onChange={() => {
              toggleStaticBackground();
              toggleBackgroundAnimation();
            }}
            disabled={saving}
            size="md"
          />
        </SettingRow>
        <SettingRow
          label={t("settings.background.skin_animation")}
          description={webglOk ? t("settings.background.skin_animation.description") : t("webgl.unavailable")}
          searchKeywords={kw("settings.background.skin_animation", "skin", "animation", "cape", "3d")}
          disabled={saving}
        >
          <ToggleSwitch
            checked={cosmeticRenderer3d && webglOk}
            onChange={() => setCosmeticRenderer3d(!cosmeticRenderer3d)}
            disabled={saving || !webglOk}
            size="md"
          />
        </SettingRow>
        {/* "Sidebar labels" is gone: the navigation always shows its labels now */}
      </SettingsSection>

      <SettingsSection
        id="settings-section-background"
        title={t("settings.background.title")}
        keywords={kw("settings.background.title", "color", "colour", "farbe", "hintergrund", "background", "effekt", "effect", "raster", "grid")}
        description={t("settings.background.description")}
      >
        <div className="grid grid-cols-2 gap-2 max-w-[420px] pt-2 pb-3">
          {backgroundOptions.map((option) => (
            <EffectPreviewCard
              key={option.id}
              effectId={option.id}
              name={option.name}
              isActive={currentEffect === option.id}
              onClick={() => setCurrentEffect(option.id)}
            />
          ))}
        </div>
        <SettingRow
          label={t("settings.background.snow")}
          searchKeywords={kw("settings.background.snow", "snow", "schnee", "winter")}
          disabled={saving}
        >
          <SnowEffectToggle showLabel={false} size="md" disabled={saving} />
        </SettingRow>
        {/* the quality only changes the snow now; the animated effects it tuned are gone */}
        {snowEnabled && (
          <SettingRow
            label={t("settings.background.snow_amount")}
            searchKeywords={kw("settings.background.quality", "quality", "qualität", "snow", "schnee", "fps")}
            disabled={saving}
          >
            <LevelSegments value={qualityLevel} onChange={setQualityLevel} disabled={saving} />
          </SettingRow>
        )}
      </SettingsSection>

      <SettingsSection
        id="settings-section-custom-background"
        title={t("settings.custom_background.title")}
        keywords={kw("settings.custom_background.title", "custom", "background", "video", "image", "bild", "hintergrund", "mp4", "gif")}
      >
        <SettingRow
          label={t("settings.custom_background.file")}
          description={
            customMediaUrl ? (
              <span className="font-mono text-[11px] text-fg-2 break-all" title={customMediaUrl}>
                {fileName(customMediaUrl)}
              </span>
            ) : (
              t("settings.custom_background.description")
            )
          }
          searchKeywords={kw("settings.custom_background.select", "select", "auswählen", "datei")}
        >
          <div className="flex items-center gap-2">
            {customMediaUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomMedia(null, null)}
                icon={<Trash2 size={14} strokeWidth={1.75} />}
              >
                {t("settings.custom_background.clear")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const selected = await open({
                  multiple: false,
                  filters: [{
                    name: 'Media',
                    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm']
                  }]
                });
                if (selected && typeof selected === 'string') {
                  const ext = selected.split('.').pop()?.toLowerCase();
                  const type = ext === 'mp4' || ext === 'webm' ? 'video' : 'image';
                  setCustomMedia(selected, type);
                }
              }}
              icon={<FolderOpen size={14} strokeWidth={1.75} />}
            >
              {customMediaUrl ? t("settings.custom_background.change") : t("settings.custom_background.select")}
            </Button>
          </div>
        </SettingRow>

        {customMediaUrl && (
          <>
            <SettingRow label={t("settings.custom_background.opacity")} searchKeywords={kw("settings.custom_background.opacity", "opacity", "transparenz", "sichtbarkeit")}>
              <div className="w-60">
                <RangeSlider
                  value={Math.round(customMediaOpacity * 100)}
                  onChange={(value) => setCustomMediaOpacity(value / 100)}
                  min={0}
                  max={100}
                  step={1}
                  variant="flat"
                  size="sm"
                  unit="%"
                  minLabel="0%"
                  maxLabel="100%"
                />
              </div>
            </SettingRow>

            <SettingRow label={t("settings.custom_background.blur")} searchKeywords={kw("settings.custom_background.blur", "blur", "unscharf", "weichzeichnen")}>
              <div className="w-60">
                <RangeSlider
                  value={customMediaBlur}
                  onChange={setCustomMediaBlur}
                  min={0}
                  max={20}
                  step={1}
                  variant="flat"
                  size="sm"
                  unit="px"
                  minLabel="0"
                  maxLabel="20"
                />
              </div>
            </SettingRow>

            <SettingRow label={t("settings.background.quality")} searchKeywords={kw("settings.background.quality", "quality", "qualität", "performance", "leistung", "fps")}>
              <LevelSegments value={customMediaQuality} onChange={setCustomMediaQuality} />
            </SettingRow>

            <SettingRow label={t("settings.custom_background.only_on_play")} searchKeywords={kw("settings.custom_background.only_on_play", "play", "tab", "only")}>
              <ToggleSwitch checked={customMediaOnlyOnPlay} onChange={() => setCustomMediaOnlyOnPlay(!customMediaOnlyOnPlay)} size="md" />
            </SettingRow>

            <SettingRow label={t("settings.custom_background.hide_effects")} searchKeywords={kw("settings.custom_background.hide_effects", "hide", "effects", "effekte")}>
              <ToggleSwitch checked={customMediaHideEffects} onChange={() => setCustomMediaHideEffects(!customMediaHideEffects)} size="md" />
            </SettingRow>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
