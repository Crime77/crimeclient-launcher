"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";

import { cn } from "../../lib/utils";
import { ModPlatform } from "../../types/unified";
import type { UnifiedVersion } from "../../types/unified";
import { loaderIconSrc, loaderLabel } from "../../lib/loader-icons";
import { Tooltip } from "../ui/Tooltip";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { VersionSelectDropdown } from "../profiles/v3/shared/VersionSelectDropdown";
import type { SyncPackModMatrixRow, VersionOverride } from "../../types/syncPacks";

export interface SyncPackVersionRowProps {
  row: SyncPackModMatrixRow;
  override?: VersionOverride;
  platform: ModPlatform | null;
  dropdownOpen: boolean;
  versions: UnifiedVersion[] | null;
  loadingVersions: boolean;
  versionError: string | null;
  resolving: boolean;
  onOpenDropdown: () => void;
  onCloseDropdown: () => void;
  onSelectVersion: (version: UnifiedVersion) => void;
  onUseLatest: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

type Mode = "latest" | "pinned" | "off";

export function SyncPackVersionRow({
  row,
  override,
  platform,
  dropdownOpen,
  versions,
  loadingVersions,
  versionError,
  resolving,
  onOpenDropdown,
  onCloseDropdown,
  onSelectVersion,
  onUseLatest,
  onDisable,
  onEnable,
}: SyncPackVersionRowProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const mode: Mode =
    override?.type === "disabled"
      ? "off"
      : override?.type === "pin"
        ? "pinned"
        : "latest";

  const marker: Record<Mode, { icon: string; className: string; tip: string }> = {
    latest: {
      icon: "solar:refresh-circle-linear",
      className: "text-fg-4",
      tip: t("syncPacks.entries.modeLatestTip"),
    },
    pinned: {
      icon: "solar:pin-bold",
      className: "text-fg",
      tip: t("syncPacks.entries.modePinnedTip"),
    },
    off: {
      icon: "solar:forbidden-circle-bold",
      className: "text-err",
      tip: t("syncPacks.entries.modeOffTip"),
    },
  };

  const resolvedLabel = row.resolved_version_name ?? row.resolved_filename;
  const chipLabel =
    mode === "off"
      ? t("syncPacks.entries.statusDisabled")
      : (resolvedLabel ?? t(`syncPacks.entries.status.${row.status}`));
  const unresolved = row.status === "unresolved";
  const canSwitch = !!platform && mode !== "off";

  return (
    <div
      className="group/version flex items-center gap-3 h-8 px-2 transition-colors duration-fast hover:bg-s2"
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <span className="w-[92px] flex-shrink-0 truncate cc-num text-[12px] text-fg-2">
        {row.mc_version}
      </span>
      <Tooltip content={loaderLabel(row.loader)} position="top">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <img
            src={loaderIconSrc(row.loader)}
            alt={loaderLabel(row.loader)}
            className="h-4 w-4 object-contain opacity-60"
          />
        </span>
      </Tooltip>

      <Tooltip content={marker[mode].tip} position="top">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <Icon
            icon={marker[mode].icon}
            className={cn("h-3.5 w-3.5", marker[mode].className)}
          />
        </span>
      </Tooltip>

      <div className="relative min-w-0 flex-1">
        <Tooltip
          content={row.resolved_filename ?? chipLabel}
          position="top"
          wrapperClassName="max-w-full"
        >
        <button
          ref={triggerRef}
          onClick={(event) => {
            event.stopPropagation();
            if (canSwitch) onOpenDropdown();
          }}
          disabled={!canSwitch}
          className={cn(
            "inline-flex h-6 max-w-full items-center gap-1 truncate px-1.5 cc-num text-[12px] transition-colors duration-fast",
            canSwitch ? "cursor-pointer hover:bg-s3" : "cursor-default",
            unresolved ? "text-warn" : mode === "off" ? "text-fg-4" : "text-fg-2",
          )}
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {resolving && (
            <Icon
              icon="svg-spinners:ring-resize"
              className="h-3 w-3 flex-shrink-0"
            />
          )}
          <span className="truncate">{chipLabel}</span>
          {canSwitch && !resolving && (
            <Icon
              icon="solar:alt-arrow-down-linear"
              className="h-3 w-3 flex-shrink-0 text-fg-4"
            />
          )}
        </button>
        </Tooltip>

        <VersionSelectDropdown
          open={dropdownOpen}
          onClose={onCloseDropdown}
          triggerRef={triggerRef}
          versions={versions}
          loading={loadingVersions}
          error={versionError}
          currentVersionId={mode === "pinned" ? row.resolved_version_id : null}
          onSelect={onSelectVersion}
          latestOption={{
            label: t("syncPacks.entries.modeLatest"),
            hint: t("syncPacks.entries.modeLatestHint"),
            selected: mode === "latest",
            onSelect: onUseLatest,
          }}
        />
      </div>

      <Tooltip
        content={
          mode === "off"
            ? t("syncPacks.entries.enableForVersion")
            : t("syncPacks.entries.disableForVersion")
        }
        position="top"
        wrapperClassName="flex-shrink-0"
      >
        <div className="flex-shrink-0">
          <ToggleSwitch
            checked={mode !== "off"}
            onChange={(next) => (next ? onEnable() : onDisable())}
            size="sm"
          />
        </div>
      </Tooltip>
    </div>
  );
}
