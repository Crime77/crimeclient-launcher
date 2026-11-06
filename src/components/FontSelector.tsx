"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { Check, PenLine } from "lucide-react";
import { cn } from "../lib/utils";
import { DEFAULT_FONT_ID, FONT_PRESETS } from "../config/fonts";
import { CUSTOM_FONT_ID, useFontStore } from "../store/font-store";
import { Combobox } from "./ui/Combobox";

interface FontSelectorProps {
  disabled?: boolean;
}

const COMMON_FONTS = [
  "Arial", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas",
  "Constantia", "Corbel", "Courier New", "Georgia", "Impact", "Lucida Console",
  "Palatino Linotype", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS",
  "Verdana", "Inter", "Roboto", "Open Sans", "monospace", "serif", "sans-serif",
];

/** what every tile writes in its own font */
const SAMPLE = "Aa Gg 0123";

/** Font presets as text samples: each tile is set in the font it picks. */
export function FontSelector({ disabled }: FontSelectorProps) {
  const { t } = useTranslation();
  const { fontId, setFont, customFamily, setCustomFamily } = useFontStore();
  const presets = Object.values(FONT_PRESETS);
  const isCustom = fontId === CUSTOM_FONT_ID;

  const [fonts, setFonts] = useState<string[]>(COMMON_FONTS);

  useEffect(() => {
    if (!isCustom) return;
    invoke<string[]>("list_system_fonts")
      .then((list) => {
        if (Array.isArray(list) && list.length) setFonts(list);
      })
      .catch((err) => console.warn("[FontSelector] list_system_fonts failed:", err));
  }, [isCustom]);

  const tileClass = (selected: boolean) =>
    cn(
      "relative flex flex-col gap-2 min-w-0 px-3 pt-2.5 pb-3 text-left border transition-colors duration-fast ease-out",
      selected ? "border-line-3 bg-s2" : "border-line hover:border-line-2 hover:bg-s2",
      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
    );

  const head = (name: string, selected: boolean, isDefault = false) => (
    <span className="flex items-center gap-2 h-4">
      <span className={cn("text-xs font-[520] truncate", selected ? "text-fg" : "text-fg-2")}>{name}</span>
      {isDefault && <span className="text-[11px] text-fg-4">{t("settings.font.default")}</span>}
      {selected && <Check size={13} strokeWidth={2} className="ml-auto text-fg flex-shrink-0" />}
    </span>
  );

  const customStyle = customFamily?.trim() ? { fontFamily: `"${customFamily}", sans-serif` } : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => {
          const isSelected = fontId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (!disabled) setFont(preset.id);
              }}
              disabled={disabled}
              aria-pressed={isSelected}
              className={tileClass(isSelected)}
              style={{ borderRadius: "var(--r-md)" }}
            >
              {head(preset.name, isSelected, preset.id === DEFAULT_FONT_ID)}
              <span
                className={cn("block truncate text-[20px] leading-6", isSelected ? "text-fg" : "text-fg-2")}
                style={{ fontFamily: preset.preview, fontStretch: preset.displayStretch ?? "100%" }}
              >
                {SAMPLE}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            if (!disabled) setFont(CUSTOM_FONT_ID);
          }}
          disabled={disabled}
          aria-pressed={isCustom}
          className={tileClass(isCustom)}
          style={{ borderRadius: "var(--r-md)" }}
        >
          {head(customFamily?.trim() ? customFamily : t("settings.font.custom"), isCustom)}
          {customStyle ? (
            <span
              className={cn("block truncate text-[20px] leading-6", isCustom ? "text-fg" : "text-fg-2")}
              style={customStyle}
            >
              {SAMPLE}
            </span>
          ) : (
            <span className="flex items-center gap-2 h-6 text-[13px] text-fg-3">
              <PenLine size={14} strokeWidth={1.75} />
              {t("settings.font.custom_hint")}
            </span>
          )}
        </button>
      </div>

      {isCustom && (
        <div className="flex flex-col gap-1.5 max-w-sm">
          <Combobox
            value={customFamily}
            onChange={setCustomFamily}
            options={fonts}
            disabled={disabled}
            allowClear
            placeholder={t("settings.font.custom_placeholder")}
            inputStyle={customStyle}
            optionStyle={(f) => ({ fontFamily: `"${f}", sans-serif` })}
          />
          <span className="text-[11px] text-fg-3">
            {t("settings.font.available", { count: fonts.length })}
          </span>
        </div>
      )}
    </div>
  );
}
