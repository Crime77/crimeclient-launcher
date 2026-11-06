"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, RefreshCw } from "lucide-react";

import type { UnifiedVersion } from "../../../../types/unified";
import { ThemedDropdown, ThemedDropdownHeader } from "./ThemedDropdown";

export interface VersionSelectDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  versions: UnifiedVersion[] | null;
  loading: boolean;
  error: string | null;
  currentVersionId?: string | null;
  onSelect: (version: UnifiedVersion) => void;
  latestOption?: {
    label: string;
    hint?: string;
    selected: boolean;
    onSelect: () => void;
  };
  align?: "left" | "right";
  width?: string;
}

const ROW =
  "w-full flex items-center gap-2.5 px-2 py-1.5 text-left transition-colors duration-fast";

export function VersionSelectDropdown({
  open,
  onClose,
  triggerRef,
  versions,
  loading,
  error,
  currentVersionId,
  onSelect,
  latestOption,
  align = "left",
  width = "w-72",
}: VersionSelectDropdownProps) {
  const { t } = useTranslation();

  return (
    <ThemedDropdown
      open={open}
      onClose={onClose}
      width={width}
      align={align}
      scrollable
      triggerRef={triggerRef}
    >
      <ThemedDropdownHeader>
        {t("profiles.v3.versions.selectVersion")}
      </ThemedDropdownHeader>

      {latestOption && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!latestOption.selected) latestOption.onSelect();
            }}
            disabled={latestOption.selected}
            className={`${ROW} ${
              latestOption.selected
                ? "bg-s3 text-fg cursor-default"
                : "text-fg-2 hover:bg-s3 hover:text-fg"
            }`}
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <RefreshCw size={14} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate">{latestOption.label}</div>
              {latestOption.hint && (
                <div className="text-[11px] text-fg-3 truncate">{latestOption.hint}</div>
              )}
            </div>
            {latestOption.selected && (
              <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />
            )}
          </button>
          <div className="h-px bg-line my-1 -mx-1" />
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-fg-3">
          <Loader2 size={14} className="animate-spin" />
          {t("profiles.v3.versions.loading")}
        </div>
      )}

      {!loading && error && (
        <div className="px-2 py-3 text-[12px] text-err">{error}</div>
      )}

      {!loading && !error && versions && versions.length === 0 && (
        <div className="px-2 py-3 text-[12px] text-fg-3">
          {t("profiles.v3.versions.none")}
        </div>
      )}

      {!loading &&
        !error &&
        versions &&
        versions.map((version) => {
          const isCurrent = version.id === currentVersionId;
          return (
            <button
              type="button"
              key={version.id}
              onClick={(event) => {
                event.stopPropagation();
                if (!isCurrent) onSelect(version);
              }}
              disabled={isCurrent}
              className={`${ROW} ${
                isCurrent
                  ? "bg-s3 text-fg cursor-default"
                  : "text-fg-2 hover:bg-s3 hover:text-fg"
              }`}
              style={{ borderRadius: "var(--r-sm)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="cc-num text-[12px] truncate">{version.version_number}</div>
                {version.name && version.name !== version.version_number && (
                  <div className="text-[11px] text-fg-3 truncate">{version.name}</div>
                )}
              </div>
              {version.release_type !== "release" && (
                <span
                  className={`cc-num text-[10px] uppercase tracking-[0.04em] px-1 h-4 inline-flex items-center border flex-shrink-0 ${
                    version.release_type === "alpha"
                      ? "text-err border-err/30"
                      : version.release_type === "beta"
                        ? "text-warn border-warn/30"
                        : "text-fg-3 border-line-2"
                  }`}
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  {version.release_type}
                </span>
              )}
              {isCurrent && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />}
            </button>
          );
        })}
    </ThemedDropdown>
  );
}
