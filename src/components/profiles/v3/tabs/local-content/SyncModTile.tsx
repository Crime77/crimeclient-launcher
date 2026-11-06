"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ChevronDown, Clock, Layers, Link2, Loader2, MoreHorizontal, Package, Pause, PenLine, Pin,
  Play, RefreshCw, Trash2, XCircle, type LucideIcon,
} from "lucide-react";
import {
  isSyncModLive,
  isSyncModLockedByPack,
  isSyncModOnHere,
  syncModKey,
  type ProfileSyncModStatus,
  type ProfileSyncPackMod,
} from "../../../../../types/syncPacks";
import type { UnifiedVersion } from "../../../../../types/unified";
import { cn } from "../../../../../lib/utils";
import { Tooltip } from "../../../../ui/Tooltip";
import { CheckboxV2 } from "../../../../ui/CheckboxV2";
import { ToggleSwitch } from "../../../../ui/ToggleSwitch";
import { VersionSelectDropdown } from "../../shared/VersionSelectDropdown";
import { ThemedDropdown, ThemedDropdownDivider, ThemedDropdownHeader, ThemedDropdownItem } from "../../shared/ThemedDropdown";
import { ROW, RowIcon, rowSurface } from "./ContentTile";
import type { ProfileSyncMods } from "./useProfileSyncMods";

export interface SyncModVersionPicker {
  open: boolean;
  versions: UnifiedVersion[] | null;
  loading: boolean;
  error: string | null;
  onOpen: () => void;
  onClose: () => void;
}

interface SyncModTileProps {
  entry: ProfileSyncPackMod;
  sync: ProfileSyncMods;
  mcVersion: string;
  selectMode: boolean;
  versionPicker: SyncModVersionPicker;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
  onNameClick?: () => void;
}

const PLATFORM_LABEL: Record<string, string> = { modrinth: "Modrinth", curseforge: "CurseForge" };

