"use client";

/**
 * WorldsTabV3 — funktionale Version (worlds only).
 *
 * Servers bekommen spaeter einen eigenen Left-Rail-Entry + ServersTabV3.
 * Props-Shape gleich wie V2 WorldsTab damit der Parent (ProfileDetailViewV3)
 * 1:1 switchen kann.
 */

import {
  AlertTriangle, ClipboardCopy, Copy, FolderOpen, Globe, HeartCrack, Loader2, Lock, LogIn,
  MoreHorizontal, Play, RefreshCw, Server, Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import type { Profile } from "../../../../types/profile";
import type { WorldInfo, ServerInfo, ServerPingInfo } from "../../../../types/minecraft";
import * as WorldService from "../../../../services/world-service";
import { parseMotdToHtml } from "../../../../utils/motd-utils";
import { useThemeStore } from "../../../../store/useThemeStore";
import { useAppDragDropStore } from "../../../../store/appStore";
import { useProfileStore } from "../../../../store/profile-store";
import { useGlobalModal } from "../../../../hooks/useGlobalModal";
import { useProfileLaunch } from "../../../../hooks/useProfileLaunch.tsx";
import { useDelayedTrue } from "../../../../hooks/useDelayedTrue";
import { formatRelativeTime } from "../../../../utils/format-relative-time";
import { cn } from "../../../../lib/utils";
import { Tooltip } from "../../../ui/Tooltip";
import { CheckboxV2 } from "../../../ui/CheckboxV2";
import { SearchWithFilters } from "../../../ui/SearchWithFilters";
import { ContentActionButtons, type ContentActionButton } from "../../../ui/ContentActionButtons";
import type { DropdownOption } from "../../../ui/CustomDropdown";
import { ConfirmDeleteDialog } from "../../../modals/ConfirmDeleteDialog";
import { CopyWorldDialog } from "../../../modals/CopyWorldDialog";
import { ThemedDropdown, ThemedDropdownItem } from "../shared/ThemedDropdown";
import { EmptyStateV3 } from "../shared/EmptyStateV3";
import { FloatingActionBar, type FABActionConfig } from "../shared/FloatingActionBar";
import { RowIcon, rowSurface } from "./local-content/ContentTile";
import { parseErrorMessage } from "../../../../utils/error-utils";

interface WorldsTabV3Props {
  profile: Profile;
  isActive?: boolean;
  onRefresh?: () => void;
  onLaunchRequest?: (params: {
    profileId: string;
    quickPlaySingleplayer?: string;
    quickPlayMultiplayer?: string;
  }) => void;
}

type SortKey = "lastPlayed" | "name";

const SORT_OPTIONS: { value: SortKey; labelKey: string; icon: string }[] = [
  { value: "lastPlayed", labelKey: "worlds.sort.last_played", icon: "solar:clock-circle-bold" },
  { value: "name",       labelKey: "worlds.sort.name",        icon: "solar:sort-from-top-to-bottom-bold" },
];

/**
 * Column layout shared by the world and server rows and the section headers, in the style of the
 * content rows (local-content/ContentTile.tsx): two text lines per row because worlds carry mode and
 * difficulty, servers their MOTD.
 */
const ROW = {
  root: "group relative flex items-center gap-3 h-14 px-5 transition-colors duration-fast",
  check: "w-4 flex-shrink-0 flex items-center justify-center transition-opacity duration-fast",
  icon: "relative w-9 h-9 flex-shrink-0",
  main: "flex-1 min-w-0",
  version: "hidden lg:block w-[104px] flex-shrink-0 truncate cc-num text-[12px] text-fg-3",
  stat: "w-[96px] flex-shrink-0 text-right cc-num text-[11px] leading-[1.45]",
  actions: "w-[124px] flex-shrink-0 flex items-center justify-end gap-1",
};

/** Row action (Play / Join): a small secondary button that shows on row hover. */
const rowActionClass = (disabled: boolean) => cn(
  "h-7 px-2.5 inline-flex items-center gap-1.5 border text-[12px] font-[520] flex-shrink-0",
  "transition-[opacity,background-color,color] duration-fast opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
  disabled ? "border-line text-fg-4 cursor-not-allowed" : "border-line-2 text-fg hover:bg-s3",
);

export function WorldsTabV3({ profile, isActive = true, onRefresh, onLaunchRequest }: WorldsTabV3Props) {
  const { t } = useTranslation();
  const accentColor = useThemeStore((s) => s.accentColor);
  const { setActiveDropContext, registerWorldsRefreshCallback, unregisterWorldsRefreshCallback } = useAppDragDropStore();
  const { showModal, hideModal } = useGlobalModal();
  const { profiles: allProfiles, loading: isLoadingProfiles } = useProfileStore();

  // useProfileLaunch teilt den State ueber den Zustand-Store pro profileId
  // → `isLaunching` hier ist identisch zu dem im Parent (Hero-Play-Button).
  const { isLaunching, handleQuickPlayLaunch } = useProfileLaunch({
    profileId: profile.id,
    onLaunchSuccess: () => { /* noop */ },
    onLaunchError: (err) => console.error("[V3 Worlds] Launch error:", err),
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [serverPings, setServerPings] = useState<Record<string, ServerPingInfo | "pending" | "error">>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("lastPlayed");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoverMenuId, setHoverMenuId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // `mounted` ref verhindert setState auf einem unmounted Component nachdem
  // async Pings zurueckkommen. Wird bei unmount/Profile-Wechsel zu false gesetzt.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load worlds + servers ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [ws, svs] = await Promise.all([
        WorldService.getWorldsForProfile(profile.id),
        WorldService.getServersForProfile(profile.id),
      ]);
      if (!mountedRef.current) return;
      setWorlds(ws);
      setServers(svs);

      // Ping-Status initial auf "pending" setzen und alle parallel pingen.
      // Ergebnisse kommen asynchron rein — UI zeigt Spinner bis dahin.
      // mountedRef-Check bei allen Responses damit kein setState nach unmount.
      const initial: Record<string, "pending"> = {};
      for (const s of svs) if (s.address) initial[s.address] = "pending";
      setServerPings(initial);
      for (const s of svs) {
        if (!s.address) continue;
        const addr = s.address;
        WorldService.pingMinecraftServer(addr)
          .then((info) => {
            if (mountedRef.current) setServerPings(prev => ({ ...prev, [addr]: info }));
          })
          .catch(() => {
            if (mountedRef.current) setServerPings(prev => ({ ...prev, [addr]: "error" }));
          });
      }
    } catch (err) {
      console.error("[V3 Worlds] Failed to load worlds/servers:", err);
      if (mountedRef.current) setError(parseErrorMessage(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    if (isActive) void loadData();
  }, [isActive, loadData]);

  // Drag-drop context + Worlds-Refresh-Callback registrieren.
  // Ref-Pattern damit `loadData`-Identitaet nicht den Effect neu feuert.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  useEffect(() => {
    if (!isActive || !profile?.id) return;
    setActiveDropContext(profile.id, null);
    registerWorldsRefreshCallback(() => loadDataRef.current());
    return () => {
      setActiveDropContext(null, null);
      unregisterWorldsRefreshCallback();
    };
  }, [isActive, profile?.id, setActiveDropContext, registerWorldsRefreshCallback, unregisterWorldsRefreshCallback]);

  // ── Sort + Filter ─────────────────────────────────────────────────────────
  const visibleWorlds = useMemo(() => {
    let list = worlds;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => (w.display_name ?? w.folder_name).toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sortBy === "lastPlayed") {
      sorted.sort((a, b) => (b.last_played ?? 0) - (a.last_played ?? 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => (a.display_name ?? a.folder_name).localeCompare(b.display_name ?? b.folder_name));
    }
    return sorted;
  }, [worlds, searchQuery, sortBy]);

  const visibleServers = useMemo(() => {
    if (!searchQuery.trim()) return servers;
    const q = searchQuery.toLowerCase();
    return servers.filter(s => (s.name ?? "").toLowerCase().includes(q) || (s.address ?? "").toLowerCase().includes(q));
  }, [servers, searchQuery]);

  const sortDropdownOptions: DropdownOption[] = useMemo(
    () => SORT_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey), icon: o.icon })),
    [t],
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleJoin = useCallback((server: ServerInfo) => {
    if (!server.address) return;
    if (onLaunchRequest) {
      onLaunchRequest({ profileId: profile.id, quickPlayMultiplayer: server.address });
    } else {
      toast.success(t("profiles.toast.joining_server", { name: server.name ?? server.address }));
      handleQuickPlayLaunch(undefined, server.address);
    }
  }, [profile.id, onLaunchRequest, handleQuickPlayLaunch, t]);

  const handleRepingServer = useCallback((address: string) => {
    setServerPings(prev => ({ ...prev, [address]: "pending" }));
    WorldService.pingMinecraftServer(address)
      .then(info => { if (mountedRef.current) setServerPings(prev => ({ ...prev, [address]: info })); })
      .catch(() => { if (mountedRef.current) setServerPings(prev => ({ ...prev, [address]: "error" })); });
  }, []);

  const handlePlay = useCallback((world: WorldInfo) => {
    // Toast wird vom Parent (handleLaunchRequest) gefeuert wenn onLaunchRequest
    // uebergeben ist; wir toasten nur wenn wir den Fallback-Pfad nehmen.
    if (onLaunchRequest) {
      onLaunchRequest({ profileId: profile.id, quickPlaySingleplayer: world.folder_name });
    } else {
      toast.success(t("profiles.toast.launching_world", { name: world.display_name ?? world.folder_name }));
      handleQuickPlayLaunch(world.folder_name, undefined);
    }
  }, [profile.id, onLaunchRequest, handleQuickPlayLaunch, t]);

  const handleOpenFolder = useCallback(async (world: WorldInfo) => {
    if (!world.icon_path) {
      toast.error(t("worlds.path_not_available"));
      return;
    }
    try {
      await revealItemInDir(world.icon_path);
    } catch (err) {
      toast.error(t("worlds.open_folder_failed", { error: parseErrorMessage(err) }));
    }
  }, [t]);

  const handleDelete = useCallback((world: WorldInfo) => {
    const modalId = `delete-world-${world.folder_name}`;
    const displayName = world.display_name ?? world.folder_name;
    const doDelete = async () => {
      try {
        await toast.promise(
          WorldService.deleteWorld(profile.id, world.folder_name),
          {
            loading: t("worlds.deleting", { name: displayName }),
            success: t("worlds.delete_success", { name: displayName }),
            error: (err) => t("worlds.delete_failed", { error: parseErrorMessage(err) }),
          },
        );
        await loadData();
      } finally {
        hideModal(modalId);
      }
    };
    showModal(modalId, (
      <ConfirmDeleteDialog
        isOpen={true}
        itemName={displayName}
        onClose={() => hideModal(modalId)}
        onConfirm={doDelete}
        isDeleting={false}
        title={t("worlds.delete_title")}
        message={<p className="text-[13px] text-fg-2 leading-[1.5]">{t("worlds.delete_confirm", { name: displayName })}</p>}
      />
    ));
  }, [profile.id, showModal, hideModal, loadData, t]);

  const handleCopy = useCallback((world: WorldInfo) => {
    const modalId = `copy-world-${world.folder_name}`;
    const displayName = world.display_name ?? world.folder_name;
    const doCopy = async (params: { targetProfileId: string; targetWorldName: string }) => {
      try {
        await toast.promise(
          WorldService.copyWorld({
            source_profile_id: profile.id,
            source_world_folder: world.folder_name,
            target_profile_id: params.targetProfileId,
            target_world_name: params.targetWorldName,
          }),
          {
            loading: t("worlds.copying", { name: displayName }),
            success: t("worlds.copy_success", { name: params.targetWorldName }),
            error: (err) => t("worlds.copy_failed", { error: parseErrorMessage(err) }),
          },
        );
        hideModal(modalId);
        if (params.targetProfileId === profile.id) await loadData();
      } catch (err) {
        console.error("[V3 Worlds] Copy failed:", err);
      }
    };
    showModal(modalId, (
      <CopyWorldDialog
        isOpen={true}
        sourceWorldName={displayName}
        sourceProfileId={profile.id}
        availableProfiles={allProfiles}
        isLoadingProfiles={isLoadingProfiles}
        isCopying={false}
        onClose={() => hideModal(modalId)}
        onConfirm={doCopy}
      />
    ));
  }, [profile.id, showModal, hideModal, allProfiles, isLoadingProfiles, loadData, t]);

  const handleImport = useCallback(async () => {
    try {
      const selectedPath = await openDialog({
        directory: true,
        multiple: false,
        title: t("worlds.import_title"),
      });
      if (!selectedPath) return;
      const worldPath = typeof selectedPath === "string" ? selectedPath : selectedPath[0];
      if (!worldPath) return;

      const folderName = worldPath.split(/[/\\]/).pop() || "Imported World";
      await toast.promise(
        WorldService.importWorld(profile.id, worldPath, folderName),
        {
          loading: t("worlds.importing", { name: folderName }),
          success: t("worlds.import_success", { name: folderName }),
          error: (err) => t("worlds.import_failed", { error: parseErrorMessage(err) }),
        },
      );
      await loadData();
    } catch (err) {
      console.error("[V3 Worlds] Import failed:", err);
    }
  }, [profile.id, loadData, t]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const targets = worlds.filter(w => selectedIds.has(w.folder_name));
    const modalId = "batch-delete-worlds";
    const doBatchDelete = async () => {
      setIsBatchDeleting(true);
      try {
        for (const w of targets) {
          try { await WorldService.deleteWorld(profile.id, w.folder_name); }
          catch (err) { console.error("[V3 Worlds] Delete failed for", w.folder_name, err); }
        }
        toast.success(t("worlds.batch_delete_success", { count: targets.length }));
        setSelectedIds(new Set());
        await loadData();
      } finally {
        setIsBatchDeleting(false);
        hideModal(modalId);
      }
    };
    showModal(modalId, (
      <ConfirmDeleteDialog
        isOpen={true}
        itemName={t("worlds.batch_delete_item_name", { count: targets.length })}
        onClose={() => hideModal(modalId)}
        onConfirm={doBatchDelete}
        isDeleting={isBatchDeleting}
        title={t("worlds.batch_delete_title")}
        message={<p className="text-[13px] text-fg-2 leading-[1.5]">{t("worlds.batch_delete_confirm", { count: targets.length })}</p>}
      />
    ));
  }, [selectedIds, worlds, profile.id, showModal, hideModal, loadData, isBatchDeleting, t]);

  const handleManualRefresh = useCallback(async () => {
    await loadData();
    onRefresh?.();
  }, [loadData, onRefresh]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Esc clears selection
  const clearSelectionRef = useRef(() => setSelectedIds(new Set()));
  clearSelectionRef.current = () => setSelectedIds(new Set());
  const hasSelection = selectedIds.size > 0;
  useEffect(() => {
    if (!hasSelection) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clearSelectionRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSelection]);

  const shouldShowLoading = useDelayedTrue(loading && worlds.length === 0, 500);

  const fabActions: FABActionConfig[] = [
    {
      icon: Trash2,
      label: isBatchDeleting ? "…" : t("profiles.v3.fab.delete"),
      tone: "danger",
      onClick: handleBatchDelete,
      disabled: isBatchDeleting,
    },
  ];

  const toolbarActions: ContentActionButton[] = [
    {
      id: "refresh",
      icon: "solar:refresh-bold",
      variant: "text",
      disabled: loading,
      loading,
      tooltip: t("profiles.v3.toolbar.refresh"),
      onClick: () => { void handleManualRefresh(); },
    },
    {
      id: "import",
      label: t("worlds.import_world"),
      icon: "solar:import-bold",
      variant: "highlight",
      tooltip: t("worlds.import_title"),
      onClick: () => { void handleImport(); },
    },
  ];

  return (
    <div className="flex flex-col min-h-0 flex-1 relative">
      <div className="flex items-center gap-3 px-5 h-12 border-b border-line flex-shrink-0">
        <SearchWithFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={t("worlds.search_placeholder")}
          sortOptions={sortDropdownOptions}
          sortValue={sortBy}
          onSortChange={(v) => setSortBy(v as SortKey)}
          showFilter={false}
          dropdownSize="sm"
          className="flex-1 min-w-0"
        />
        <ContentActionButtons actions={toolbarActions} size="sm" />
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${hasSelection ? "pb-20" : "pb-4"}`}>
        {error && (
          <div
            className="mx-5 mt-4 flex items-start gap-2.5 px-3 py-2 border border-err/30 bg-err/10"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <AlertTriangle size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-px" />
            <div className="flex-1 min-w-0 text-[12px] text-fg-2 break-words leading-[1.5]">{error}</div>
            <button
              type="button"
              onClick={() => loadData()}
              className="flex-shrink-0 h-6 px-2 text-[12px] font-[520] text-err hover:bg-err/10 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {t("profiles.v3.content.retry")}
            </button>
          </div>
        )}

        {loading && worlds.length === 0 && servers.length === 0 ? (
          shouldShowLoading ? (
            <div className="flex items-center justify-center gap-2 h-40 text-[12px] text-fg-3 animate-in fade-in duration-300">
              <Loader2 size={14} className="animate-spin" />
              {t("profiles.v3.content.loading")}
            </div>
          ) : (
            <div className="h-40" />
          )
        ) : visibleWorlds.length === 0 && visibleServers.length === 0 ? (
          <EmptyStateV3
            icon="solar:planet-bold-duotone"
            title={searchQuery ? t("worlds.no_match_search", { query: searchQuery }) : t("worlds.none_found")}
            hint={searchQuery ? undefined : t("worlds.create_in_minecraft")}
          />
        ) : (
          // Worlds first (sorted), then the servers in servers.dat order, each under a column header.
          <>
            {visibleWorlds.length > 0 && (
              <section>
                <SectionHeader
                  label={t("profiles.tabs.worlds")}
                  count={visibleWorlds.length}
                  statLabel={t("profiles.columns.lastPlayed")}
                />
                <div className="divide-y divide-line border-b border-line">
                  {visibleWorlds.map((world) => (
                    <WorldRow
                      key={`world:${world.folder_name}`}
                      world={world}
                      isSelected={selectedIds.has(world.folder_name)}
                      selectMode={hasSelection}
                      isLaunching={isLaunching}
                      onToggleSelection={() => toggleSelection(world.folder_name)}
                      onPlay={() => handlePlay(world)}
                      onCopy={() => handleCopy(world)}
                      onOpenFolder={() => handleOpenFolder(world)}
                      onDelete={() => handleDelete(world)}
                      menuOpen={hoverMenuId === world.folder_name}
                      onMenuToggle={(open) => setHoverMenuId(open ? world.folder_name : null)}
                    />
                  ))}
                </div>
              </section>
            )}
            {visibleServers.length > 0 && (
              <section className={visibleWorlds.length > 0 ? "mt-6" : undefined}>
                <SectionHeader
                  label={t("profiles.v3.servers.title")}
                  count={visibleServers.length}
                  statLabel={t("profiles.v3.servers.ping")}
                />
                <div className="divide-y divide-line border-b border-line">
                  {visibleServers.map((server) => {
                    const address = server.address ?? "";
                    const pingState = address ? serverPings[address] : undefined;
                    return (
                      <ServerRow
                        key={`server:${address || server.name || ""}`}
                        server={server}
                        pingState={pingState}
                        isLaunching={isLaunching}
                        menuOpen={hoverMenuId === `server:${address}`}
                        onMenuToggle={(open) => setHoverMenuId(open ? `server:${address}` : null)}
                        onJoin={() => handleJoin(server)}
                        onReping={() => address && handleRepingServer(address)}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <FloatingActionBar
        visible={hasSelection}
        count={selectedIds.size}
        totalCount={visibleWorlds.length}
        accent={accentColor.value}
        allSelected={selectedIds.size === visibleWorlds.length && visibleWorlds.length > 0}
        onSelectAll={() => setSelectedIds(new Set(visibleWorlds.map(w => w.folder_name)))}
        onClear={() => setSelectedIds(new Set())}
        actions={fabActions}
        batchProgress={null}
      />
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ label: string; count: number; statLabel: string }> = ({ label, count, statLabel }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 h-8 px-5 border-b border-line">
      <div className="w-4 flex-shrink-0" />
      <div className="w-9 flex-shrink-0" />
      <div className="flex-1 min-w-0 cc-eyebrow truncate">
        {label}
        <span className="cc-num normal-case tracking-normal text-fg-4 ml-1.5">{count}</span>
      </div>
      <div className="hidden lg:block w-[104px] flex-shrink-0 cc-eyebrow">{t("profiles.columns.version")}</div>
      <div className="w-[96px] flex-shrink-0 cc-eyebrow text-right">{statLabel}</div>
      <div className="w-[124px] flex-shrink-0" />
    </div>
  );
};

/** The ⋯ button of a row; shows on row hover or while its menu is open. */
const RowMenuButton: React.FC<{ open: boolean; onToggle: (open: boolean) => void }> = ({ open, onToggle }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(!open); }}
      aria-label={t("profiles.moreOptions")}
      className={cn(
        "w-7 h-7 flex items-center justify-center text-fg-3 hover:text-fg hover:bg-s3 transition-[opacity,color,background-color] duration-fast",
        open ? "opacity-100 bg-s3 text-fg" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <MoreHorizontal size={15} strokeWidth={1.75} />
    </button>
  );
};

// ─── World row ──────────────────────────────────────────────────────────────
interface WorldRowProps {
  world: WorldInfo;
  isSelected: boolean;
  selectMode: boolean;
  isLaunching: boolean;
  onToggleSelection: () => void;
  onPlay: () => void;
  onCopy: () => void;
  onOpenFolder: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
}

const WorldRow: React.FC<WorldRowProps> = ({
  world, isSelected, selectMode, isLaunching, onToggleSelection,
  onPlay, onCopy, onOpenFolder, onDelete, menuOpen, onMenuToggle,
}) => {
  const { t } = useTranslation();
  const displayName = world.display_name ?? world.folder_name;
  const lastPlayedIso = world.last_played ? new Date(world.last_played).toISOString() : null;
  const gameModeLabel = WorldService.getGameModeString(world.game_mode ?? 0);
  const difficultyLabel = WorldService.getDifficultyString(world.difficulty ?? 0);
  const iconUrl = world.icon_path ? convertFileSrc(world.icon_path) : null;

  return (
    <div className={cn(ROW.root, rowSurface(isSelected))} onDoubleClick={() => { if (!isLaunching) onPlay(); }}>
      <div className={cn(ROW.check, selectMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <CheckboxV2
          size="sm"
          checked={isSelected}
          onChange={() => onToggleSelection()}
          tooltip={isSelected ? t("profiles.v3.tile.deselect") : t("profiles.v3.tile.select")}
        />
      </div>

      <div className={ROW.icon}>
        <RowIcon src={iconUrl} fallback={<Globe size={16} strokeWidth={1.75} className="text-fg-4" />} />
      </div>

      <div className={ROW.main}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="min-w-0 truncate text-[13px] font-[520] text-fg" title={displayName}>{displayName}</span>
          {world.is_hardcore && (
            <Tooltip content={t("worlds.hardcore")}>
              <HeartCrack size={12} strokeWidth={1.75} className="text-err flex-shrink-0" />
            </Tooltip>
          )}
          {world.difficulty_locked && (
            <Tooltip content={t("worlds.difficulty_locked")}>
              <Lock size={11} strokeWidth={1.75} className="text-fg-4 flex-shrink-0" />
            </Tooltip>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-fg-3 truncate">
          {gameModeLabel}
          <span className="text-fg-4 mx-1.5">·</span>
          {difficultyLabel}
        </div>
      </div>

      <div className={ROW.version} title={world.version_name ?? undefined}>{world.version_name ?? "—"}</div>

      <div className={cn(ROW.stat, "text-fg-3")}>{formatRelativeTime(lastPlayedIso)}</div>

      <div className={ROW.actions}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          disabled={isLaunching}
          className={cn(rowActionClass(false), isLaunching && "cursor-wait text-fg-2")}
          style={{ borderRadius: "var(--r-sm)" }}
          title={t("worlds.play_this_world")}
        >
          {isLaunching
            ? <Loader2 size={12} className="animate-spin" />
            : <Play size={12} strokeWidth={2} />}
          {t("profiles.play")}
        </button>
        <div className="relative flex-shrink-0">
          <RowMenuButton open={menuOpen} onToggle={onMenuToggle} />
          <ThemedDropdown open={menuOpen} onClose={() => onMenuToggle(false)} width="w-52">
            <ThemedDropdownItem icon={Copy} onClick={() => { onCopy(); onMenuToggle(false); }}>
              {t("worlds.copy")}
            </ThemedDropdownItem>
            <ThemedDropdownItem icon={FolderOpen} onClick={() => { onOpenFolder(); onMenuToggle(false); }}>
              {t("profiles.v3.tile.openFolder")}
            </ThemedDropdownItem>
            <ThemedDropdownItem icon={Trash2} tone="danger" onClick={() => { onDelete(); onMenuToggle(false); }}>
              {t("profiles.v3.tile.delete")}
            </ThemedDropdownItem>
          </ThemedDropdown>
        </div>
      </div>
    </div>
  );
};

// ─── Server row ─────────────────────────────────────────────────────────────
interface ServerRowProps {
  server: ServerInfo;
  pingState: ServerPingInfo | "pending" | "error" | undefined;
  isLaunching: boolean;
  menuOpen: boolean;
  onMenuToggle: (open: boolean) => void;
  onJoin: () => void;
  onReping: () => void;
}

/** Muted state colours for the latency: good, normal, slow, bad. */
const latencyTone = (ms: number): { dot: string; text: string } => {
  if (ms < 80)  return { dot: "bg-ok", text: "text-ok" };
  if (ms < 150) return { dot: "bg-fg-3", text: "text-fg-2" };
  if (ms < 250) return { dot: "bg-warn", text: "text-warn" };
  return { dot: "bg-err", text: "text-err" };
};

const ServerRow: React.FC<ServerRowProps> = ({ server, pingState, isLaunching, menuOpen, onMenuToggle, onJoin, onReping }) => {
  const { t } = useTranslation();
  const name = server.name ?? server.address ?? "—";
  const address = server.address ?? "";
  const isPending = pingState === "pending";
  const isError = pingState === "error" || (pingState && typeof pingState === "object" && pingState.error);
  const ping = (pingState && typeof pingState === "object" && !pingState.error) ? pingState : null;
  const joinDisabled = !!isError || !address;

  // Favicon: ping liefert aktuelles (base64), fallback auf server.icon_base64 (aus servers.dat).
  const iconBase64 = ping?.favicon_base64 ?? server.icon_base64 ?? null;
  // MOTD: description_json hat Priority (enthaelt Chat-Component mit Farben),
  // description ist der plain-string-Fallback (oft ohne §-Codes).
  const motdInput = ping?.description_json ?? ping?.description ?? "";
  const tone = ping?.latency_ms != null ? latencyTone(ping.latency_ms) : null;

  return (
    <div className={cn(ROW.root, "hover:bg-s2")} onDoubleClick={() => { if (!joinDisabled && !isLaunching) onJoin(); }}>
      <div className={ROW.check} />

      <div className={ROW.icon}>
        <RowIcon
          src={iconBase64 ? `data:image/png;base64,${iconBase64}` : null}
          dim={!!isError}
          fallback={<Server size={16} strokeWidth={1.75} className="text-fg-4" />}
        />
      </div>

      <div className={ROW.main}>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={cn("min-w-0 truncate text-[13px] font-[520]", isError ? "text-fg-3" : "text-fg")} title={name}>
            {name}
          </span>
          {address && <span className="min-w-0 truncate cc-num text-[11px] text-fg-4" title={address}>{address}</span>}
        </div>
        {isError ? (
          <div className="mt-0.5 text-[12px] text-err truncate">{t("profiles.v3.servers.offline")}</div>
        ) : isPending ? (
          <div className="mt-0.5 text-[12px] text-fg-3 flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" />
            {t("profiles.v3.servers.pinging")}
          </div>
        ) : motdInput ? (
          // the MOTD's two lines become one, the row has room for a single line
          <div
            className="mt-0.5 text-[12px] text-fg-2 truncate"
            dangerouslySetInnerHTML={{ __html: parseMotdToHtml(motdInput).replace(/<br\s*\/?>/gi, " ") }}
          />
        ) : null}
      </div>

      <div className={ROW.version} title={ping?.version_name ?? undefined}>{ping?.version_name ?? "—"}</div>

      <div className={ROW.stat}>
        {ping && ping.players_online != null && ping.players_max != null && (
          <div className="text-fg-2">{ping.players_online}/{ping.players_max}</div>
        )}
        {ping && tone && (
          <div className={cn("inline-flex items-center gap-1.5", tone.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", tone.dot)} />
            {ping.latency_ms} ms
          </div>
        )}
        {!ping && <span className="text-fg-4">—</span>}
      </div>

      <div className={ROW.actions}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
          disabled={joinDisabled || isLaunching}
          className={cn(rowActionClass(joinDisabled), isLaunching && !joinDisabled && "cursor-wait text-fg-2")}
          style={{ borderRadius: "var(--r-sm)" }}
          title={t("profiles.v3.servers.join")}
        >
          {isLaunching && !joinDisabled
            ? <Loader2 size={12} className="animate-spin" />
            : <LogIn size={12} strokeWidth={2} />}
          {t("profiles.v3.servers.joinShort")}
        </button>
        <div className="relative flex-shrink-0">
          <RowMenuButton open={menuOpen} onToggle={onMenuToggle} />
          <ThemedDropdown open={menuOpen} onClose={() => onMenuToggle(false)} width="w-52">
            <ThemedDropdownItem icon={RefreshCw} onClick={() => { onReping(); onMenuToggle(false); }}>
              {t("profiles.v3.servers.reping")}
            </ThemedDropdownItem>
            <ThemedDropdownItem
              icon={ClipboardCopy}
              onClick={() => { if (address) navigator.clipboard.writeText(address); onMenuToggle(false); }}
            >
              {t("profiles.v3.servers.copyAddress")}
            </ThemedDropdownItem>
          </ThemedDropdown>
        </div>
      </div>
    </div>
  );
};
