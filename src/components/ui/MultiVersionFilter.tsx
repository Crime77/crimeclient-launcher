"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

export interface VersionFilterOption {
  value: string;
  count: number;
}

interface MultiVersionFilterProps {
  options: VersionFilterOption[];
  /** Currently selected version values. Empty = no filter (all shown). */
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  size?: "sm" | "md";
}

export function MultiVersionFilter({
  options,
  selected,
  onToggle,
  onClear,
  size = "md",
}: MultiVersionFilterProps) {
  const { t } = useTranslation();
  const isSm = size === "sm";
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = selected.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-auto" ref={ref}>
      {/* Trigger: a quiet toolbar button; an active filter shows its count */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 font-[520] transition-colors duration-fast focus:outline-none",
          isSm ? "h-7 text-xs" : "h-8 text-[13px]",
          isOpen || isActive ? "bg-s3 text-fg" : "text-fg-2 hover:text-fg hover:bg-s3",
        )}
        style={{ borderRadius: "var(--r-sm)" }}
        title={isActive ? selected.join(", ") : t("profiles.filter.title")}
      >
        <Gamepad2 size={14} strokeWidth={1.75} className={isActive ? "text-fg-2" : "text-fg-3"} />
        <span>{t("profiles.filter.versions")}</span>
        {isActive && (
          <span className="cc-num min-w-[16px] h-4 px-1 flex items-center justify-center rounded-sm bg-s4 text-[11px] text-fg">
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={isSm ? 13 : 14}
          strokeWidth={1.75}
          className={cn("text-fg-3 transition-transform duration-med ease-out", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="cc-popover cc-pop absolute top-full right-0 mt-1.5 w-56 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 h-8 border-b border-line">
            <span className="cc-eyebrow">{t("profiles.filter.versions")}</span>
            {isActive && (
              <button
                type="button"
                onClick={onClear}
                className="text-fg-3 hover:text-fg text-xs transition-colors duration-fast"
              >
                {t("profiles.filter.clear")}
              </button>
            )}
          </div>
          <div className="p-1 max-h-72 overflow-y-auto custom-scrollbar">
            {options.length === 0 && (
              <div className="px-2.5 py-2 text-fg-3 text-xs">{t("profiles.filter.noVersions")}</div>
            )}
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => onToggle(option.value)}
                  className={cn(
                    "w-full flex items-center gap-2.5 text-left rounded-sm transition-colors duration-fast",
                    isSm ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-[13px]",
                    checked ? "text-fg" : "text-fg-2 hover:bg-s3 hover:text-fg",
                  )}
                >
                  {/* checkbox: --fg fill with a dark check */}
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors duration-fast",
                      checked ? "bg-fg border-fg text-bg" : "border-line-3 bg-s2",
                    )}
                  >
                    {checked && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 cc-num">{option.value}</span>
                  <span className="cc-num text-fg-4 text-[11px]">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
