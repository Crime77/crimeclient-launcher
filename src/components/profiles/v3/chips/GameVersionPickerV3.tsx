"use client";

/**
 * GameVersionPickerV3 — presentational command-palette picker for a Minecraft
 * version. Data and mutation are owned by `useHeroChipEditors`; this
 * component just renders what it's given.
 *
 * Filters `versions` locally by release/snapshot (MC API returns "release",
 * "snapshot", "old_beta", "old_alpha" — we only surface release/snapshot).
 */

import { useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MinecraftVersion } from "../../../../types/minecraft";

interface GameVersionPickerV3Props {
  currentVersion: string;
  versions: MinecraftVersion[] | null;
  isLoading: boolean;
  onSelect: (version: string) => void;
}

export function GameVersionPickerV3({
  currentVersion,
  versions,
  isLoading,
  onSelect,
}: GameVersionPickerV3Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [showSnapshots, setShowSnapshots] = useState(false);

  const filtered = useMemo(() => {
    if (!versions) return [];
    const q = query.trim().toLowerCase();
    const wantedType = showSnapshots ? "snapshot" : "release";
    return versions.filter((v) => {
      if (v.type !== wantedType) return false;
      if (!q) return true;
      return v.id.toLowerCase().includes(q);
    });
  }, [versions, query, showSnapshots]);

  return (
    <div className="flex flex-col">
      <div className="p-1">
        <div className="relative">
          <Search size={13} strokeWidth={1.75} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-4 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("profiles.v3.chips.gameVersion.search")}
            className="w-full h-7 pl-7 pr-2 bg-s1 border border-line focus:border-line-3 outline-none text-[12px] text-fg placeholder:text-fg-4 transition-colors duration-fast"
            style={{ borderRadius: "var(--r-sm)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5 mx-1 mb-1 p-0.5 bg-s1 border border-line" style={{ borderRadius: "var(--r-sm)" }}>
        {(["release", "snapshot"] as const).map((seg) => {
          const active = seg === "release" ? !showSnapshots : showSnapshots;
          return (
            <button
              type="button"
              key={seg}
              onClick={() => setShowSnapshots(seg === "snapshot")}
              className={`flex-1 h-6 text-[12px] font-[520] transition-colors duration-fast ${
                active ? "bg-s3 text-fg" : "text-fg-3 hover:text-fg-2"
              }`}
              style={{ borderRadius: "calc(var(--r-sm) - 1px)" }}
            >
              {seg === "release"
                ? t("profiles.v3.chips.gameVersion.releases")
                : t("profiles.v3.chips.gameVersion.snapshots")}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-line -mx-1" />

      <div className="max-h-[220px] overflow-y-auto pt-1 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-2 py-6 text-[12px] text-fg-3">
            <Loader2 size={14} className="animate-spin" />
            {t("profiles.v3.chips.gameVersion.loading")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-6 text-center text-[12px] text-fg-3">
            {t("profiles.v3.chips.gameVersion.empty")}
          </div>
        ) : (
          filtered.map((v) => {
            const isCurrent = v.id === currentVersion;
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`w-full h-7 flex items-center gap-2 px-2 text-left transition-colors duration-fast ${
                  isCurrent ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s3 hover:text-fg"
                }`}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                <span className="flex-1 cc-num text-[12px]">{v.id}</span>
                {isCurrent && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
