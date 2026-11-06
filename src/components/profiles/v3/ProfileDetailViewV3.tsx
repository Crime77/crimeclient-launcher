"use client";

/**
 * ProfileDetailViewV3 — the profile detail view.
 *
 * Structure: header (breadcrumb + utility actions · icon, name, editable meta, stats, PLAY)
 * · left rail navigation · main content (content tabs, worlds, screenshots, logs).
 *
 * Wrapper-Toggle in `ProfileDetailViewV2Wrapper.tsx` (USE_V3) schaltet
 * zwischen altem V2 und V3 um.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Copy, FolderOpen, Layers, Loader2, MoreHorizontal, Package, PenLine,
  Play, Settings2, Square, Upload, User,
} from "lucide-react";
import { preloadIcons } from "../../../lib/icon-utils";

// iconify names still used by the context menu and the tabs' empty states
preloadIcons([
  "solar:settings-bold", "solar:copy-bold", "solar:download-bold", "solar:archive-bold",
  "solar:folder-bold", "solar:trash-bin-trash-bold",
]);

import type { Profile } from "../../../types/profile";
import { setDiscordState } from "../../../utils/discordRpc";
import { formatRelativeTime, formatPlaytime, formatBytes } from "../../../utils/format-relative-time";
import { parseMotdToHtml } from "../../../utils/motd-utils";
import { cn } from "../../../lib/utils";
import { loaderLabel } from "../../../lib/loader-icons";
import { useThemeStore } from "../../../store/useThemeStore";
import { useProfileStore } from "../../../store/profile-store";
import { useGlobalModal } from "../../../hooks/useGlobalModal";
import * as ProfileService from "../../../services/profile-service";
import UnifiedService from "../../../services/unified-service";
import type { UnifiedModpackVersionsResponse } from "../../../types/unified";
import { useProfileDuplicateStore } from "../../../store/profile-duplicate-store";
import { useProfileLaunch } from "../../../hooks/useProfileLaunch.tsx";
import { useAppDragDropStore } from "../../../store/appStore";
import { useMinecraftAuthStore } from "../../../store/minecraft-auth-store";
import { usePlayerAvatar } from "../../../hooks/usePlayerAvatar";
import { useResolvedLoaderVersion } from "../../../hooks/useResolvedLoaderVersion";

import { ProfileIconV2 } from "../ProfileIconV2";
import { ExportProfileModal } from "../ExportProfileModal";
import { ModpackVersionsModal } from "../../modals/ModpackVersionsModal";
import { ConfirmDeleteDialog } from "../../modals/ConfirmDeleteDialog";
import { SettingsContextMenu, type ContextMenuItem } from "../../ui/SettingsContextMenu";
import { Tooltip } from "../../ui/Tooltip";

import { ProfileLeftRailV3, type NavKey, CONTENT_NAV_KEYS } from "./ProfileLeftRailV3";
import { EditableChipV3 } from "./chips/EditableChipV3";
import { GameVersionPickerV3 } from "./chips/GameVersionPickerV3";
import { LoaderBadgeV3 } from "./chips/LoaderBadgeV3";
import { LoaderVersionPickerV3 } from "./chips/LoaderVersionPickerV3";
import { useHeroChipEditors } from "./chips/useHeroChipEditors";
import { LocalContentTabV3 } from "./tabs/LocalContentTabV3";
import { WorldsTabV3 } from "./tabs/WorldsTabV3";
import { CrimeShaderTabV3 } from "./tabs/CrimeShaderTabV3";
import { ScreenshotsTabV3 } from "./tabs/ScreenshotsTabV3";
import { LogsTabV3 } from "./tabs/LogsTabV3";
import type { LocalContentItem } from "../../../hooks/useLocalContentManager";
import { parseErrorMessage } from "../../../utils/error-utils";
import { useContentCacheStore } from "../../../store/content-cache-store";

const mainTabFor = (k: NavKey): string =>
  CONTENT_NAV_KEYS.includes(k) ? "content" : k;

interface ProfileDetailViewV3Props {
  profile: Profile;
  onClose: () => void;
  onEdit: () => void;
}

// ─── Atoms ─────────────────────────────────────────────────────────────────
const Sep: React.FC = () => <span className="text-fg-4 select-none px-0.5">·</span>;

/** One stat of the mono meta line: quiet label, value in fg-2. */
const Stat: React.FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
    <span className="text-fg-4">{label}</span>
    <span className={cn("cc-num", muted ? "text-fg-3" : "text-fg-2")} title={value}>{value}</span>
  </span>
);

