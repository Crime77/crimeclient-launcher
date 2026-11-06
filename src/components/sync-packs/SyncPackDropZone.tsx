"use client";

import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";
import type { SyncPack, SyncTargetPreset } from "../../types/syncPacks";
import { SYNC_TARGET_PRESETS } from "../../types/syncPacks";
import { Tooltip } from "../ui/Tooltip";

export interface SyncPackDropZoneProps {
  pack: SyncPack;
  isDragOver: boolean;
  showBusy: boolean;
  canBrowse: boolean;
  onPickPaths: (directory: boolean) => void;
  onPickPreset: (preset: SyncTargetPreset) => void;
  onBrowseMods: () => void;
}

const ADD_BUTTON =
  "inline-flex items-center h-7 px-2.5 rounded-sm text-[12px] text-fg-3 transition-colors duration-fast hover:bg-s3 hover:text-fg disabled:opacity-30";

function missingPresets(pack: SyncPack): SyncTargetPreset[] {
  const taken = new Set(pack.targets.map((target) => target.path.toLowerCase()));
  return SYNC_TARGET_PRESETS.filter(
    (preset) =>
      preset.kindType !== "mods" && !taken.has(preset.path.toLowerCase()),
  );
}

export function SyncPackDropZone({
  pack,
  isDragOver,
  showBusy,
  canBrowse,
  onPickPaths,
  onPickPreset,
  onBrowseMods,
}: SyncPackDropZoneProps) {
  const { t } = useTranslation();
  const presets = missingPresets(pack);

  return (
    <div
      className={cn(
        "m-3 flex flex-col items-center justify-center gap-2 border py-3 text-center transition-colors duration-fast",
        isDragOver ? "border-line-3 bg-s3" : "border-line bg-bg/30",
      )}
      style={{ borderRadius: "var(--r-md)" }}
    >
      <span className={cn("text-[12px]", isDragOver ? "text-fg" : "text-fg-4")}>
        {isDragOver ? t("syncPacks.drop.overlay") : t("syncPacks.drop.hint")}
      </span>

      {!isDragOver && presets.length > 0 && (
        <div className="flex max-w-[560px] flex-wrap items-center justify-center gap-1.5">
          {presets.map((preset) => (
            <Tooltip
              key={preset.path}
              content={
                <span className="block max-w-[260px]">{t(preset.hint)}</span>
              }
              position="top"
            >
              <button
                onClick={() => onPickPreset(preset)}
                disabled={showBusy}
                type="button"
                className="inline-flex items-center h-6 px-2 rounded-sm border border-line bg-s2 cc-num text-[11.5px] text-fg-3 transition-colors duration-fast hover:border-line-2 hover:bg-s3 hover:text-fg disabled:opacity-30"
              >
                + {preset.path}
              </button>
            </Tooltip>
          ))}
        </div>
      )}

      {!isDragOver && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPickPaths(true)}
            disabled={showBusy}
            type="button"
            className={ADD_BUTTON}
          >
            + {t("syncPacks.add.folder")}
          </button>
          <span className="h-3 w-px bg-line-2" aria-hidden />
          <button
            onClick={() => onPickPaths(false)}
            disabled={showBusy}
            type="button"
            className={ADD_BUTTON}
          >
            + {t("syncPacks.add.file")}
          </button>
          <span className="h-3 w-px bg-line-2" aria-hidden />
          <Tooltip
            content={
              canBrowse ? t("syncPacks.add.mods") : t("syncPacks.noProfile")
            }
            position="top"
          >
            <button
              onClick={onBrowseMods}
              disabled={showBusy || !canBrowse}
              type="button"
              className={cn(ADD_BUTTON, "text-fg-2")}
            >
              + {t("syncPacks.add.mods")}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
