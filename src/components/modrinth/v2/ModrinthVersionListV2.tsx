"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ModrinthGameVersion,
  ModrinthSearchHit,
  ModrinthVersion,
} from "../../../types/modrinth";
import type { UnifiedVersion } from "../../../types/unified";
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { Check, X } from "lucide-react";
import { Button } from "../../ui/buttons/Button";
import { Checkbox } from "../../ui/Checkbox";
import { ModrinthVersionItemV2, ModrinthVersionTableHeader } from "./ModrinthVersionItemV2";
import { Select, type SelectOption } from "../../ui/Select";
import { gsap } from "gsap";
import { useThemeStore } from "../../../store/useThemeStore";

// --- Define Props for the new component ---
interface ModrinthVersionListV2Props {
  projectId: string;
  project: ModrinthSearchHit;
  versions: UnifiedVersion[];
  displayedCount: number;
  filters: {
    gameVersions: string[];
    loaders: string[];
    versionType: string;
  };
  uiState: {
    showAllGameVersions: boolean;
    gameVersionSearchTerm: string;
  };
  openDropdowns: {
    type: boolean;
    gameVersion: boolean;
    loader: boolean;
  };
  installedVersions: Record<string, ContentInstallStatus | null>;
  installingVersionStates?: Record<string, boolean>;
  installingModpackVersionStates?: Record<string, boolean>;
  selectedProfile: any | null; // Replace 'any' with actual Profile type if available
  accentColor: AccentColor;
  hoveredVersionId: string | null;
  gameVersionsData: ModrinthGameVersion[]; // Needed for filtering
  showAllGameVersionsSidebar: boolean; // State from main sidebar
  selectedGameVersionsSidebar: string[]; // State from main sidebar
  onFilterChange: (
    projectId: string,
    filterType: "gameVersions" | "loaders" | "versionType",
    value: string | string[],
  ) => void;
  onUiStateChange: (
    projectId: string,
    field: keyof ModrinthVersionListV2Props["uiState"],
    value: boolean | string,
  ) => void;
  onToggleDropdown: (
    projectId: string,
    dropdownType: "type" | "gameVersion" | "loader",
  ) => void;
  onCloseAllDropdowns: (projectId: string) => void;
  onLoadMore: (projectId: string) => void;
  onInstallClick: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onInstallModpackVersionAsProfileClick?: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onHoverVersion: (id: string | null) => void;
  selectedProfileId?: string | null;
  onDeleteClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  onToggleEnableClick?: (
    profileId: string,
    project: ModrinthSearchHit,
    version: UnifiedVersion,
    newEnabledState: boolean,
    sha1Hash: string,
  ) => void;
  isProjectBlocked?: boolean; // Deprecated, use projectNoRiskStatus instead
  projectNoRiskStatus?: 'blocked' | 'warning' | null;
}

