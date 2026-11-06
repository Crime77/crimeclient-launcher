"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import type {
  ModrinthSearchHit,
} from "../../../types/modrinth";
import type { UnifiedVersion } from "../../../types/unified";
import type { AccentColor } from "../../../store/useThemeStore";
import type { ContentInstallStatus } from "../../../types/profile";
import { AlertTriangle, Check, Download, Loader2, Power, Trash2 } from "lucide-react";
import { Button } from "../../ui/buttons/Button";
import { formatCompact, formatIsoDate } from "./format";
import { useIsFirstRender } from "../../../hooks/useIsFirstRender";
import { Tooltip } from "../../ui/Tooltip";

interface ModrinthVersionItemV2Props {
  version: UnifiedVersion;
  project: ModrinthSearchHit;
  versionStatus: ContentInstallStatus | null;
  isInstalling?: boolean;
  isInstallingModpackVersion?: boolean;
  accentColor: AccentColor;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onInstallClick: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
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
  onInstallModpackVersionAsProfileClick?: (
    project: ModrinthSearchHit,
    version: UnifiedVersion,
  ) => void;
  selectedProfileId?: string | null;
  isBlocked?: boolean; // Deprecated, use noRiskStatus instead
  noRiskStatus?: 'blocked' | 'warning' | null;
}

