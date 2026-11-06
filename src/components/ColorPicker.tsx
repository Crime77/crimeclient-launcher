"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { ACCENT_COLORS, useThemeStore } from "../store/useThemeStore";
import { Button } from "./ui/buttons/Button";
import { Input } from "./ui/Input";

interface ColorPickerProps {
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
  showCustomOption?: boolean;
  disabled?: boolean;
}

const HEX = /^#[0-9A-F]{6}$/i;

/** Dark check on light swatches, light check on dark ones. */
function checkColorOn(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number.parseInt(v, 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.36 ? "#141416" : "#ffffff";
}

/** Accent swatches: small flat squares with a hairline, a check on the chosen one. */
export function ColorPicker({
  shape = "square",
  size = "md",
  showCustomOption = true,
  disabled = false,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const { accentColor, setAccentColor, setCustomAccentColor, customColorHistory } = useThemeStore();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#4f8eff");
  const [invalid, setInvalid] = useState(false);

  const px = size === "sm" ? 18 : size === "lg" ? 28 : 22;
  const radius = shape === "circle" ? "9999px" : "var(--r-sm)";

  const handleCustomColorSubmit = () => {
    if (HEX.test(customColor)) {
      setCustomAccentColor(customColor);
      setShowCustomPicker(false);
    } else {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 500);
    }
  };

  const swatch = (value: string, selected: boolean, onClick: () => void, label: string, small = false) => (
    <button
      key={label + value}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "group relative flex items-center justify-center flex-shrink-0 transition-[box-shadow,opacity] duration-fast ease-out",
        "outline-none focus-visible:ring-1 focus-visible:ring-line-3 focus-visible:ring-offset-2 focus-visible:ring-offset-s1",
        selected && "ring-1 ring-fg/60 ring-offset-2 ring-offset-s1",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      )}
      style={{ width: small ? px - 4 : px, height: small ? px - 4 : px, borderRadius: radius, backgroundColor: value }}
    >
      {/* the hairline sits inside the colour so every swatch has the same edge */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 border border-white/[0.14] transition-colors duration-fast",
          !disabled && !selected && "group-hover:border-white/30",
        )}
        style={{ borderRadius: radius }}
      />
      {selected && <Check size={small ? 11 : 13} strokeWidth={2.5} style={{ color: checkColorOn(value) }} />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-flow-row gap-1.5" style={{ gridTemplateColumns: `repeat(9, ${px}px)` }}>
        {Object.values(ACCENT_COLORS).map((color) =>
          swatch(
            color.value,
            accentColor.value === color.value,
            () => !disabled && setAccentColor(color),
            color.name,
          ),
        )}

        {showCustomOption && (
          <button
            type="button"
            onClick={() => !disabled && setShowCustomPicker(!showCustomPicker)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center bg-s3 border border-line-2 text-fg-3 hover:text-fg hover:border-line-3 transition-colors duration-fast",
              accentColor.isCustom && "ring-1 ring-fg/60 ring-offset-2 ring-offset-s1",
              disabled && "opacity-40 cursor-not-allowed",
            )}
            style={{ width: px, height: px, borderRadius: radius }}
            aria-label={t("settings.accent_color.custom")}
            title={t("settings.accent_color.custom")}
          >
            <Plus size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {showCustomPicker && (
        <div className="p-3 bg-s2 border border-line space-y-3" style={{ borderRadius: "var(--r-md)" }}>
          <div className="cc-eyebrow">{t("settings.accent_color.custom")}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setInvalid(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomColorSubmit();
                }}
                placeholder="#RRGGBB"
                className={cn("font-mono", invalid && "!border-err/60")}
                style={invalid ? { animation: "shake 0.5s ease-in-out" } : undefined}
              />
            </div>
            <span
              className={cn("w-8 h-8 flex-shrink-0 border", HEX.test(customColor) ? "border-line-2" : "border-err/60")}
              style={{ backgroundColor: HEX.test(customColor) ? customColor : "transparent", borderRadius: "var(--r-sm)" }}
              title={customColor}
            />
            <Button onClick={handleCustomColorSubmit} size="sm" variant="secondary" icon={<Check size={14} strokeWidth={1.75} />}>
              {t("color_picker.button.apply")}
            </Button>
          </div>

          {customColorHistory.length > 0 && (
            <div className="pt-3 border-t border-line">
              <div className="cc-eyebrow mb-2">{t("color_picker.recent")}</div>
              <div className="flex flex-wrap gap-1.5">
                {customColorHistory.map((historyColor) =>
                  swatch(
                    historyColor,
                    accentColor.value === historyColor,
                    () => {
                      setCustomColor(historyColor);
                      setCustomAccentColor(historyColor);
                    },
                    historyColor,
                    true,
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