// --- Component Implementation ---
export const ModrinthVersionListV2: React.FC<ModrinthVersionListV2Props> = ({
  projectId,
  project,
  versions,
  displayedCount,
  filters,
  uiState,
  openDropdowns,
  installedVersions,
  installingVersionStates,
  installingModpackVersionStates,
  selectedProfile,
  accentColor,
  hoveredVersionId,
  gameVersionsData,
  showAllGameVersionsSidebar,
  selectedGameVersionsSidebar,
  onFilterChange,
  onUiStateChange,
  onToggleDropdown,
  onCloseAllDropdowns,
  onLoadMore,
  onInstallClick,
  onInstallModpackVersionAsProfileClick,
  onHoverVersion,
  selectedProfileId,
  onDeleteClick,
  onToggleEnableClick,
  isProjectBlocked = false, // Deprecated
  projectNoRiskStatus = null,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const isAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);

  // Create Select options for version type
  const versionTypeOptions: SelectOption[] = [
    { value: "all", label: t('mod_detail.versions.all_types') },
    { value: "release", label: t('mod_detail.versions.release') },
    { value: "beta", label: t('mod_detail.versions.beta') },
    { value: "alpha", label: t('mod_detail.versions.alpha') },
  ];

  // Animation for the container when it mounts
  useEffect(() => {
    if (containerRef.current && isAnimationEnabled) {
      // Use a more performant animation approach
      requestAnimationFrame(() => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power2.out",
          },
        );
      });
    }
  }, [isAnimationEnabled]);

  // Update showFilters state when filters change
  useEffect(() => {
    setShowFilters(
      filters.gameVersions.length > 0 ||
        filters.loaders.length > 0 ||
        filters.versionType !== "all",
    );
  }, [filters]);

  // --- Helper function to get filtered versions (moved from parent) ---
  const getFilteredVersions = (
    allVersions: UnifiedVersion[],
  ): UnifiedVersion[] => {
    if (!filters) return allVersions;

    return allVersions.filter((version) => {
      // Filter by version type
      if (
        filters.versionType !== "all" &&
        version.release_type !== filters.versionType
      ) {
        return false;
      }

      // Filter by game versions (if any selected)
      if (filters.gameVersions.length > 0) {
        const hasMatchingGameVersion = version.game_versions.some((gv) =>
          filters.gameVersions.includes(gv),
        );
        if (!hasMatchingGameVersion) return false;
      }

      // Filter by loaders (if any selected)
      if (filters.loaders.length > 0) {
        const hasMatchingLoader = version.loaders.some((loader) =>
          filters.loaders.includes(loader),
        );
        if (!hasMatchingLoader) return false;
      }

      return true;
    });
  };

  const filteredVersions = useMemo(
    () => getFilteredVersions(versions),
    [versions, filters.versionType, filters.gameVersions, filters.loaders],
  );

  // Get available game versions
  const availableGameVersions = useMemo(() => {
    const allProjectGameVersionsSet = new Set(
      versions.flatMap((v) => v.game_versions),
    );
    let availableGVs = Array.from(allProjectGameVersionsSet);

    if (!uiState?.showAllGameVersions) {
      // Apply main sidebar filters when checkbox is OFF
      if (selectedGameVersionsSidebar.length > 0) {
        availableGVs = availableGVs.filter((gv) =>
          selectedGameVersionsSidebar.includes(gv),
        );
      }
      if (!showAllGameVersionsSidebar) {
        const releaseVersions = new Set(
          gameVersionsData
            .filter((v) => v.version_type === "release")
            .map((v) => v.version),
        );
        availableGVs = availableGVs.filter((gv) => releaseVersions.has(gv));
      }
    }

    // Sort versions
    return availableGVs.sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [
    versions,
    uiState?.showAllGameVersions,
    selectedGameVersionsSidebar,
    showAllGameVersionsSidebar,
    gameVersionsData,
  ]);

  // Get available loaders for the current project type
  const availableLoaders = useMemo(() => {
    // Get loaders that are actually used in this project's versions
    const projectLoaders = Array.from(
      new Set(versions.flatMap((v) => v.loaders)),
    );

    // Only show loaders that are relevant to this project
    return projectLoaders.sort();
  }, [versions]);

  // Create game version options
  const gameVersionOptions = useMemo(
    () => [
      { value: "all", label: t('mod_detail.versions.all_game_versions') },
      ...availableGameVersions.map((gv) => ({
        value: gv,
        label: gv,
        icon: filters.gameVersions.includes(gv) ? (
          <Check size={13} strokeWidth={2} />
        ) : undefined,
      })),
    ],
    [availableGameVersions, filters.gameVersions],
  );

  const loaderOptions = useMemo(
    () => [
      { value: "all", label: t('mod_detail.versions.all_loaders') },
      ...availableLoaders.map((loader) => ({
        value: loader,
        label: loader,
        icon: filters.loaders.includes(loader) ? (
          <Check size={13} strokeWidth={2} />
        ) : undefined,
      })),
    ],
    [availableLoaders, filters.loaders],
  );

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    onFilterChange(projectId, "versionType", "all");
    onFilterChange(projectId, "gameVersions", []);
    onFilterChange(projectId, "loaders", []);
  };

  // One removable filter value, same look as the chips under the search toolbar
  const chip = (key: string, label: string, onRemove: () => void, mono = false) => (
    <span
      key={key}
      className="h-6 inline-flex items-center gap-1 pl-2 pr-1 bg-s2 border border-line text-[11.5px] text-fg-2 whitespace-nowrap flex-shrink-0"
      style={{ borderRadius: "var(--r-sm)" }}
    >
      <span className={mono ? "cc-num" : "capitalize"}>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 grid place-items-center text-fg-4 hover:text-fg transition-colors duration-fast"
        aria-label={t('mods.filters.remove', { label })}
      >
        <X size={11} strokeWidth={2} />
      </button>
    </span>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Version filters */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Select
          value={filters.versionType}
          onChange={(value) => {
            onFilterChange(projectId, "versionType", value);
          }}
          options={versionTypeOptions}
          size="sm"
          className="w-32"
        />

        <Select
          value={
            filters.gameVersions.length > 0
              ? filters.gameVersions[0]
              : "all"
          }
          onChange={(value) => {
            if (value === "all") {
              onFilterChange(projectId, "gameVersions", []);
            } else {
              // Toggle the selected version
              const current = filters.gameVersions || [];
              const isAlreadySelected = current.includes(value);
              const newValue = isAlreadySelected
                ? current.filter((v) => v !== value)
                : [...current, value];
              onFilterChange(projectId, "gameVersions", newValue);
            }
          }}
          options={gameVersionOptions}
          size="sm"
          className="w-40"
        />

        <Select
          value={filters.loaders.length > 0 ? filters.loaders[0] : "all"}
          onChange={(value) => {
            if (value === "all") {
              onFilterChange(projectId, "loaders", []);
            } else {
              // Toggle the selected loader
              const current = filters.loaders || [];
              const isAlreadySelected = current.includes(value);
              const newValue = isAlreadySelected
                ? current.filter((l) => l !== value)
                : [...current, value];
              onFilterChange(projectId, "loaders", newValue);
            }
          }}
          options={loaderOptions}
          size="sm"
          className="w-32"
        />

        {/* Show checkbox for 'Show All' when using game versions dropdown */}
        <div className="ml-auto">
          <Checkbox
            id={`show-all-gv-${projectId}`}
            label={t('modrinth.show_all_versions')}
            checked={uiState?.showAllGameVersions || false}
            onChange={(e) =>
              onUiStateChange(
                projectId,
                "showAllGameVersions",
                e.target.checked,
              )
            }
            size="sm"
          />
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
          {filters.versionType !== "all" &&
            chip("type", `${t('mod_detail.type')}: ${filters.versionType}`, () =>
              onFilterChange(projectId, "versionType", "all"),
            )}
          {filters.gameVersions.map((version) =>
            chip(`gv-${version}`, version, () => {
              const newVersions = filters.gameVersions.filter(
                (v) => v !== version,
              );
              onFilterChange(projectId, "gameVersions", newVersions);
            }, true),
          )}
          {filters.loaders.map((loader) =>
            chip(`loader-${loader}`, loader, () => {
              const newLoaders = filters.loaders.filter(
                (l) => l !== loader,
              );
              onFilterChange(projectId, "loaders", newLoaders);
            }),
          )}
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="h-6 px-1.5 text-[11.5px] text-fg-3 hover:text-fg transition-colors duration-fast flex-shrink-0"
          >
            {t('content.filters.clear_all')}
          </button>
        </div>
      )}

      {/* Filtered Versions List - Moved from ModrinthSearchV2 */}
      {filteredVersions.length > 0 ? (
        <div className="border-t border-line">
          <ModrinthVersionTableHeader />
          {filteredVersions.slice(0, displayedCount).map((version) => {
            const versionStatus = selectedProfile
              ? installedVersions?.[version.id] || null
              : null;
            const isInstalling = installingVersionStates?.[version.id] || false;
            const isInstallingModpackVersion =
              installingModpackVersionStates?.[version.id] || false;
            const isVersionHovered = hoveredVersionId === version.id;
            return (
              <ModrinthVersionItemV2
                key={version.id}
                version={version}
                project={project}
                versionStatus={versionStatus}
                isInstalling={isInstalling}
                isInstallingModpackVersion={isInstallingModpackVersion}
                accentColor={accentColor}
                isHovered={isVersionHovered}
                onMouseEnter={() => onHoverVersion(version.id)}
                onMouseLeave={() => onHoverVersion(null)}
                onInstallClick={onInstallClick}
                onInstallModpackVersionAsProfileClick={
                  onInstallModpackVersionAsProfileClick
                }
                selectedProfileId={selectedProfileId}
                onDeleteClick={onDeleteClick}
                onToggleEnableClick={onToggleEnableClick}
                noRiskStatus={(version as any).noRiskStatus || projectNoRiskStatus}
              />
            );
          })}
          {/* Load More Button */}
          {filteredVersions.length > displayedCount && (
            <Button
              onClick={() => onLoadMore(projectId)}
              variant="ghost"
              size="xs"
              className="w-full mt-1 text-fg-3"
            >
              {t('content.search.load_more', { remaining: filteredVersions.length - displayedCount })}
            </Button>
          )}
        </div>
      ) : (
        <p className="px-2 py-4 border-t border-line text-[12px] text-fg-3">
          {t('modrinth.no_versions_match_filters')}
        </p>
      )}
    </div>
  );
};
