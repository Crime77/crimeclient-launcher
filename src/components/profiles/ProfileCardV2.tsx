"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, FolderOpen, MoreHorizontal, Pin, Play, Square, Star } from "lucide-react";

import type { Profile } from "../../types/profile";
import { ProfileIconV2 } from "./ProfileIconV2";
import { toast } from "react-hot-toast";
import { SettingsContextMenu, type ContextMenuItem } from "../ui/SettingsContextMenu";
import { useProfileSettingsStore } from "../../store/profile-settings-store";
import { useProfileDuplicateStore } from "../../store/profile-duplicate-store";
import { useThemeStore } from "../../store/useThemeStore";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { ExportProfileModal } from "./ExportProfileModal";
import { useProfileLaunch } from "../../hooks/useProfileLaunch.tsx";
import { Tooltip } from "../ui/Tooltip";
import { useProfileStore } from "../../store/profile-store";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { usePlayerAvatar } from "../../hooks/usePlayerAvatar";
import { parseMotdToHtml } from "../../utils/motd-utils";
import { useTranslation } from "react-i18next";
import { usePinnedProfilesStore } from "../../store/usePinnedProfilesStore";
import { useResolvedLoaderVersion } from "../../hooks/useResolvedLoaderVersion";
import { cn } from "../../lib/utils";

// Column widths of the list view, shared by the rows and the header above them (ProfileListHeader)
const COL = {
  version: "w-[172px]",
  mods: "w-[52px]",
  lastPlayed: "w-[96px]",
  playtime: "w-[64px]",
  actions: "w-[92px]",
};

/** Column labels above the list view; the widths match the rows of ProfileCardV2. */
export function ProfileListHeader({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center gap-3 h-8 pl-2 pr-2 border-b border-line cc-eyebrow select-none", className)}>
      <span className="w-8 flex-shrink-0" />
      <span className="flex-1 min-w-0">{t("profiles.columns.name")}</span>
      <span className={cn(COL.version, "flex-shrink-0")}>{t("profiles.columns.version")}</span>
      <span className={cn(COL.mods, "flex-shrink-0 text-right")}>{t("profiles.columns.mods")}</span>
      <span className={cn(COL.lastPlayed, "flex-shrink-0")}>{t("profiles.columns.lastPlayed")}</span>
      <span className={cn(COL.playtime, "flex-shrink-0 text-right")}>{t("profiles.columns.playtime")}</span>
      <span className={cn(COL.actions, "flex-shrink-0")} />
    </div>
  );
}

// Custom JSX component for tooltip content
function StandardVersionTooltipContent() {
  const { t } = useTranslation();
  return (
    <div className="max-w-[260px] space-y-1.5">
      <div className="text-[13px] leading-snug text-fg">{t('profiles.card.standardVersionInfo')}</div>
      <div className="text-xs leading-snug text-fg-3">
        <span className="text-fg-2">{t('profiles.card.tip')}:</span> {t('profiles.card.createOwnProfiles')}
      </div>
    </div>
  );
}

/** Playtime as "42 min", "3,5 h" or "412 h"; null when the profile was never played. */
function formatPlaytime(seconds: number | undefined, lang: string): string | null {
  if (!seconds) return null;
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const hours = seconds / 3600;
  return `${(hours >= 10 ? Math.round(hours) : hours).toLocaleString(lang, { maximumFractionDigits: 1 })} h`;
}

interface ProfileCardV2Props {
  profile: Profile;
  onPlay?: (profile: Profile) => void;
  onSettings?: (profile: Profile) => void;
  onMods?: (profile: Profile) => void;
  onDelete?: (profileId: string, profileName: string) => void;
  onOpenFolder?: (profile: Profile) => void;
  layoutMode?: "list" | "grid" | "compact";
  variant?: "default" | "3d";
}

