"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X, type LucideIcon } from "lucide-react";

export interface FABActionConfig {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "default";
}

interface FloatingActionBarProps {
  visible: boolean;
  count: number;
  totalCount: number;
  /** kept for callers; the bar is neutral, only the progress count uses the accent (via CSS) */
  accent?: string;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  actions: FABActionConfig[];
  batchProgress?: { current: number; total: number } | null;
}

/** The selection bar at the bottom of a list: flat s2 with a line and the pop shadow. */
export function FloatingActionBar({
  visible, count, totalCount, allSelected,
  onSelectAll, onClear, actions, batchProgress,
}: FloatingActionBarProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-30 transition-[bottom,opacity] duration-med ease-out ${
        visible ? "bottom-4 opacity-100 pointer-events-auto" : "bottom-1 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="flex items-center h-10 pl-3 pr-1 gap-1 bg-s2 border border-line-2 shadow-pop whitespace-nowrap"
        style={{ borderRadius: "var(--r-md)" }}
      >
        <div className="flex items-center gap-2 pr-2">
          {batchProgress ? (
            <span className="flex items-center gap-1.5 cc-num text-[12px]">
              <Loader2 size={12} className="animate-spin text-accent" />
              <span className="text-fg">{batchProgress.current}</span>
              <span className="text-fg-3">/ {batchProgress.total}</span>
            </span>
          ) : (
            <>
              <span className="cc-num text-[12px]">
                <span className="text-fg">{count}</span>
                <span className="text-fg-3"> / {totalCount}</span>
              </span>
              {!allSelected && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="h-6 px-1.5 text-[12px] text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast"
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  {t("profiles.v3.fab.all")}
                </button>
              )}
            </>
          )}
        </div>

        <div className="w-px h-5 bg-line-2" />

        {actions.map((action, i) => (
          <FabButton key={`${action.label}-${i}`} {...action} />
        ))}

        <div className="w-px h-5 bg-line-2" />

        <button
          type="button"
          onClick={onClear}
          className="cc-icon-btn"
          title={t("profiles.v3.fab.clearSelection")}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

const FabButton: React.FC<FABActionConfig> = ({ icon: Glyph, label, tone, onClick, disabled }) => {
  const toneClass =
    tone === "danger"
      ? "text-fg-2 hover:bg-err/10 hover:text-err"
      : "text-fg-2 hover:bg-s3 hover:text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 px-2 flex items-center gap-1.5 text-[12.5px] font-[520] transition-colors duration-fast disabled:opacity-45 disabled:pointer-events-none ${toneClass}`}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <Glyph size={14} strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
};
