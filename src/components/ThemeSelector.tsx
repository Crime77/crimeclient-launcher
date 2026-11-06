"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import { useLauncherTheme } from "../hooks/useLauncherTheme";
import { LAUNCHER_THEMES } from "../store/launcher-theme-store";
import { SimpleTooltip } from "./ui/Tooltip";
import { getLauncherConfig } from "../services/launcher-config-service";

interface ThemeSelectorProps {
  disabled?: boolean;
}

/** Launcher themes as compact options: colour chip, name, a lock while it is not unlocked. */
export function ThemeSelector({ disabled }: ThemeSelectorProps) {
  const { t } = useTranslation();
  const [debugFlag, setDebugFlag] = useState(false);
  const { selectedThemeId, toggleTheme, isThemeUnlocked } = useLauncherTheme();
  const themes = Object.values(LAUNCHER_THEMES);

  // Load launcher config to check experimental mode
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getLauncherConfig();
        setDebugFlag(config.is_experimental);
      } catch (err) {
        console.error("Failed to load launcher config:", err);
        // Default to false if config can't be loaded
        setDebugFlag(false);
      }
    };

    loadConfig();
  }, []);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {themes.map((theme) => {
        const isUnlocked = debugFlag || isThemeUnlocked(theme.id);
        const isSelected = selectedThemeId === theme.id;
        const locked = !debugFlag && !isThemeUnlocked(theme.id);

        const button = (
          <button
            key={theme.id}
            type="button"
            onClick={() => {
              if (!disabled && isUnlocked) {
                toggleTheme(theme.id);
              }
            }}
            disabled={disabled || locked}
            aria-pressed={isSelected}
            className={cn(
              "h-8 flex items-center gap-2 pl-2 pr-2.5 border text-[13px] transition-colors duration-fast ease-out",
              isSelected ? "border-line-3 bg-s3 text-fg" : "border-line-2 text-fg-2",
              locked
                ? "opacity-50 cursor-not-allowed"
                : disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-s3 hover:text-fg cursor-pointer",
            )}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <span
              className="w-3.5 h-3.5 flex-shrink-0 border border-white/[0.14]"
              style={{ backgroundColor: theme.accentColor.value, borderRadius: 3 }}
            />
            <span className="whitespace-nowrap">{theme.name}</span>
            {locked && <Lock size={13} strokeWidth={1.75} className="text-fg-3" />}
            {isSelected && <Check size={13} strokeWidth={2} className="text-fg" />}
          </button>
        );

        if (locked) {
          return (
            <SimpleTooltip
              key={theme.id}
              content={
                theme.unlockRequirement?.type === "advent-door"
                  ? t("settings.theme.unlock_advent", { day: theme.unlockRequirement.day })
                  : t("settings.theme.locked")
              }
            >
              {button}
            </SimpleTooltip>
          );
        }

        return button;
      })}
    </div>
  );
}
