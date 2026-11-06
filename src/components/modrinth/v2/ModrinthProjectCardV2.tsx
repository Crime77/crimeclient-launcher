"use client";

import React from "react";
import type {
  ModrinthGameVersion,
} from "../../../types/modrinth";
import type { UnifiedModSearchResult, UnifiedVersion } from "../../../types/unified";

// Unified project card supporting both Modrinth and CurseForge
type CompatibleProject = UnifiedModSearchResult;
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { AlertTriangle, Check, ChevronDown, Download, Heart, Loader2, Package, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "../../ui/buttons/Button";
import { cn } from "../../../lib/utils";
import { contentCategories, formatCompact, formatRelative, loaderCategories, prettyCategory } from "./format";
import { ModrinthVersionListV2 } from "./ModrinthVersionListV2";
import { openExternalUrl } from "../../../services/tauri-service";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../ui/Tooltip";
import { useNavigate } from "react-router-dom";

type Profile = any;

interface VersionListPassthroughProps {
  projectVersions: UnifiedVersion[] | null | "loading";
  displayedCount: number;
  versionFilters: {
    gameVersions: string[];
    loaders: string[];
    versionType: string;
  };
  versionDropdownUIState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openVersionDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<string, ContentInstallStatus | null>;
  selectedProfile: Profile | null;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersionsSidebar: string[];
  onVersionFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onVersionUiStateChange: (
    projectId: string,
    field: "showAllGameVersions" | "gameVersionSearchTerm",
    value: boolean | string,
  ) => void;
  onToggleVersionDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
  ) => void;
  onHoverVersion: (versionId: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteVersionClick?: (
    profileId: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
  ) => void;
  onToggleEnableClick?: (
    profileId: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
  itemIndex?: number;
}

export interface ModrinthProjectCardV2Props
  extends VersionListPassthroughProps {
  hit: UnifiedModSearchResult | any; // Temporary for compatibility
  accentColor: AccentColor;
  installStatus: ContentInstallStatus | null;
  isQuickInstalling?: boolean;
  isInstallingModpackAsProfile?: boolean;
  installingVersionStates?: Record<string, boolean>;
  installingModpackVersionStates?: Record<string, boolean>;
  onQuickInstallClick: (project: UnifiedModSearchResult | any) => void;
  onInstallModpackAsProfileClick?: (project: UnifiedModSearchResult) => void;
  onInstallModpackVersionAsProfileClick?: (
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
  ) => void;
  onToggleVersionsClick: (projectId: string) => void;
  isExpanded: boolean;
  isLoadingVersions: boolean;
  isBlocked?: boolean; // Deprecated, use projectNoRiskStatus instead
  projectNoRiskStatus?: 'blocked' | 'warning' | null;
  projectVersions: UnifiedVersion[] | null | "loading";
  displayedCount: number;
  versionDropdownUIState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openVersionDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<string, ContentInstallStatus | null>;
  selectedProfile: Profile | null;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[];
  showAllGameVersionsSidebar: boolean;
  selectedGameVersionsSidebar: string[];
  onVersionFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onVersionUiStateChange: (
    projectId: string,
    field: "showAllGameVersions" | "gameVersionSearchTerm",
    value: boolean | string,
  ) => void;
  onToggleVersionDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllVersionDropdowns: (projectId: string) => void;
  onLoadMoreVersions: (projectId: string) => void;
  onInstallVersionClick: (
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
  ) => void;
  onHoverVersion: (versionId: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteVersionClick?: (
    profileId: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
  ) => void;
  onToggleEnableClick?: (
    profileId: string,
    project: UnifiedModSearchResult | any,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
  itemIndex?: number;
  /**
   * Override the default title-click behavior. Used by in-place detail
   * views (e.g. the V3 Add-content sheet) to render the mod detail as a
   * stacked layer instead of navigating away from the current surface.
   * The router-based full-page fallback is used when not provided.
   */
  onProjectClick?: (
    project: UnifiedModSearchResult | any,
    source: "modrinth" | "curseforge",
  ) => void;
}

export const ModrinthProjectCardV2 = React.memo<ModrinthProjectCardV2Props>(
  ({
    hit,
    accentColor,
    installStatus,
    isQuickInstalling,
    isInstallingModpackAsProfile,
    installingVersionStates,
    installingModpackVersionStates,
    onQuickInstallClick,
    onInstallModpackAsProfileClick,
    onInstallModpackVersionAsProfileClick,
    onToggleVersionsClick,
    isExpanded,
    isLoadingVersions,
    projectVersions,
    displayedCount,
    versionFilters,
    versionDropdownUIState,
    openVersionDropdowns,
    installedVersions,
    selectedProfile,
    hoveredVersionId,
    gameVersionsData,
    showAllGameVersionsSidebar,
    selectedGameVersionsSidebar,
    onVersionFilterChange,
    onVersionUiStateChange,
    onToggleVersionDropdown,
    onCloseAllVersionDropdowns,
    onLoadMoreVersions,
    onInstallVersionClick,
    onHoverVersion,
    selectedProfileId,
    onDeleteVersionClick,
    onToggleEnableClick,
    itemIndex,
    isBlocked = false, // Deprecated
    projectNoRiskStatus = null,
    onProjectClick,
  }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleTitleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const source: "modrinth" | "curseforge" =
        hit.source === "Modrinth" ? "modrinth" : "curseforge";
      // When a consumer owns the surface (e.g. the Add-content sheet),
      // let them handle the click in-place instead of hard-navigating
      // away from their overlay.
      if (onProjectClick) {
        onProjectClick(hit, source);
        return;
      }
      navigate(`/mods/${source}/${hit.project_id}`);
    };

    const installedHere = !!installStatus?.is_installed && !!selectedProfile;
    const inPack = !!installStatus?.is_included_in_norisk_pack;
    const warned = projectNoRiskStatus === 'blocked' || projectNoRiskStatus === 'warning' || (!projectNoRiskStatus && isBlocked);
    const categories = contentCategories(
      hit.display_categories && hit.display_categories.length > 0 ? hit.display_categories : hit.categories,
    );
    const loaders = loaderCategories(hit.categories);
    const isModpack = hit.project_type === "modpack";
    const busy = isModpack ? !!isInstallingModpackAsProfile : !!isQuickInstalling;

    return (
      <div className={cn("border-b border-line transition-colors duration-fast", isExpanded && "bg-s1")}>
        {/* Main Card */}
        <div
          onClick={handleTitleClick}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors duration-fast",
            !isExpanded && "hover:bg-s1",
          )}
        >
        {/* Project Icon */}
        <div
          className="relative w-10 h-10 flex-shrink-0 overflow-hidden bg-s3 border border-line"
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {hit.icon_url ? (
            <img
              src={hit.icon_url || "/placeholder.svg"}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full grid place-items-center">
              <Package size={16} strokeWidth={1.75} className="text-fg-4" />
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="text-[13.5px] font-[600] text-fg truncate leading-[18px] group-hover:underline decoration-line-3 underline-offset-2"
              title={hit.title}
            >
              {hit.title}
            </span>
            {hit.author && (
              <a
                href={
                  hit.source === 'Modrinth'
                    ? `https://modrinth.com/user/${hit.author}`
                    : `https://www.curseforge.com/members/${hit.author}/projects`
                }
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await openExternalUrl(
                      hit.source === 'Modrinth'
                        ? `https://modrinth.com/user/${hit.author}`
                        : `https://www.curseforge.com/members/${hit.author}/projects`
                    );
                  } catch (error) {
                    console.error("Failed to open external URL:", error);
                    toast.error(t('common.open_link_failed'));
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-fg-3 truncate flex-shrink min-w-0 hover:text-fg-2 transition-colors duration-fast"
                title={hit.author}
              >
                {t('mods.by_author', { author: hit.author })}
              </a>
            )}
            {warned && (
              <Tooltip content={projectNoRiskStatus === 'warning' ? t('modrinth.warning_mod_tooltip') : t('modrinth.blocked_mod_tooltip')}>
                <span className={cn("self-center flex", projectNoRiskStatus === 'warning' ? "text-warn" : "text-err")}>
                  <AlertTriangle size={13} strokeWidth={1.75} />
                </span>
              </Tooltip>
            )}
          </div>

          {/* Description */}
          <p className="text-[12.5px] text-fg-2 truncate leading-[18px] mt-px">
            {hit.description}
          </p>

          {/* Stats and categories */}
          <div className="flex items-center gap-3 mt-1 h-[18px] overflow-hidden whitespace-nowrap">
            <Stat icon={Download} value={formatCompact(hit.downloads)} title={t('content.search.sort.downloads')} />
            {hit.follows != null && (
              <Stat icon={Heart} value={formatCompact(hit.follows)} title={t('content.search.sort.follows')} />
            )}
            {hit.date_modified && (
              <Stat icon={RefreshCw} value={formatRelative(hit.date_modified)} title={t('content.search.sort.updated')} />
            )}
            {categories.length > 0 && (
              <span className="flex items-center gap-1">
                {categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="h-[18px] inline-flex items-center px-1.5 bg-s2 text-[11px] text-fg-3 capitalize"
                    style={{ borderRadius: "var(--r-sm)" }}
                  >
                    {prettyCategory(category)}
                  </span>
                ))}
              </span>
            )}
            {loaders.length > 0 && (
              <span className="cc-num text-[11px] text-fg-4">{loaders.join(" · ")}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {inPack && (
            <span
              className={cn(
                "cc-num text-[11px] px-1.5",
                installStatus?.norisk_pack_item_details?.is_enabled === false ? "text-fg-4 line-through" : "text-fg-3",
              )}
            >
              {t('modrinth.in_pack')}
            </span>
          )}
          {installedHere ? (
            <span className="h-7 min-w-[84px] inline-flex items-center justify-end gap-1.5 px-2 text-[12px] font-[520] text-fg-2">
              <Check size={14} strokeWidth={2} className="text-ok" />
              {t('common.installed')}
            </span>
          ) : isModpack ? (
            <Button
              variant="secondary"
              size="xs"
              className="min-w-[84px]"
              icon={busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} strokeWidth={1.75} />}
              disabled={isInstallingModpackAsProfile || isQuickInstalling || (!!installStatus?.is_installed && !!selectedProfile)}
              onClick={(e) => {
                e.stopPropagation();
                if (onInstallModpackAsProfileClick) {
                  onInstallModpackAsProfileClick(hit);
                } else {
                  console.warn(
                    "onInstallModpackAsProfileClick is not defined for modpack",
                  );
                  onQuickInstallClick(hit);
                }
              }}
            >
              {busy ? t('modrinth.installing') : t('modrinth.install')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="xs"
              className="min-w-[84px]"
              icon={
                busy
                  ? <Loader2 size={13} className="animate-spin" />
                  : warned
                    ? <AlertTriangle size={13} strokeWidth={1.75} className="text-warn" />
                    : <Download size={13} strokeWidth={1.75} />
              }
              disabled={isQuickInstalling || (!!installStatus?.is_installed && !!selectedProfile)}
              onClick={(e) => {
                e.stopPropagation();
                onQuickInstallClick(hit);
              }}
            >
              {busy ? t('modrinth.installing') : t('modrinth.install')}
            </Button>
          )}
          <button
            type="button"
            className={cn("cc-icon-btn", isExpanded && "text-fg bg-s3")}
            disabled={isLoadingVersions}
            title={isExpanded ? t('mods.versions.hide') : t('mods.versions.show')}
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVersionsClick(hit.project_id);
            }}
          >
            {isLoadingVersions ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronDown
                size={15}
                strokeWidth={1.75}
                className={cn("transition-transform duration-med", isExpanded && "rotate-180")}
              />
            )}
          </button>
        </div>

        </div>

        {/* Version List - Below Card */}
        {isExpanded &&
          Array.isArray(projectVersions) &&
          projectVersions.length > 0 && (
            <div className="pl-3 xl:pl-[64px] pr-3 pb-3">
              <ModrinthVersionListV2
              projectId={hit.project_id}
              project={hit}
              versions={projectVersions as UnifiedVersion[]}
              displayedCount={displayedCount}
              filters={versionFilters}
              uiState={versionDropdownUIState}
              openDropdowns={openVersionDropdowns}
              installedVersions={installedVersions}
              installingVersionStates={installingVersionStates}
              installingModpackVersionStates={installingModpackVersionStates}
              selectedProfile={selectedProfile}
              selectedProfileId={selectedProfileId}
              hoveredVersionId={hoveredVersionId}
              gameVersionsData={gameVersionsData}
              showAllGameVersionsSidebar={showAllGameVersionsSidebar}
              selectedGameVersionsSidebar={selectedGameVersionsSidebar}
              accentColor={accentColor}
              onFilterChange={onVersionFilterChange}
              onUiStateChange={onVersionUiStateChange}
              onToggleDropdown={onToggleVersionDropdown}
              onCloseAllDropdowns={onCloseAllVersionDropdowns}
              onLoadMore={onLoadMoreVersions}
              onInstallClick={onInstallVersionClick}
              onInstallModpackVersionAsProfileClick={
                onInstallModpackVersionAsProfileClick
              }
              onHoverVersion={onHoverVersion}
              onDeleteClick={onDeleteVersionClick}
                onToggleEnableClick={onToggleEnableClick}
                isProjectBlocked={isBlocked}
                projectNoRiskStatus={projectNoRiskStatus || (isBlocked ? 'blocked' : null)}
              />
            </div>
          )}
      </div>
    );
  },
);

/** One mono figure of the stats line: small icon in fg-4, value in fg-3. */
function Stat({ icon: StatIcon, value, title }: { icon: LucideIcon; value: string; title: string }) {
  return (
    <span className="inline-flex items-center gap-1 cc-num text-[11px] text-fg-3" title={title}>
      <StatIcon size={12} strokeWidth={1.75} className="text-fg-4" />
      {value}
    </span>
  );
}
