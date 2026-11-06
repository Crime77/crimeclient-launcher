"use client";

import type React from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle, ArrowUp, BellOff, Bell, Blocks, ChevronDown, FolderOpen, Layers,
  Loader2, MoreHorizontal, Package, Trash2,
} from "lucide-react";
import type { LocalContentItem } from "../../../../../hooks/useLocalContentManager";
import type { UnifiedVersion } from "../../../../../types/unified";
import { formatFileSize } from "../../../../../utils/format-file-size";
import { cn } from "../../../../../lib/utils";
import { Tooltip } from "../../../../ui/Tooltip";
import { ToggleSwitch } from "../../../../ui/ToggleSwitch";
import { CheckboxV2 } from "../../../../ui/CheckboxV2";
import { ThemedDropdown, ThemedDropdownItem, ThemedDropdownDivider } from "../../shared/ThemedDropdown";
import { VersionSelectDropdown } from "../../shared/VersionSelectDropdown";

/**
 * Column layout shared by the content rows (ContentTile, SyncModTile) and the list header,
 * so name, version, source and size line up in every row.
 */
export const ROW = {
  root: "group relative flex items-center gap-3 h-11 px-5 transition-colors duration-fast",
  check: "w-4 flex-shrink-0 flex items-center justify-center transition-opacity duration-fast",
  icon: "relative w-7 h-7 flex-shrink-0",
  name: "flex-1 min-w-0 flex items-center gap-1.5",
  version: "relative w-[168px] flex-shrink-0 min-w-0",
  source: "hidden lg:block w-[84px] flex-shrink-0 truncate text-[12px] text-fg-3",
  size: "hidden xl:block w-[60px] flex-shrink-0 text-right cc-num text-[11px] text-fg-4",
  actions: "w-[88px] flex-shrink-0 flex items-center justify-end gap-1",
};

export const rowSurface = (selected: boolean) => (selected ? "bg-s3" : "hover:bg-s2");

/** Square content icon: s3 tile with a hairline, image or fallback glyph. */
export const RowIcon: React.FC<{ src: string | null; dim?: boolean; fallback?: React.ReactNode }> = ({ src, dim, fallback }) => (
  <div
    className={cn(
      "w-full h-full bg-s3 border border-line flex items-center justify-center overflow-hidden transition-[filter,opacity] duration-fast",
      dim && "grayscale opacity-40",
    )}
    style={{ borderRadius: "var(--r-sm)" }}
  >
    {src ? (
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    ) : (
      fallback ?? <Blocks size={14} strokeWidth={1.75} className="text-fg-4" />
    )}
  </div>
);

/** Column header above the rows (eyebrow labels on the same grid). */
export function ContentListHeader() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 h-8 px-5 border-b border-line">
      <div className="w-4 flex-shrink-0" />
      <div className="w-7 flex-shrink-0" />
      <div className="flex-1 min-w-0 cc-eyebrow truncate">{t("profiles.columns.name")}</div>
      <div className="w-[168px] flex-shrink-0 cc-eyebrow">{t("profiles.columns.version")}</div>
      <div className="hidden lg:block w-[84px] flex-shrink-0 cc-eyebrow">{t("profiles.v3.sort.source")}</div>
      <div className="hidden xl:block w-[60px] flex-shrink-0 cc-eyebrow text-right">{t("profiles.v3.sort.size")}</div>
      <div className="w-[88px] flex-shrink-0" />
    </div>
  );
}

export interface ContentTileProps {
  item: LocalContentItem;
  displayName: string;
  iconUrl: string | null;
  platformLabel: string;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onOpenFolder: () => void;
  onNameClick?: () => void;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onToggleUpdateChecks?: () => void;
  onQuickUpdate?: () => void;
  quickUpdateDisabled?: boolean;
  quickUpdateTooltip?: React.ReactNode;
  isQuickUpdating?: boolean;
  noRiskStatus?: "blocked" | "warning" | null;
  overridesPack?: string;
  versionDropdownOpen: boolean;
  availableVersions: UnifiedVersion[] | null;
  isLoadingVersions: boolean;
  versionError: string | null;
  onVersionClick: () => void;
  onSwitchVersion: (v: UnifiedVersion) => void;
  updateAvailable: UnifiedVersion | null;
  isSwitchingVersion?: boolean;
}