export const ModrinthVersionItemV2 = React.memo<ModrinthVersionItemV2Props>(
  ({
    version,
    project,
    versionStatus,
    isInstalling: externalIsInstalling = false,
    isInstallingModpackVersion = false,
    accentColor,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    onInstallClick,
    onDeleteClick,
    onToggleEnableClick,
    onInstallModpackVersionAsProfileClick,
    selectedProfileId,
    isBlocked = false, // Deprecated
    noRiskStatus = null,
  }) => {
    const { t } = useTranslation();
    const isModpack = project.project_type === "modpack";
    const cardRef = useRef<HTMLDivElement>(null);
    const [isCardHovered, setIsCardHovered] = useState(false);
    const [localIsInstalling, setLocalIsInstalling] = useState(false);
    const [installationStartTime, setInstallationStartTime] = useState<number | null>(null);
    const isFirstRender = useIsFirstRender();

    // Use local state or external state
    const isInstalling = localIsInstalling || externalIsInstalling;

    // If external state becomes true and we don't have local state, synchronize
    useEffect(() => {
      if (externalIsInstalling && !localIsInstalling && !installationStartTime) {
        console.log('External state became true, synchronizing local state');
        setLocalIsInstalling(true);
        setInstallationStartTime(Date.now());
      }
    }, [externalIsInstalling, localIsInstalling, installationStartTime]);

    // Keep local state active for at least 3 seconds after installation starts
    useEffect(() => {
      if (localIsInstalling && installationStartTime) {
        const timer = setTimeout(() => {
          console.log('Minimum display time (3s) passed, resetting local state');
          setLocalIsInstalling(false);
          setInstallationStartTime(null);
        }, 3000); // 3 seconds minimum display time

        return () => clearTimeout(timer);
      }
    }, [localIsInstalling, installationStartTime]); // Remove externalIsInstalling from dependencies

    // Reset local state when version changes
    useEffect(() => {
      setLocalIsInstalling(false);
      setInstallationStartTime(null);
    }, [version.id]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        setLocalIsInstalling(false);
        setInstallationStartTime(null);
      };
    }, []);

    const handleMouseEnterLocal = () => {
      onMouseEnter(version.id);
    };

    const handleMouseLeaveLocal = () => {
      onMouseLeave();
    };

    const handleButtonClick = () => {
    console.log('Button clicked, localIsInstalling:', localIsInstalling, 'externalIsInstalling:', externalIsInstalling);
    if (isInstalling) return;

    // Set local installing state immediately for instant UI feedback
    setLocalIsInstalling(true);
    setInstallationStartTime(Date.now());

    console.log('Started installation at:', Date.now());

    if (isModpack && onInstallModpackVersionAsProfileClick) {
      onInstallModpackVersionAsProfileClick(project, version);
    } else if (!isModpack) {
      onInstallClick(project, version);
    } else {
      console.warn(
        "onInstallModpackVersionAsProfileClick is not defined for modpack version item",
      );
      onInstallClick(project, version);
    }
  };

    const handleDeleteButtonClick = () => {
      if (onDeleteClick && !isModpack && selectedProfileId) {
        onDeleteClick(selectedProfileId, project, version);
      } else {
        console.warn(
          "Delete action called without a selectedProfileId or onDeleteClick handler missing/isModpack",
        );
      }
    };

    const handleToggleEnableButtonClick = () => {
      if (versionStatus?.norisk_pack_item_details?.norisk_mod_identifier) {
        if (onToggleEnableClick && !isModpack && selectedProfileId) {
          onToggleEnableClick(
            selectedProfileId,
            project,
            version,
            !versionStatus.is_enabled,
            "",
          );
        }
        return;
      }

      const primaryFile =
        version.files.find((f) => f.primary) || version.files[0];
      if (
        onToggleEnableClick &&
        !isModpack &&
        selectedProfileId &&
        versionStatus?.is_installed &&
        primaryFile?.hashes?.sha1 &&
        typeof versionStatus.is_enabled === "boolean"
      ) {
        onToggleEnableClick(
          selectedProfileId,
          project,
          version,
          !versionStatus.is_enabled,
          primaryFile.hashes.sha1,
        );
      } else {
        console.warn(
          "Toggle enable action called under invalid conditions or missing data",
          {
            onToggleEnableClick: !!onToggleEnableClick,
            isModpack,
            selectedProfileId: !!selectedProfileId,
            is_installed: versionStatus?.is_installed,
            sha1: primaryFile?.hashes?.sha1,
            is_enabled_type: typeof versionStatus?.is_enabled,
          },
        );
      }
    };

    let buttonText = t('modrinth.install');
    let buttonVariant: "primary" | "secondary" = "primary";
    let buttonDisabled = false;

    if (project.project_type === "modpack" && isInstallingModpackVersion) {
      buttonText = t('modrinth.installing');
      buttonVariant = "secondary";
      buttonDisabled = true;
    } else if (isInstalling) {
      buttonText = t('modrinth.installing');
      buttonVariant = "secondary";
      buttonDisabled = true;
    } else if (versionStatus && versionStatus.is_installed) {
      if (versionStatus?.is_included_in_norisk_pack && !isModpack) {
        buttonText = t('modrinth.in_pack');
        buttonVariant = "secondary";
        buttonDisabled = true;
      } else if (versionStatus?.is_installed && !isModpack) {
        buttonText = t('common.installed');
        buttonDisabled = true;
      } else if (isModpack && !versionStatus?.is_installed) {
        buttonText = t('modrinth.install');
        buttonVariant = "primary";
        buttonDisabled = false;
      }
    }
    const showInstallBorder =
      selectedProfileId &&
      (versionStatus?.is_installed ||
        versionStatus?.is_included_in_norisk_pack);
    const busy = isInstalling || isInstallingModpackVersion;
    const warned = noRiskStatus === 'blocked' || noRiskStatus === 'warning' || (!noRiskStatus && isBlocked);
    const shownGameVersions = version.game_versions.slice(0, 3);
    const moreGameVersions = version.game_versions.length - shownGameVersions.length;

    return (
      <div
        ref={cardRef}
        key={version.id}
        onMouseEnter={handleMouseEnterLocal}
        onMouseLeave={handleMouseLeaveLocal}
        className={cn(
          VERSION_GRID,
          "relative px-2 py-1.5 border-b border-line last:border-b-0 transition-colors duration-fast hover:bg-s2",
          isHovered && "bg-s2",
        )}
      >
        {/* Name, version number, state in this profile */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {warned && (
              <Tooltip content={noRiskStatus === 'warning' ? t('modrinth.warning_mod_tooltip') : t('modrinth.blocked_mod_tooltip')}>
                <span className={cn("flex flex-shrink-0", noRiskStatus === 'warning' ? "text-warn" : "text-err")}>
                  <AlertTriangle size={12} strokeWidth={1.75} />
                </span>
              </Tooltip>
            )}
            <span className="text-[13px] font-[520] text-fg truncate" title={version.name}>
              {version.name}
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0 mt-px">
            <span className="cc-num text-[11px] text-fg-3 truncate" title={version.version_number}>
              {version.version_number}
            </span>
            {/* below lg the type column is gone: only beta and alpha say so here */}
            {version.release_type !== "release" && (
              <span
                className={cn(
                  "lg:hidden cc-num text-[11px] flex-shrink-0",
                  version.release_type === "beta" ? "text-warn" : "text-err",
                )}
              >
                {version.release_type}
              </span>
            )}
            {showInstallBorder && versionStatus?.is_installed && versionStatus?.is_enabled !== false && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ok flex-shrink-0">
                <Check size={11} strokeWidth={2.25} />
                {t('common.installed')}
              </span>
            )}
            {showInstallBorder && versionStatus?.is_installed && versionStatus?.is_enabled === false && (
              <span className="text-[11px] text-fg-4 flex-shrink-0">{t('common.disabled')}</span>
            )}
            {showInstallBorder && versionStatus?.is_included_in_norisk_pack && (
              <span className={cn("text-[11px] flex-shrink-0", versionStatus?.is_enabled ? "text-info" : "text-fg-4")}>
                {t('modrinth.in_norisk_pack')}
              </span>
            )}
          </div>
        </div>

        {/* Release type */}
        <span
          className={cn(
            "hidden lg:block cc-num text-[11px]",
            version.release_type === "beta" ? "text-warn" : version.release_type === "alpha" ? "text-err" : "text-fg-3",
          )}
        >
          {version.release_type}
        </span>

        {/* Game versions and loaders */}
        <div className="min-w-0">
          <div className="cc-num text-[11.5px] text-fg-2 truncate" title={version.game_versions.join(", ")}>
            {shownGameVersions.join(", ")}
            {moreGameVersions > 0 && <span className="text-fg-4"> +{moreGameVersions}</span>}
          </div>
          <div className="text-[11px] text-fg-3 truncate capitalize mt-px">{version.loaders.join(" · ")}</div>
        </div>

        {/* Downloads and date */}
        <div className="min-w-0 text-right">
          <div className="cc-num text-[11.5px] text-fg-2" title={version.downloads.toLocaleString()}>
            {formatCompact(version.downloads)}
          </div>
          <div className="cc-num text-[11px] text-fg-4 mt-px">{formatIsoDate(version.date_published)}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          {selectedProfileId &&
            ((versionStatus?.is_installed &&
              !isModpack &&
              typeof versionStatus.is_enabled === "boolean" &&
              onToggleEnableClick) ||
              (versionStatus?.is_included_in_norisk_pack &&
                versionStatus?.norisk_pack_item_details &&
                onToggleEnableClick)) && (
              <Button
                onClick={handleToggleEnableButtonClick}
                size="xs"
                variant="ghost"
                className={cn("px-2", !versionStatus.is_enabled && "text-fg-3")}
                icon={<Power size={13} strokeWidth={1.75} className={versionStatus.is_enabled ? "text-ok" : "text-fg-4"} />}
              >
                {versionStatus.is_enabled ? t('common.active') : t('common.disabled')}
              </Button>
            )}
          {selectedProfileId &&
            versionStatus?.is_installed &&
            !isModpack &&
            onDeleteClick && (
              <button
                type="button"
                onClick={handleDeleteButtonClick}
                className="cc-icon-btn hover:text-err"
                title={t('common.delete')}
                aria-label={t('common.delete')}
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            )}
          {(!selectedProfileId || !versionStatus?.is_installed) && (
            <Button
              onClick={handleButtonClick}
              size="xs"
              variant="secondary"
              disabled={buttonDisabled || isInstalling}
              className="min-w-[84px]"
              icon={
                busy
                  ? <Loader2 size={13} className="animate-spin" />
                  : (noRiskStatus === 'blocked' || noRiskStatus === 'warning')
                    ? <AlertTriangle size={13} strokeWidth={1.75} className="text-warn" />
                    : <Download size={13} strokeWidth={1.75} />
              }
            >
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

/**
 * Shared column template of the version table (search rows and detail page). Below lg (the 1000 px
 * window) the type column goes and the action column narrows to what Install or Active + delete need, so
 * the version name and the game versions keep room to be read. Fixed widths, so the header lines up.
 */
export const VERSION_GRID =
  "grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_68px_120px] lg:grid-cols-[minmax(0,1.5fr)_52px_minmax(0,1fr)_76px_132px] gap-x-3 items-center";

/** Column heads above the version rows. */
export function ModrinthVersionTableHeader({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn(VERSION_GRID, "h-7 px-2 border-b border-line", className)}>
      <span className="cc-eyebrow">{t('mods.versions.col.version')}</span>
      <span className="hidden lg:block cc-eyebrow">{t('mod_detail.type')}</span>
      <span className="cc-eyebrow truncate">{t('mods.versions.col.game')}</span>
      <span className="cc-eyebrow text-right">{t('mods.versions.col.downloads')}</span>
      <span />
    </div>
  );
}
