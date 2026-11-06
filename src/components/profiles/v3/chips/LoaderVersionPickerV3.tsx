"use client";

/**
 * LoaderVersionPickerV3 — presentational picker for loader versions.
 *
 * `currentVersion` is the effectively-in-use version (override / pack /
 * profile-default / API-resolved latest). `resolvedSource` tells us where
 * that value came from; we surface a muted badge on the highlighted row only
 * for non-default sources (pack / user_overwrite) so the user understands
 * WHY that row is active and that picking *any* version here promotes it to
 * an explicit per-loader override.
 */

import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LoaderVersionReason } from "../../../../types/profile";

// Only surface a badge when the effective version comes from something OTHER
// than the plain stored loader_version — pack policy or explicit override —
// because those tell the user "this isn't just your default, something is
// influencing it".
const SOURCE_LABEL_KEY: Record<LoaderVersionReason, string | null> = {
  profile_default: null,
  norisk_pack:     "profiles.v3.chips.loaderVersion.source.pack",
  user_overwrite:  "profiles.v3.chips.loaderVersion.source.override",
  not_resolved:    null,
};

interface LoaderVersionPickerV3Props {
  loader: string;
  /** Effectively-in-use version (stored OR resolved). Null when nothing set. */
  currentVersion: string | null;
  /** Source label shown on the current row when the version comes from resolution, not storage. */
  resolvedSource?: LoaderVersionReason;
  versions: string[] | null;
  isLoading: boolean;
  onSelect: (version: string) => void;
}

// Fabric/Quilt list items carry a " (stable)" suffix (matches the wizard's
// stored format, see useHeroChipEditors.formatFabricLike). Resolved values
// that come from norisk_pack don't carry it — normalize on both sides so the
// highlight still lights up the right row.
const stripStable = (v: string | null | undefined): string | null =>
  v ? v.replace(/\s*\(stable\)\s*$/i, "") : null;

export function LoaderVersionPickerV3({
  loader,
  currentVersion,
  resolvedSource,
  versions,
  isLoading,
  onSelect,
}: LoaderVersionPickerV3Props) {
  const { t } = useTranslation();
  const sourceKey = resolvedSource ? SOURCE_LABEL_KEY[resolvedSource] : null;
  const currentNormalized = stripStable(currentVersion);

  return (
    <div className="flex flex-col">
      <div className="cc-eyebrow px-2 pt-1.5 pb-1">
        {t("profiles.v3.chips.loaderVersion.header", { loader })}
      </div>

      <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-2 py-6 text-[12px] text-fg-3">
            <Loader2 size={14} className="animate-spin" />
            {t("profiles.v3.chips.loaderVersion.loading")}
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="px-2 py-4 text-center text-[12px] text-fg-3">
            {t("profiles.v3.chips.loaderVersion.empty")}
          </div>
        ) : (
          versions.map((v) => {
            const isCurrent = stripStable(v) === currentNormalized;
            return (
              <button
                type="button"
                key={v}
                onClick={() => onSelect(v)}
                className={`w-full h-7 flex items-center gap-2 px-2 text-left transition-colors duration-fast ${
                  isCurrent ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s3 hover:text-fg"
                }`}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                <span className="flex-1 cc-num text-[12px] truncate">{v}</span>
                {isCurrent && sourceKey && (
                  <span
                    className="text-[10px] px-1 h-4 inline-flex items-center border border-line-2 text-fg-3"
                    style={{ borderRadius: "var(--r-sm)" }}
                  >
                    {t(sourceKey)}
                  </span>
                )}
                {isCurrent && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