/** One content row (40–44px): checkbox, icon, name + flags, version, source, size, actions, toggle. */
export function ContentTile({
  item,
  displayName,
  iconUrl,
  platformLabel,
  busy,
  onToggle,
  onDelete,
  onOpenFolder,
  onNameClick,
  menuOpen,
  onMenuToggle,
  versionDropdownOpen,
  availableVersions,
  isLoadingVersions,
  versionError,
  onVersionClick,
  onSwitchVersion,
  updateAvailable,
  isSwitchingVersion,
  selectMode,
  isSelected,
  onToggleSelection,
  onToggleUpdateChecks,
  onQuickUpdate,
  quickUpdateDisabled,
  quickUpdateTooltip,
  isQuickUpdating,
  noRiskStatus,
  overridesPack,
}: ContentTileProps) {
  const { t } = useTranslation();
  const enabled = !item.is_disabled;
  const versionText =
    (item.modrinth_info as any)?.version_number ||
    (item.curseforge_info as any)?.file_name ||
    item.fallback_version ||
    "";

  const isSwitchable =
    !!(item.modrinth_info?.project_id || item.curseforge_info?.project_id);

  const currentVersionId =
    (item.modrinth_info as any)?.version_id ||
    (item.modrinth_info as any)?.id ||
    (item.curseforge_info as any)?.file_id ||
    null;

  const versionButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const updateActive = (() => {
    if (!updateAvailable) return false;
    const isFromModPack = !!item.modpack_origin;
    return isFromModPack ? item.updates_enabled === true : item.updates_enabled !== false;
  })();

  const nameClass = cn(
    "min-w-0 truncate text-left text-[13px] font-[520] transition-colors duration-fast",
    enabled ? "text-fg" : "text-fg-3",
  );

  return (
    <div className={cn(ROW.root, rowSurface(isSelected))}>
      <div className={cn(ROW.check, selectMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <CheckboxV2
          size="sm"
          checked={isSelected}
          onChange={() => onToggleSelection()}
          tooltip={isSelected ? t("profiles.v3.tile.deselect") : t("profiles.v3.tile.select")}
        />
      </div>

      <div className={ROW.icon}>
        <RowIcon src={iconUrl} dim={!enabled} />
        {noRiskStatus && (
          <div className="absolute -top-1 -left-1 z-10">
            <Tooltip content={t(noRiskStatus === "blocked" ? "profiles.v3.tile.noriskBlocked" : "profiles.v3.tile.noriskWarning")}>
              <span
                className="w-3.5 h-3.5 flex items-center justify-center bg-s1 border border-line-2"
                style={{ borderRadius: 999 }}
              >
                <AlertTriangle size={8} strokeWidth={2.25} className={noRiskStatus === "blocked" ? "text-err" : "text-warn"} />
              </span>
            </Tooltip>
          </div>
        )}
      </div>

      <div className={ROW.name}>
        {onNameClick ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNameClick(); }}
            className={cn(nameClass, "underline-offset-[3px] decoration-line-3 hover:underline")}
            title={displayName}
          >
            {displayName}
          </button>
        ) : (
          <span className={nameClass} title={displayName}>{displayName}</span>
        )}
        {item.updates_enabled === false && (
          <Tooltip content={t("profiles.v3.tile.updateChecksPaused")}>
            <BellOff size={12} strokeWidth={1.75} className="text-fg-4 flex-shrink-0" />
          </Tooltip>
        )}
        {overridesPack && (
          <Tooltip content={<span className="block max-w-[260px]">{t("profiles.v3.syncMods.replacesHint", { pack: overridesPack })}</span>}>
            <Layers size={12} strokeWidth={1.75} className="text-warn flex-shrink-0" />
          </Tooltip>
        )}
        {item.modpack_origin && (
          <Tooltip content={t("profiles.v3.tile.fromModpackTooltip", { source: item.modpack_origin.split(":")[0] })}>
            <Package size={12} strokeWidth={1.75} className="text-fg-3 flex-shrink-0" />
          </Tooltip>
        )}
      </div>

      <div className={ROW.version}>
        <button
          ref={versionButtonRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); if (isSwitchable && !isSwitchingVersion) onVersionClick(); }}
          disabled={!isSwitchable || isSwitchingVersion}
          className={cn(
            "group/version inline-flex items-center gap-1.5 h-6 max-w-full px-1.5 -ml-1.5 cc-num text-[12px] transition-colors duration-fast",
            isSwitchingVersion
              ? "text-fg-2 cursor-wait"
              : isSwitchable
                ? "text-fg-3 hover:text-fg hover:bg-s3"
                : "text-fg-4 cursor-default",
            versionDropdownOpen && "bg-s3 text-fg",
          )}
          style={{ borderRadius: "var(--r-sm)" }}
          title={versionText || undefined}
        >
          {isSwitchingVersion && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
          {!isSwitchingVersion && updateAvailable && (
            <span
              className={cn("inline-block w-1.5 h-1.5 flex-shrink-0", updateActive ? "bg-warn" : "bg-fg-4")}
              style={{ borderRadius: 999 }}
            />
          )}
          <span className="truncate">{isSwitchingVersion ? t("profiles.v3.tile.switching") : (versionText || "—")}</span>
          {isSwitchable && !isSwitchingVersion && (
            <ChevronDown
              size={12}
              strokeWidth={1.75}
              className={cn(
                "flex-shrink-0 text-fg-4 transition-opacity duration-fast",
                versionDropdownOpen ? "opacity-100" : "opacity-0 group-hover/version:opacity-100",
              )}
            />
          )}
        </button>

        <VersionSelectDropdown
          open={versionDropdownOpen}
          onClose={() => onVersionClick()}
          triggerRef={versionButtonRef}
          versions={availableVersions}
          loading={isLoadingVersions}
          error={versionError}
          currentVersionId={currentVersionId}
          onSelect={onSwitchVersion}
        />
      </div>

      <div className={ROW.source}>{platformLabel}</div>

      <div className={ROW.size}>{item.file_size > 0 ? formatFileSize(item.file_size) : "—"}</div>

      <div className={ROW.actions}>
        {onQuickUpdate && (
          <Tooltip content={isQuickUpdating ? t("profiles.v3.tile.updating") : (quickUpdateTooltip ?? t("profiles.v3.tile.updateToLatest"))}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!quickUpdateDisabled && !isQuickUpdating) onQuickUpdate(); }}
              disabled={quickUpdateDisabled || isQuickUpdating}
              aria-label={t("profiles.v3.tile.updateToLatest")}
              className={cn(
                "w-6 h-6 flex items-center justify-center border flex-shrink-0 transition-colors duration-fast",
                isQuickUpdating
                  ? "border-warn/35 text-warn cursor-wait"
                  : quickUpdateDisabled
                    ? "border-line text-fg-4 cursor-not-allowed"
                    : "border-warn/35 text-warn hover:bg-warn/10",
              )}
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {isQuickUpdating
                ? <Loader2 size={12} className="animate-spin" />
                : <ArrowUp size={13} strokeWidth={2} />}
            </button>
          </Tooltip>
        )}

        <div className="relative flex-shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); onMenuToggle(!menuOpen); }}
            aria-label={t("profiles.moreOptions")}
            className={cn(
              "w-6 h-6 flex items-center justify-center text-fg-3 hover:text-fg hover:bg-s3 transition-[opacity,color,background-color] duration-fast",
              menuOpen ? "opacity-100 bg-s3 text-fg" : "opacity-0 group-hover:opacity-100",
            )}
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <MoreHorizontal size={15} strokeWidth={1.75} />
          </button>
          <ThemedDropdown open={menuOpen} onClose={() => onMenuToggle(false)} width="w-52" triggerRef={menuButtonRef}>
            <ThemedDropdownItem
              icon={FolderOpen}
              onClick={() => { onOpenFolder(); onMenuToggle(false); }}
            >
              {t("profiles.v3.tile.openFolder")}
            </ThemedDropdownItem>
            {onToggleUpdateChecks && (
              <>
                <ThemedDropdownDivider />
                <ThemedDropdownItem
                  icon={(item.updates_enabled ?? true) ? BellOff : Bell}
                  onClick={() => { onToggleUpdateChecks(); onMenuToggle(false); }}
                >
                  {(item.updates_enabled ?? true) ? t("profiles.v3.tile.pauseUpdates") : t("profiles.v3.tile.resumeUpdates")}
                </ThemedDropdownItem>
              </>
            )}
            {!item.norisk_info && (
              <>
                <ThemedDropdownDivider />
                <ThemedDropdownItem
                  icon={Trash2}
                  tone="danger"
                  onClick={() => { onDelete(); onMenuToggle(false); }}
                >
                  {t("profiles.v3.tile.delete")}
                </ThemedDropdownItem>
              </>
            )}
          </ThemedDropdown>
        </div>

        <div
          className="flex-shrink-0 flex items-center"
          title={enabled ? t("profiles.v3.tile.disable") : t("profiles.v3.tile.enable")}
        >
          <ToggleSwitch
            checked={enabled}
            onChange={() => onToggle()}
            disabled={busy}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