/** A sync-pack mod as a content row, on the same columns as ContentTile. */
export function SyncModTile({
  entry,
  sync,
  mcVersion,
  selectMode,
  versionPicker,
  menuOpen,
  onMenuToggle,
  onNameClick,
}: SyncModTileProps) {
  const { t } = useTranslation();
  const versionButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const key = syncModKey(entry);
  const busy = sync.busyKey === key;
  const isSelected = sync.selection.has(key);
  const live = isSyncModLive(entry);
  const lockedByPack = isSyncModLockedByPack(entry);
  const onHere = isSyncModOnHere(entry);
  const isJar = entry.mod_id === null;
  const switchable = !isJar && !!entry.platform && !!entry.project_id;
  const offEverywhere = entry.status === "disabled";
  const status = statusBadge(entry, mcVersion, t);
  const iconUrl = sync.iconFor(entry);
  const StatusGlyph = status?.icon;

  const nameClass = cn(
    "min-w-0 truncate text-left text-[13px] font-[520] transition-colors duration-fast",
    live ? "text-fg" : "text-fg-3",
  );

  const menuAction = (action: () => void) => () => {
    onMenuToggle(false);
    action();
  };

  return (
    <div className={cn(ROW.root, rowSurface(isSelected))}>
      <div className={cn(ROW.check, selectMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <CheckboxV2
          size="sm"
          checked={isSelected}
          onChange={() => sync.toggleSelected(entry)}
          tooltip={isSelected ? t("profiles.v3.tile.deselect") : t("profiles.v3.tile.select")}
        />
      </div>

      <div className={ROW.icon}>
        <RowIcon
          src={iconUrl}
          dim={!live}
          fallback={isJar ? <Package size={14} strokeWidth={1.75} className="text-fg-4" /> : undefined}
        />
      </div>

      <div className={ROW.name}>
        {onNameClick ? (
          <button
            type="button"
            onClick={onNameClick}
            className={cn(nameClass, "underline-offset-[3px] decoration-line-3 hover:underline")}
            title={entry.display_name}
          >
            {entry.display_name}
          </button>
        ) : (
          <span className={nameClass} title={entry.display_name}>{entry.display_name}</span>
        )}
        <Tooltip content={t("profiles.v3.syncMods.fromPackTooltip", { pack: entry.pack_name })}>
          <Link2 size={12} strokeWidth={1.75} className="text-fg-4 flex-shrink-0" />
        </Tooltip>
        {status && StatusGlyph && (
          <Tooltip content={<span className="block max-w-[260px]">{status.hint}</span>}>
            <span className={cn("inline-flex items-center gap-1 text-[11px] min-w-0 flex-shrink", status.tone)}>
              <StatusGlyph size={11} strokeWidth={1.75} className="flex-shrink-0" />
              <span className="truncate">{status.label}</span>
            </span>
          </Tooltip>
        )}
      </div>

      <div className={ROW.version}>
        {isJar ? (
          <span className="cc-num text-[12px] text-fg-4">—</span>
        ) : (
          <>
            <button
              ref={versionButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (switchable && !busy) versionPicker.onOpen();
              }}
              disabled={!switchable || busy}
              className={cn(
                "group/version inline-flex items-center gap-1.5 h-6 max-w-full px-1.5 -ml-1.5 cc-num text-[12px] transition-colors duration-fast",
                busy
                  ? "text-fg-2 cursor-wait"
                  : switchable
                    ? "text-fg-3 hover:text-fg hover:bg-s3"
                    : "text-fg-4 cursor-default",
                versionPicker.open && "bg-s3 text-fg",
              )}
              style={{ borderRadius: "var(--r-sm)" }}
              title={entry.version_name || undefined}
            >
              {busy && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
              {!busy && entry.pinned && (
                <Tooltip content={t("profiles.v3.syncMods.pinned")}>
                  <Pin size={11} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
                </Tooltip>
              )}
              <span className="truncate">{entry.version_name || "—"}</span>
              {switchable && !busy && (
                <ChevronDown
                  size={12}
                  strokeWidth={1.75}
                  className={cn(
                    "flex-shrink-0 text-fg-4 transition-opacity duration-fast",
                    versionPicker.open ? "opacity-100" : "opacity-0 group-hover/version:opacity-100",
                  )}
                />
              )}
            </button>
            <VersionSelectDropdown
              open={versionPicker.open}
              onClose={versionPicker.onClose}
              triggerRef={versionButtonRef}
              versions={versionPicker.versions}
              loading={versionPicker.loading}
              error={versionPicker.error}
              currentVersionId={entry.pinned ? entry.version_id : null}
              onSelect={(version) => {
                versionPicker.onClose();
                sync.pinVersion(entry, version.id);
              }}
              latestOption={{
                label: t("profiles.v3.syncMods.version.latest"),
                hint: t("profiles.v3.syncMods.version.latestHint", { version: mcVersion }),
                selected: !entry.pinned,
                onSelect: () => {
                  versionPicker.onClose();
                  sync.pinVersion(entry, null);
                },
              }}
            />
          </>
        )}
      </div>

      <div className={ROW.source}>
        {isJar ? "JAR" : (entry.platform ? PLATFORM_LABEL[entry.platform] ?? entry.platform : "—")}
      </div>

      <div className={ROW.size}>—</div>

      <div className={ROW.actions}>
        <div className="relative flex-shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(!menuOpen);
            }}
            aria-label={t("profiles.moreOptions")}
            className={cn(
              "w-6 h-6 flex items-center justify-center text-fg-3 hover:text-fg hover:bg-s3 transition-[opacity,color,background-color] duration-fast",
              menuOpen ? "opacity-100 bg-s3 text-fg" : "opacity-0 group-hover:opacity-100",
            )}
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <MoreHorizontal size={15} strokeWidth={1.75} />
          </button>
          <ThemedDropdown open={menuOpen} onClose={() => onMenuToggle(false)} width="w-64" triggerRef={menuButtonRef}>
            <ThemedDropdownHeader>
              {t("profiles.v3.syncMods.menu.everywhereTitle", { pack: entry.pack_name })}
            </ThemedDropdownHeader>
            {!isJar && entry.pinned && (
              <ThemedDropdownItem icon={RefreshCw} onClick={menuAction(() => sync.pinVersion(entry, null))}>
                {t("profiles.v3.syncMods.version.latest")}
              </ThemedDropdownItem>
            )}
            {!isJar && (
              <ThemedDropdownItem
                icon={offEverywhere ? Play : Pause}
                onClick={menuAction(() => sync.setEverywhere(entry, offEverywhere))}
              >
                {t(offEverywhere ? "profiles.v3.syncMods.menu.onEverywhere" : "profiles.v3.syncMods.menu.offEverywhere")}
              </ThemedDropdownItem>
            )}
            <ThemedDropdownItem icon={PenLine} onClick={menuAction(() => sync.openPack(entry.pack_id))}>
              {t("profiles.v3.syncMods.menu.editPack")}
            </ThemedDropdownItem>
            <ThemedDropdownDivider />
            <ThemedDropdownItem
              icon={Trash2}
              tone="danger"
              onClick={menuAction(() => void sync.remove(entry))}
            >
              {t("profiles.v3.syncMods.menu.remove")}
            </ThemedDropdownItem>
          </ThemedDropdown>
        </div>

        <Tooltip
          content={
            lockedByPack
              ? t("profiles.v3.syncMods.toggle.locked")
              : t(onHere ? "profiles.v3.syncMods.toggle.turnOff" : "profiles.v3.syncMods.toggle.turnOn")
          }
          wrapperClassName="flex-shrink-0"
        >
          <div className="flex items-center">
            <ToggleSwitch
              checked={onHere}
              onChange={() => void sync.setHere([entry], !onHere)}
              disabled={busy || lockedByPack}
              size="sm"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

const MUTED = "text-fg-3";

const STATUS_BADGES: Record<Exclude<ProfileSyncModStatus, "active">, { label: string; icon: LucideIcon; tone: string }> = {
  pending: { label: "pending", icon: Clock, tone: MUTED },
  disabled: { label: "disabled", icon: XCircle, tone: MUTED },
  excluded_here: { label: "excludedHere", icon: XCircle, tone: MUTED },
  disabled_for_version: { label: "disabledForVersion", icon: XCircle, tone: MUTED },
  shadowed: { label: "shadowed", icon: Layers, tone: "text-warn" },
};

function statusBadge(entry: ProfileSyncPackMod, mcVersion: string, t: TFunction) {
  if (entry.status === "active") return null;
  const badge = STATUS_BADGES[entry.status];
  const hintKey =
    entry.status === "shadowed"
      ? entry.shadowed_by_pack
        ? "shadowedByPack"
        : "shadowedByProfile"
      : badge.label;
  const vars = { version: mcVersion, pack: entry.shadowed_by_pack };
  return {
    label: t(`profiles.v3.syncMods.status.${badge.label}`, vars),
    hint: t(`profiles.v3.syncMods.hint.${hintKey}`, vars),
    icon: badge.icon,
    tone: badge.tone,
  };
}