export function ProfileCardV2({
  profile,
  onPlay,
  onSettings,
  onMods,
  onDelete,
  onOpenFolder,
  layoutMode = "list",
  variant = "default",
}: ProfileCardV2Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const { openContextMenuId, setOpenContextMenuId } = useThemeStore();

  // Settings context menu state
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const contextMenuId = `profile-${profile.id}`;
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const { isPinned, togglePin } = usePinnedProfilesStore();
  const pinned = isPinned(profile.id);

  // Profile settings store
  const { openModal } = useProfileSettingsStore();

  // Profile duplicate store
  const { openModal: openDuplicateModal } = useProfileDuplicateStore();

  // Global modal system
  const { showModal, hideModal } = useGlobalModal();

  const resolvedLoaderVersion = useResolvedLoaderVersion(profile);

  // Get accounts from Minecraft Auth Store
  const accounts = useMinecraftAuthStore((state) => state.accounts);

  // Find preferred account if one is set
  const preferredAccount = profile.preferred_account_id
    ? accounts.find(acc => acc.id === profile.preferred_account_id)
    : null;

  // Load preferred account avatar
  const preferredAccountAvatarUrl = usePlayerAvatar({
    uuid: preferredAccount?.id,
    overlay: true,
  });

  // Settings context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      id: "edit",
      label: t('profiles.editProfile'),
      icon: "solar:settings-bold",
      onClick: (profile) => {
        console.log("Edit Profile clicked for:", profile.name);
        openModal(profile);
      },
    },
    {
      id: "duplicate",
      label: t('profiles.duplicate'),
      icon: "solar:copy-bold",
      onClick: (profile) => {
        console.log("Duplicate Profile clicked for:", profile.name);
        openDuplicateModal(profile);
      },
    },
    {
      id: "export",
      label: t('profiles.export'),
      icon: "solar:download-bold",
      onClick: (profile) => {
        showModal(`export-profile-${profile.id}`, (
          <ExportProfileModal
            profile={profile}
            isOpen={true}
            onClose={() => hideModal(`export-profile-${profile.id}`)}
          />
        ));
      },
    },
    {
      id: "open-folder",
      label: t('profiles.openFolder'),
      icon: "solar:folder-bold",
      onClick: (profile) => {
        if (onOpenFolder) {
          onOpenFolder(profile);
        } else {
          toast.success(t('profiles.toast.opening_folder', { name: profile.name }));
          console.log("Opening folder for profile:", profile.name);
        }
      },
    },
    ...(profile.modpack_info?.source ? [{
      id: "switch_modpack",
      label: t('profiles.modpackVersions'),
      icon: "solar:refresh-circle-bold",
      onClick: (profile: Profile) => {
        console.log("Switch modpack version for profile:", profile.name);
        if (profile.modpack_info?.source) {
          // Import ModpackVersionsModal dynamically to avoid circular imports
          import("../modals/ModpackVersionsModal").then(({ ModpackVersionsModal }) => {
            showModal(`modpack-versions-${profile.id}`, (
              <ModpackVersionsModal
                isOpen={true}
                onClose={() => hideModal(`modpack-versions-${profile.id}`)}
                versions={null}
                modpackName={profile.name}
                profileId={profile.id}
                onSwitchComplete={async () => {
                  console.log("Modpack version switched successfully for:", profile.name);
                  // Refresh profiles to ensure the profile prop is updated
                  try {
                    const { fetchProfiles } = useProfileStore.getState();
                    await fetchProfiles();
                  } catch (err) {
                    console.error("Failed to refresh profiles after modpack switch:", err);
                  }
                }}
              />
            ));
          });
        }
      },
    }] : []),
    {
      id: "delete",
      label: t('profiles.delete'),
      icon: "solar:trash-bin-trash-bold",
      destructive: true,
      separator: true, // Trennstrich vor Delete
      onClick: (profile) => {
        if (onDelete) {
          onDelete(profile.id, profile.name);
        } else {
          toast.error(t('profiles.toast.delete_fallback', { name: profile.name }));
          console.log("Deleting profile:", profile.name);
        }
      },
    },
  ];

  // Profile launch hook
  const { isLaunching, statusMessage, handleLaunch } = useProfileLaunch({
    profileId: profile.id,
    onLaunchSuccess: () => {
      console.log("Profile launched successfully:", profile.name);
    },
    onLaunchError: (error) => {
      console.error("Profile launch error:", error);
    },
    skipLastPlayedUpdate: variant === "3d", // Skip for featured profiles in 3D mode
  });

  // Close this menu if another context menu opens globally
  useEffect(() => {
    if (openContextMenuId && openContextMenuId !== contextMenuId && isContextMenuOpen) {
      setIsContextMenuOpen(false);
    }
  }, [openContextMenuId, contextMenuId, isContextMenuOpen]);

  // Format last played date
  const formatLastPlayed = (lastPlayed: string | null): string => {
    if (!lastPlayed) return t('profiles.card.neverPlayed');

    const date = new Date(lastPlayed);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInMinutes < 1) return t('profiles.card.justNow');
    if (diffInMinutes < 60) return t('profiles.card.minutesAgo', { count: diffInMinutes });
    if (diffInHours < 24) return t('profiles.card.hoursAgo', { count: diffInHours });
    if (diffInDays < 7) return t('profiles.card.daysAgo', { count: diffInDays });
    if (diffInWeeks < 4) return t('profiles.card.weeksAgo', { count: diffInWeeks });
    if (diffInMonths < 12) return t('profiles.card.monthsAgo', { count: diffInMonths });

    return t('profiles.card.yearsAgo', { count: diffInYears });
  };

  const play = () => {
    if (onPlay) {
      onPlay(profile);
    } else {
      handleLaunch();
    }
  };

  const openMods = () => {
    if (onMods) {
      onMods(profile);
    } else {
      toast.success(t('profiles.toast.managing_mods', { name: profile.name }));
      console.log("Managing mods for profile:", profile.name);
    }
  };

  const openFolder = () => {
    if (onOpenFolder) {
      onOpenFolder(profile);
    } else {
      toast.success(t('profiles.toast.opening_folder', { name: profile.name }));
    }
  };

  // The "more" button toggles the profile menu, placed under the button (relative to the card's `.relative` root)
  const toggleMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Close any other open context menus first
    if (openContextMenuId && openContextMenuId !== contextMenuId) {
      setOpenContextMenuId(null);
    }

    const newState = !isContextMenuOpen;
    setIsContextMenuOpen(newState);
    setOpenContextMenuId(newState ? contextMenuId : null);

    if (!isContextMenuOpen) {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const cardRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();

      if (cardRect) {
        setContextMenuPosition({
          x: buttonRect.right - cardRect.left - 200, // Position menu to the left of the button
          y: buttonRect.bottom - cardRect.top + 4,   // Position below the button
        });
      }
    }
  };

  const openMenuAtCursor = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (openContextMenuId && openContextMenuId !== contextMenuId) {
      setOpenContextMenuId(null);
    }
    setIsContextMenuOpen(true);
    setOpenContextMenuId(contextMenuId);

    const cardRect = e.currentTarget.getBoundingClientRect();
    setContextMenuPosition({
      x: e.clientX - cardRect.left,
      y: e.clientY - cardRect.top,
    });
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>, ignorePlayOverlay: boolean) => {
    // Don't trigger if clicking on action buttons (or the play overlay on the icon)
    const target = e.target as Element;
    if (
      e.target === e.currentTarget ||
      (!target.closest('button') && (!ignorePlayOverlay || !target.closest('.play-overlay')))
    ) {
      // 3D mode launches the profile, the default opens it (mods)
      if (variant === "3d") play();
      else openMods();
    }
  };

  const loaderText =
    profile.loader === "vanilla"
      ? t('common.vanilla').toLowerCase()
      : `${profile.loader} ${resolvedLoaderVersion?.version || profile.loader_version || ""}`.trim();
  const modCount = profile.mod_count ?? profile.mods.length;
  const playtime = formatPlaytime(profile.playtime_seconds, i18n.language);
  const lastPlayed = formatLastPlayed(profile.last_played);

  // name, then the small markers: standard version, pin, preferred account
  const nameLine = (nameClass: string) => (
    <div className="flex items-center gap-1.5 min-w-0">
      <h3 className={cn("min-w-0 truncate normal-case text-fg", nameClass)} title={profile.name}>
        <span dangerouslySetInnerHTML={{ __html: parseMotdToHtml(profile.name) }} />
      </h3>
      {profile.is_standard_version && (
        <Tooltip content={<StandardVersionTooltipContent />} position="top" wrapperClassName="flex-shrink-0">
          <Star size={12} strokeWidth={1.75} className="text-fg-3" />
        </Tooltip>
      )}
      {(pinned || isHovered) && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(profile.id); }}
          className={cn(
            "flex-shrink-0 grid place-items-center w-5 h-5 rounded-sm transition-colors duration-fast",
            pinned ? "text-fg-2 hover:text-fg" : "text-fg-4 hover:text-fg-2",
          )}
          title={pinned ? t('profiles.unpin') : t('profiles.pinToTop')}
          data-action="pin"
        >
          <Pin size={12} strokeWidth={1.75} className={pinned ? "fill-current" : undefined} />
        </button>
      )}
      {preferredAccount && (
        <Tooltip
          content={t('profiles.launchWith', { account: preferredAccount.username })}
          position="top"
          wrapperClassName="flex-shrink-0 min-w-0"
        >
          <span className="flex items-center gap-1.5 min-w-0 text-fg-3">
            {preferredAccountAvatarUrl && (
              <img
                src={preferredAccountAvatarUrl}
                alt={preferredAccount.username}
                className="w-4 h-4 rounded-sm flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span className="truncate max-w-[96px] text-xs">{preferredAccount.username}</span>
          </span>
        </Tooltip>
      )}
    </div>
  );

  const contextMenu = (
    <SettingsContextMenu
      target={profile}
      isOpen={isContextMenuOpen}
      position={contextMenuPosition}
      items={contextMenuItems}
      onClose={() => {
        setIsContextMenuOpen(false);
        setOpenContextMenuId(null);
      }}
      triggerButtonRef={settingsButtonRef}
    />
  );

  const moreButton = (small?: boolean) => (
    <button
      ref={settingsButtonRef}
      onClick={toggleMenuFromButton}
      className={cn("cc-icon-btn", small && "w-6 h-6", isContextMenuOpen && "bg-s3 text-fg")}
      title={t('profiles.profileOptions')}
      aria-label={t('profiles.profileOptions')}
      data-action="settings"
    >
      <MoreHorizontal size={small ? 14 : 16} strokeWidth={1.75} />
    </button>
  );

  // Grid and compact layouts: flat tiles
  if (layoutMode === "grid" || layoutMode === "compact") {
    const isCompact = layoutMode === "compact";

    return (
      <div
        className={cn(
          "group relative flex items-center bg-s1 border cursor-pointer transition-colors duration-fast",
          isCompact ? "gap-2.5 p-2.5" : "gap-3 p-3",
          isContextMenuOpen ? "bg-s2 border-line-2" : "border-line hover:bg-s2 hover:border-line-2",
        )}
        style={{ borderRadius: "var(--r-lg)" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => handleCardClick(e, true)}
        onContextMenu={openMenuAtCursor}
      >
        <div className={cn("relative flex-shrink-0", isCompact ? "w-10 h-10" : "w-12 h-12")}>
          <ProfileIconV2 profile={profile} size="sm" className="w-full h-full" />

          {/* play on the icon */}
          {(isLaunching || isHovered) && (
            <div
              className="play-overlay absolute inset-0 grid place-items-center bg-bg/75 cursor-pointer"
              style={{ borderRadius: "var(--r-md)" }}
            >
              <button
                onClick={() => handleLaunch()}
                className="w-full h-full grid place-items-center text-fg hover:text-white transition-colors duration-fast"
                title={isLaunching ? t('profiles.stopPlaying') : t('profiles.startPlaying')}
                aria-label={isLaunching ? t('profiles.stopPlaying') : t('profiles.startPlaying')}
              >
                {isLaunching ? (
                  <Square size={isCompact ? 13 : 15} fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play size={isCompact ? 15 : 18} fill="currentColor" strokeWidth={0} />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-14">
          {nameLine(isCompact ? "text-[13px] font-[600] leading-tight" : "text-[13.5px] font-[600] leading-tight")}
          {isLaunching ? (
            <div className="mt-1 text-[11px] text-fg-3 truncate">
              {statusMessage || t('profiles.card.starting')}
            </div>
          ) : isCompact ? (
            <div className="mt-1 cc-num text-[11px] text-fg-3 truncate">
              <span className="text-fg-2">{profile.game_version}</span>
              <span className="text-fg-4"> · </span>
              {lastPlayed}
            </div>
          ) : (
            <>
              <div className="mt-1 cc-num text-[11.5px] text-fg-2 truncate">
                {profile.game_version} <span className="text-fg-3">{loaderText}</span>
              </div>
              <div className="mt-0.5 cc-num text-[11px] text-fg-3 truncate">
                {t('profiles.card.modCount', { count: modCount })}
                {playtime && (
                  <>
                    <span className="text-fg-4"> · </span>
                    {playtime}
                  </>
                )}
                <span className="text-fg-4"> · </span>
                {lastPlayed}
              </div>
            </>
          )}
        </div>

        <div
          className={cn(
            "absolute flex items-center gap-0.5 transition-opacity duration-fast",
            isCompact ? "top-1.5 right-1.5" : "top-2 right-2",
            isContextMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onMods) {
                onMods(profile);
              } else {
                // Navigate to specific profile detail view for mod management
                navigate(`/profilesv2/${profile.id}`);
              }
            }}
            className={cn("cc-icon-btn", isCompact && "w-6 h-6")}
            title={t('profiles.manageMods')}
            aria-label={t('profiles.manageMods')}
          >
            <Boxes size={isCompact ? 14 : 15} strokeWidth={1.75} />
          </button>
          {variant === "default" && moreButton(isCompact)}
        </div>

        {contextMenu}
      </div>
    );
  }

  // List layout: one table-like row, actions appear on hover
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 h-12 pl-2 pr-2 border-b border-line cursor-pointer transition-colors duration-fast",
        isContextMenuOpen ? "bg-s2" : "hover:bg-s2",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => handleCardClick(e, false)}
      onContextMenu={openMenuAtCursor}
    >
      <ProfileIconV2 profile={profile} size="xs" />

      <div className="flex-1 min-w-0">
        {nameLine("text-[13.5px] font-[600] leading-tight")}
        {isLaunching && (
          <div className="mt-0.5 text-[11px] text-fg-3 truncate">
            {statusMessage || t('profiles.card.starting')}
          </div>
        )}
      </div>

      <div
        className={cn(COL.version, "flex-shrink-0 cc-num text-[12px] text-fg-2 truncate")}
        title={`${profile.game_version} ${loaderText}`}
      >
        {profile.game_version} <span className="text-fg-3">{loaderText}</span>
      </div>
      <div className={cn(COL.mods, "flex-shrink-0 cc-num text-[12px] text-right", modCount ? "text-fg-2" : "text-fg-4")}>
        {modCount}
      </div>
      <div className={cn(COL.lastPlayed, "flex-shrink-0 cc-num text-[12px] truncate", profile.last_played ? "text-fg-3" : "text-fg-4")}>
        {lastPlayed}
      </div>
      <div className={cn(COL.playtime, "flex-shrink-0 cc-num text-[12px] text-right", playtime ? "text-fg-3" : "text-fg-4")}>
        {playtime ?? "–"}
      </div>

      <div
        className={cn(
          COL.actions,
          "flex-shrink-0 flex items-center justify-end gap-0.5 transition-opacity duration-fast",
          isLaunching || isContextMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <Tooltip content={isLaunching ? t('profiles.stopPlaying') : t('profiles.startPlaying')} position="top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              play();
            }}
            className={cn("cc-icon-btn", isLaunching && "text-fg bg-s3")}
            aria-label={isLaunching ? t('profiles.stop') : t('profiles.play')}
          >
            {isLaunching ? (
              <Square size={12} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={14} fill="currentColor" strokeWidth={0} />
            )}
          </button>
        </Tooltip>
        <Tooltip content={t('profiles.openFolder')} position="top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openFolder();
            }}
            className="cc-icon-btn"
            aria-label={t('profiles.openFolder')}
          >
            <FolderOpen size={15} strokeWidth={1.75} />
          </button>
        </Tooltip>
        {moreButton()}
      </div>

      {contextMenu}
    </div>
  );
}