const UtilityButton: React.FC<{
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
}> = ({ label, onClick, children, buttonRef }) => (
  <Tooltip content={label} position="bottom" delay={0}>
    <button ref={buttonRef} type="button" onClick={onClick} className="cc-icon-btn" aria-label={label}>
      {children}
    </button>
  </Tooltip>
);

// ─── Main ──────────────────────────────────────────────────────────────────
export function ProfileDetailViewV3({
  profile,
  onClose,
  onEdit,
}: ProfileDetailViewV3Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [activeNavItem, setActiveNavItem] = useState<NavKey>("mods");

  // Inline-edit chip editors — owns fetchers + save + lock state
  const chipEditors = useHeroChipEditors(currentProfile, setCurrentProfile);

  // Group-chip draft input (persisted-on-Save via chipEditors.saveGroup)
  const [groupDraft, setGroupDraft] = useState<string>(profile.group ?? "");

  useEffect(() => { setDiscordState("Editing a Profile"); }, []);

  // Context menu state
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const contextMenuId = `profile-detail-v3-${profile.id}`;
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [modpackVersions, setModpackVersions] = useState<UnifiedModpackVersionsResponse | null>(() => {
    const source = profile.modpack_info?.source;
    if (!source) return null;
    return useContentCacheStore.getState().getModpackVersions(JSON.stringify(source)) ?? null;
  });

  const { showModal, hideModal } = useGlobalModal();
  const { openContextMenuId, setOpenContextMenuId } = useThemeStore();
  const { fetchProfiles } = useProfileStore();
  const { setActiveMainTab: setDragDropMainTab } = useAppDragDropStore();
  const { openModal: openDuplicateModal } = useProfileDuplicateStore();

  const accounts = useMinecraftAuthStore((state) => state.accounts);
  const preferredAccount = currentProfile.preferred_account_id
    ? accounts.find(acc => acc.id === currentProfile.preferred_account_id)
    : null;
  const preferredAccountAvatarUrl = usePlayerAvatar({
    uuid: preferredAccount?.id,
    overlay: true,
  });

  const { isLaunching, statusMessage, handleLaunch, handleQuickPlayLaunch } = useProfileLaunch({
    profileId: profile.id,
    onLaunchSuccess: () => {},
    onLaunchError: (error) => console.error("[V3] Profile launch error:", error),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const getGenericDisplayFileName = useCallback(
    (item: LocalContentItem) => item.modrinth_info?.name || item.curseforge_info?.name || item.filename,
    [],
  );

  // Stub — tabs handle their own refresh; mirrors V2's handleRefresh noop.
  const handleRefresh = useCallback(() => {}, []);

  const handleLaunchRequest = useCallback(async (params: {
    profileId: string;
    quickPlaySingleplayer?: string;
    quickPlayMultiplayer?: string;
  }) => {
    if (params.quickPlaySingleplayer) {
      toast.success(t('profiles.toast.launching_world', { name: params.quickPlaySingleplayer }));
      handleQuickPlayLaunch(params.quickPlaySingleplayer, undefined);
    } else if (params.quickPlayMultiplayer) {
      toast.success(t('profiles.toast.joining_server', { name: params.quickPlayMultiplayer }));
      handleQuickPlayLaunch(undefined, params.quickPlayMultiplayer);
    } else {
      handleQuickPlayLaunch(undefined, undefined);
    }
  }, [handleQuickPlayLaunch, t]);

  const handleDeleteProfile = useCallback(() => {
    if (currentProfile.is_standard_version) {
      toast.error(t('profiles.cannotDeleteStandard'));
      return;
    }
    setIsDeleteModalOpen(true);
  }, [currentProfile, t]);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const deletePromise = useProfileStore.getState().deleteProfile(currentProfile.id);
      await toast.promise(deletePromise, {
        loading: t('profiles.deletingProfile', { name: currentProfile.name }),
        success: () => {
          fetchProfiles();
          navigate("/profiles");
          setIsDeleteModalOpen(false);
          return t('profiles.deleteSuccess', { name: currentProfile.name });
        },
        error: (err) =>
          t('profiles.deleteError', { error: parseErrorMessage(err) }),
      });
    } catch (error) {
      console.error("[V3] Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [currentProfile, fetchProfiles, navigate, t]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleOpenExportModal = useCallback(() => {
    showModal(`export-profile-${currentProfile.id}`, (
      <ExportProfileModal
        profile={currentProfile}
        isOpen={true}
        onClose={() => hideModal(`export-profile-${currentProfile.id}`)}
      />
    ));
  }, [currentProfile, showModal, hideModal]);

  const handleOpenFolder = useCallback(async () => {
    const openPromise = ProfileService.openProfileFolder(currentProfile.id);
    toast.promise(openPromise, {
      loading: t('profiles.openingFolder', { name: currentProfile.name }),
      success: t('profiles.openFolderSuccess', { name: currentProfile.name }),
      error: (err) => {
        const message = parseErrorMessage(err);
        return t('profiles.openFolderError', { error: message });
      },
    });
  }, [currentProfile, t]);

  const handleDuplicateProfile = useCallback(() => {
    openDuplicateModal(currentProfile);
  }, [currentProfile, openDuplicateModal]);

  const handleOpenModpackVersionsModal = useCallback(() => {
    showModal(`modpack-versions-${currentProfile.id}`, (
      <ModpackVersionsModal
        isOpen={true}
        onClose={() => hideModal(`modpack-versions-${currentProfile.id}`)}
        versions={modpackVersions}
        modpackName={currentProfile.name}
        profileId={currentProfile.id}
        onSwitchComplete={async () => {
          try {
            await fetchProfiles();
            const updatedProfiles = useProfileStore.getState().profiles;
            const updatedProfile = updatedProfiles.find(p => p.id === currentProfile.id);
            if (updatedProfile) setCurrentProfile(updatedProfile);
          } catch (err) {
            console.error("[V3] Failed to refresh profile data after modpack switch:", err);
          }
        }}
      />
    ));
  }, [currentProfile, showModal, hideModal, modpackVersions, fetchProfiles]);

  // ── Context menu items ────────────────────────────────────────────────────
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: "edit",
      label: t('profiles.editProfile'),
      icon: "solar:settings-bold",
      onClick: () => onEdit(),
    },
    {
      id: "duplicate",
      label: t('profiles.duplicate'),
      icon: "solar:copy-bold",
      onClick: () => handleDuplicateProfile(),
    },
    {
      id: "export",
      label: t('profiles.export'),
      icon: "solar:download-bold",
      onClick: () => handleOpenExportModal(),
    },
    ...(currentProfile.modpack_info && modpackVersions ? [{
      id: "modpack-versions",
      label: t('profiles.modpackVersions'),
      icon: "solar:archive-bold",
      onClick: () => handleOpenModpackVersionsModal(),
    }] : []),
    {
      id: "open-folder",
      label: t('profiles.openFolder'),
      icon: "solar:folder-bold",
      onClick: () => handleOpenFolder(),
    },
    {
      id: "delete",
      label: t('profiles.delete'),
      icon: "solar:trash-bin-trash-bold",
      destructive: true,
      separator: true,
      onClick: () => handleDeleteProfile(),
    },
  ];

  const toggleContextMenu = useCallback((event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (openContextMenuId && openContextMenuId !== contextMenuId) {
      setOpenContextMenuId(null);
    }

    const newState = !isContextMenuOpen;
    setIsContextMenuOpen(newState);
    setOpenContextMenuId(newState ? contextMenuId : null);

    if (!isContextMenuOpen && event?.currentTarget) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const containerRect = event.currentTarget.closest('.relative')?.getBoundingClientRect();
      if (containerRect) {
        setContextMenuPosition({
          x: buttonRect.right - containerRect.left - 200,
          y: buttonRect.bottom - containerRect.top + 4,
        });
      }
    }
  }, [openContextMenuId, contextMenuId, isContextMenuOpen, setOpenContextMenuId]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentProfile(profile);
    setGroupDraft(profile.group ?? "");
  }, [profile]);

  useEffect(() => {
    setDragDropMainTab(mainTabFor(activeNavItem));
    return () => { setDragDropMainTab(null); };
  }, [activeNavItem, setDragDropMainTab]);

  // Modpack-Versions beim Mount laden bzw. wenn sich die Modpack-Quelle aendert.
  // Deps sind serialisiert statt Objekt-Identitaet, damit der Effect nicht bei
  // jedem `setCurrentProfile(profile)` aus dem Store erneut feuert.
  const modpackSource = currentProfile.modpack_info?.source;
  const modpackSourceKey = modpackSource ? JSON.stringify(modpackSource) : null;
  useEffect(() => {
    if (!modpackSource) {
      setModpackVersions(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const versions = await UnifiedService.getModpackVersions(modpackSource);
        if (modpackSourceKey) useContentCacheStore.getState().setModpackVersions(modpackSourceKey, versions);
        if (!cancelled) setModpackVersions(versions);
      } catch (err) {
        console.error("[V3] Failed to refresh modpack versions:", err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modpackSourceKey]);

  useEffect(() => {
    if (openContextMenuId && openContextMenuId !== contextMenuId && isContextMenuOpen) {
      setIsContextMenuOpen(false);
    }
  }, [openContextMenuId, contextMenuId, isContextMenuOpen]);

  // Disk usage: fetch once per profile, also refetch when a session ends
  // (Playtime-Wert hat sich dann geändert, plausibel dass sich auch Dateien änderten).
  const [diskSize, setDiskSize] = useState<number | null>(
    () => useContentCacheStore.getState().getDiskSize(profile.id) ?? null,
  );
  useEffect(() => {
    let cancelled = false;
    ProfileService.getProfileDiskSize(currentProfile.id)
      .then((size) => {
        useContentCacheStore.getState().setDiskSize(currentProfile.id, size);
        if (!cancelled) setDiskSize(size);
      })
      .catch((err) => {
        console.warn("[V3] Failed to fetch disk size:", err);
      });
    return () => { cancelled = true; };
  }, [currentProfile.id, currentProfile.playtime_seconds]);

  const resolvedLoaderVersion = useResolvedLoaderVersion(currentProfile);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasModpack = !!currentProfile.modpack_info;
  const isVanillaLoader = !currentProfile.loader || currentProfile.loader === "vanilla";
  const modpackLabel = modpackVersions?.installed_version
    ? `${modpackVersions.installed_version.name ?? t("profiles.v3.stats.modpack")}`
    : hasModpack ? t("profiles.v3.stats.modpack") : t("profiles.v3.time.placeholder");
  const modpackVersionNumber = modpackVersions?.installed_version?.version_number ?? null;
  const modCount = currentProfile.mod_count ?? currentProfile.mods?.length ?? 0;
  const nameHtml = parseMotdToHtml(currentProfile.name || currentProfile.id);

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-line px-6 pt-3 pb-5">
        {/* breadcrumb + utility actions */}
        <div className="flex items-center justify-between gap-4 h-7 -ml-2">
          <button
            type="button"
            onClick={onClose}
            className="group h-7 min-w-0 flex items-center gap-1.5 pl-2 pr-2.5 text-[12px] text-fg-3 hover:text-fg-2 hover:bg-s2 transition-colors duration-fast"
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} className="flex-shrink-0 transition-transform duration-fast group-hover:-translate-x-0.5" />
            <span className="flex-shrink-0">{t('profiles.back')}</span>
            <span className="text-fg-4 flex-shrink-0">/</span>
            <span
              className="text-fg-2 max-w-[260px] truncate"
              dangerouslySetInnerHTML={{ __html: nameHtml }}
            />
          </button>

          <div className="flex items-center gap-0.5 relative flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate("/sync-packs", { state: { fromProfileId: currentProfile.id } })}
              className="h-7 flex items-center gap-1.5 px-2 text-[12px] font-[520] text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              <Layers size={14} strokeWidth={1.75} />
              {t('syncPacks.title')}
            </button>
            <div className="w-px h-4 bg-line-2 mx-1.5" />
            <UtilityButton label={t('profiles.openFolder')} onClick={handleOpenFolder}>
              <FolderOpen size={15} strokeWidth={1.75} />
            </UtilityButton>
            <UtilityButton label={t('profiles.duplicate')} onClick={handleDuplicateProfile}>
              <Copy size={15} strokeWidth={1.75} />
            </UtilityButton>
            <UtilityButton label={t('profiles.export')} onClick={handleOpenExportModal}>
              <Upload size={15} strokeWidth={1.75} />
            </UtilityButton>
            <UtilityButton label={t('profiles.moreOptions')} onClick={toggleContextMenu} buttonRef={moreButtonRef}>
              <MoreHorizontal size={16} strokeWidth={1.75} />
            </UtilityButton>

            <SettingsContextMenu
              target={currentProfile}
              isOpen={isContextMenuOpen}
              position={contextMenuPosition}
              items={contextMenuItems}
              onClose={() => {
                setIsContextMenuOpen(false);
                setOpenContextMenuId(null);
              }}
              triggerButtonRef={moreButtonRef}
            />
          </div>
        </div>

        {/* identity + play */}
        <div className="flex items-center gap-4 mt-3">
          <div className="relative flex-shrink-0">
            <ProfileIconV2 profile={currentProfile} size="md" className="w-14 h-14 border-line-2" />
            <LoaderBadgeV3
              loader={currentProfile.loader}
              disabled={chipEditors.isLocked}
              disabledReason={chipEditors.lockReason}
              onChange={(loader) => { void chipEditors.saveLoader(loader); }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="font-display text-[24px] font-[680] leading-[1.15] text-fg truncate"
              dangerouslySetInnerHTML={{ __html: nameHtml }}
            />

            {/* editable meta */}
            <div className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5 mt-1 -ml-1 min-h-6">
              <EditableChipV3
                mono
                title={t("profiles.v3.chips.gameVersion.title")}
                withSaveCancel={false}
                width="w-64"
                disabled={chipEditors.isLocked}
                disabledReason={chipEditors.lockReason}
                onOpen={() => { void chipEditors.loadMinecraftVersions(); }}
                renderEditor={({ close }) => (
                  <GameVersionPickerV3
                    currentVersion={currentProfile.game_version}
                    versions={chipEditors.mcVersions}
                    isLoading={chipEditors.mcLoading}
                    onSelect={(v) => {
                      void chipEditors.saveGameVersion(v);
                      close();
                    }}
                  />
                )}
              >
                {currentProfile.game_version}
              </EditableChipV3>
              {!isVanillaLoader && currentProfile.loader && (() => {
                // Resolve priority (matches Rust `ModloaderFactory::resolve_loader_version`):
                //   1. settings.use_overwrite_loader_version + overwrite_loader_version
                //   2. selected_norisk_pack policy
                //   3. profile.loader_version (stored)
                //   4. auto-fetch latest from loader API
                // `resolvedLoaderVersion` already encapsulates this, so it's the
                // only source of truth for display + picker-highlight. Stored
                // is just a last-resort fallback if resolve hasn't answered yet
                // (network failure, vanilla check races, …).
                const resolved = resolvedLoaderVersion?.version ?? null;
                const stored = currentProfile.loader_version ?? null;
                const effectiveVersion = resolved || stored;
                // `reason: "not_resolved"` with no effective version means the
                // loader's API has no releases for this MC (e.g. Quilt for
                // 26.x today) — surface it explicitly instead of the useless
                // "latest" placeholder.
                const notSupported =
                  resolvedLoaderVersion?.reason === "not_resolved" && !effectiveVersion;
                const stripped = effectiveVersion?.replace(/\s*\(stable\)\s*$/i, "") ?? null;
                const displayVersion = notSupported
                  ? t("profiles.v3.chips.loaderVersion.notSupported")
                  : stripped || t("profiles.v3.chips.loaderVersion.latest");
                return (
                  <>
                    <Sep />
                    <EditableChipV3
                      withSaveCancel={false}
                      width="w-48"
                      disabled={chipEditors.isLocked}
                      disabledReason={chipEditors.lockReason}
                      onOpen={() => { void chipEditors.loadLoaderVersions(currentProfile.loader!, currentProfile.game_version); }}
                      renderEditor={({ close }) => (
                        <LoaderVersionPickerV3
                          loader={currentProfile.loader!}
                          currentVersion={effectiveVersion}
                          resolvedSource={resolvedLoaderVersion?.reason}
                          versions={chipEditors.loaderVersions}
                          isLoading={chipEditors.loaderLoading}
                          onSelect={(v) => {
                            void chipEditors.saveLoaderVersion(v);
                            close();
                          }}
                        />
                      )}
                    >
                      <span>{loaderLabel(currentProfile.loader)}</span>{" "}
                      <span className={notSupported ? "italic text-fg-3" : "cc-num"}>
                        {displayVersion}
                      </span>
                    </EditableChipV3>
                  </>
                );
              })()}
              <Sep />
              <EditableChipV3
                title={t("profiles.v3.chips.group.title")}
                disabled={chipEditors.isLocked}
                disabledReason={chipEditors.lockReason}
                onSave={() => { void chipEditors.saveGroup(groupDraft); }}
                onCancel={() => setGroupDraft(currentProfile.group ?? "")}
                renderEditor={({ commit }) => (
                  <div className="p-1">
                    <input
                      autoFocus
                      type="text"
                      value={groupDraft}
                      onChange={(e) => setGroupDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                      placeholder={t("profiles.v3.chips.group.placeholder")}
                      className="w-full h-7 px-2 bg-s1 border border-line focus:border-line-3 outline-none text-[12px] text-fg placeholder:text-fg-4 transition-colors duration-fast"
                      style={{ borderRadius: "var(--r-sm)" }}
                    />
                  </div>
                )}
              >
                {currentProfile.group || <span className="text-fg-3">{t("profiles.v3.chips.group.empty")}</span>}
              </EditableChipV3>
              {hasModpack && (() => {
                const versionsReady = !!modpackVersions;
                const tooltip = !versionsReady
                  ? t("profiles.v3.chips.modpack.loading")
                  : modpackVersionNumber ? `${modpackLabel} · ${modpackVersionNumber}` : modpackLabel;
                return (
                  <>
                    <Sep />
                    <Tooltip content={tooltip}>
                      <button
                        type="button"
                        disabled={!versionsReady}
                        onClick={() => versionsReady && handleOpenModpackVersionsModal()}
                        className={cn(
                          "group inline-flex items-center gap-1.5 h-6 px-1.5 -mx-0.5 text-[12px] max-w-[280px] transition-colors duration-fast",
                          !versionsReady ? "text-fg-3 cursor-wait" : "text-fg-2 hover:bg-s2 hover:text-fg",
                        )}
                        style={{ borderRadius: "var(--r-sm)" }}
                      >
                        <Package size={13} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
                        <span className="truncate">{modpackLabel}</span>
                        {modpackVersionNumber && <span className="cc-num text-fg-3 flex-shrink-0">{modpackVersionNumber}</span>}
                        {versionsReady && (
                          <PenLine
                            size={11}
                            strokeWidth={1.75}
                            className="flex-shrink-0 text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
                          />
                        )}
                      </button>
                    </Tooltip>
                  </>
                );
              })()}
              {preferredAccount && (
                <>
                  <Sep />
                  <Tooltip content={t('profiles.launchWith', { account: preferredAccount.username })}>
                    <span className="inline-flex items-center gap-1.5 h-6 px-1.5 -mx-0.5 text-[12px] text-fg-2">
                      {preferredAccountAvatarUrl ? (
                        <img
                          src={preferredAccountAvatarUrl}
                          alt={preferredAccount.username}
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ imageRendering: 'pixelated', borderRadius: 2 }}
                        />
                      ) : (
                        <User size={13} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
                      )}
                      {preferredAccount.username}
                    </span>
                  </Tooltip>
                </>
              )}
            </div>

            {/* stats — replaced by the launch status while starting; same height */}
            <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap mt-1 h-[18px] overflow-hidden text-[11px]">
              {isLaunching && statusMessage ? (
                <span className="flex items-center gap-2 min-w-0 animate-in fade-in duration-200">
                  <Loader2 size={12} className="animate-spin text-fg-3 flex-shrink-0" />
                  <span className="text-fg-3 flex-shrink-0">{t("profiles.card.starting")}</span>
                  <span className="text-fg-2 truncate" title={statusMessage}>{statusMessage}</span>
                </span>
              ) : (
                <>
                  <Stat
                    label={t('profiles.sort.lastPlayed')}
                    value={formatRelativeTime(currentProfile.last_played)}
                  />
                  <Stat
                    label={t("profiles.v3.stats.playtime")}
                    value={formatPlaytime(currentProfile.playtime_seconds)}
                    muted={!currentProfile.playtime_seconds}
                  />
                  <Stat
                    label={t("profiles.v3.stats.disk")}
                    value={diskSize == null ? "…" : formatBytes(diskSize)}
                    muted={diskSize == null || diskSize === 0}
                  />
                  {!isVanillaLoader && (
                    <Stat
                      label={t("profiles.content.mods")}
                      value={String(modCount)}
                      muted={modCount === 0}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* settings + PLAY */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tooltip content={t('profiles.editProfile')}>
              <button
                type="button"
                onClick={onEdit}
                aria-label={t('profiles.editProfile')}
                className="h-10 w-10 flex items-center justify-center bg-s2 border border-line-2 text-fg-2 hover:text-fg hover:bg-s3 transition-colors duration-fast"
                style={{ borderRadius: "var(--r-md)" }}
              >
                <Settings2 size={16} strokeWidth={1.75} />
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={handleLaunch}
              className={cn(
                "cc-play-button group h-10 w-[164px] flex items-center justify-center gap-2.5 overflow-hidden",
                isLaunching && "is-running",
              )}
              style={{ borderRadius: "var(--r-md)" }}
            >
              {isLaunching ? (
                <Square size={12} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={15} fill="currentColor" strokeWidth={0} className="transition-transform duration-fast group-hover:translate-x-0.5" />
              )}
              <span
                className="font-display text-[15px] font-[720] uppercase tracking-[0.08em] leading-none"
                style={{ fontStretch: "120%" }}
              >
                {isLaunching ? t('profiles.stop') : t('profiles.play')}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: Rail + Main ───────────────────────────────────────────── */}
      <div className={`flex-1 min-h-0 flex ${activeNavItem === "logs" ? "" : "overflow-hidden"}`}>
        <ProfileLeftRailV3
          profile={currentProfile}
          activeNavItem={activeNavItem}
          onNavChange={setActiveNavItem}
        />

        <main className="flex-1 min-w-0 flex flex-col min-h-0">
          {activeNavItem === "mods" && (
            <LocalContentTabV3<LocalContentItem>
              profile={currentProfile}
              contentType="Mod"
              getDisplayFileName={getGenericDisplayFileName}
              itemTypeName={t('profiles.content.mod')}
              itemTypeNamePlural={t('profiles.content.mods')}
              addContentButtonText={t('profiles.content.addMods')}
              emptyStateIconOverride="solar:bolt-bold-duotone"
              onRefreshRequired={handleRefresh}
            />
          )}

          {activeNavItem === "resourcepacks" && (
            <LocalContentTabV3<LocalContentItem>
              profile={currentProfile}
              contentType="ResourcePack"
              getDisplayFileName={getGenericDisplayFileName}
              itemTypeName={t('profiles.content.resourcePack')}
              itemTypeNamePlural={t('profiles.content.resourcePacks')}
              addContentButtonText={t('profiles.content.addResourcePacks')}
              emptyStateIconOverride="solar:gallery-bold-duotone"
              onRefreshRequired={handleRefresh}
            />
          )}

          {activeNavItem === "shaderpacks" && (
            <LocalContentTabV3<LocalContentItem>
              profile={currentProfile}
              contentType="ShaderPack"
              getDisplayFileName={getGenericDisplayFileName}
              itemTypeName={t('profiles.content.shaderPack')}
              itemTypeNamePlural={t('profiles.content.shaderPacks')}
              addContentButtonText={t('profiles.content.addShaderPacks')}
              emptyStateIconOverride="solar:sun-bold-duotone"
              onRefreshRequired={handleRefresh}
            />
          )}

          {activeNavItem === "datapacks" && (
            <LocalContentTabV3<LocalContentItem>
              profile={currentProfile}
              contentType="DataPack"
              getDisplayFileName={getGenericDisplayFileName}
              itemTypeName={t('profiles.content.dataPack')}
              itemTypeNamePlural={t('profiles.content.dataPacks')}
              addContentButtonText={t('profiles.content.addDataPacks')}
              emptyStateIconOverride="solar:database-bold-duotone"
              onRefreshRequired={handleRefresh}
            />
          )}

          {activeNavItem === "nrc" && (
            <LocalContentTabV3<LocalContentItem>
              profile={currentProfile}
              contentType="NoRiskMod"
              getDisplayFileName={getGenericDisplayFileName}
              itemTypeName={t('profiles.content.noriskMod')}
              itemTypeNamePlural={t('profiles.content.noriskMods')}
              addContentButtonText={t('profiles.content.addNoriskMods')}
              emptyStateIconOverride="solar:shield-check-bold-duotone"
              onRefreshRequired={async () => {
                try {
                  await fetchProfiles();
                  setCurrentProfile(prev => ({ ...prev }));
                } catch (err) {
                  console.error("[V3] Failed to refresh profile data:", err);
                }
                handleRefresh();
              }}
              /* Kein Add-CTA: NoRisk-Mods kommen ueber den Pack-Selector, nicht via Browse. */
            />
          )}

          {activeNavItem === "crime_shader" && <CrimeShaderTabV3 profile={currentProfile} />}

          {activeNavItem === "worlds" && (
            <WorldsTabV3
              profile={currentProfile}
              isActive={true}
              onRefresh={handleRefresh}
              onLaunchRequest={handleLaunchRequest}
            />
          )}

          {activeNavItem === "screenshots" && (
            <ScreenshotsTabV3 profile={currentProfile} isActive={true} />
          )}

          {activeNavItem === "logs" && (
            <LogsTabV3 profile={currentProfile} isActive={true} onRefresh={handleRefresh} />
          )}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ConfirmDeleteDialog
        isOpen={isDeleteModalOpen}
        itemName={currentProfile.name}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title={t('profiles.deleteProfileTitle')}
        message={
          <p className="text-[13px] text-fg-2">
            {t('profiles.deleteConfirmMessage', { name: currentProfile.name })}
          </p>
        }
      />

    </div>
  );
}
