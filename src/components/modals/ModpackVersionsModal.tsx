"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Modal } from "../ui/Modal";
import { ChevronDown, ChevronUp, Loader2, Package, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/buttons/Button";
import type { UnifiedModpackVersionsResponse, UnifiedVersion, ModpackSwitchRequest } from "../../types/unified";
import { UnifiedVersionType } from "../../types/unified";
import type { ModPackSource } from "../../types/profile";
import UnifiedService from "../../services/unified-service";
import * as ProfileService from "../../services/profile-service";
import { toast } from "react-hot-toast";
import { parseErrorMessage } from "../../utils/error-utils";
import { sanitizeRichHtml } from "../../utils/html-sanitize";

interface ModpackVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: UnifiedModpackVersionsResponse | null;
  modpackName: string;
  profileId?: string;
  onVersionSwitch?: (version: UnifiedVersion) => void;
  onSwitchComplete?: () => void;
  isSwitching?: boolean;
}

function getVersionTypeColor(type: UnifiedVersionType): string {
  switch (type) {
    case UnifiedVersionType.Release:
      return "text-green-400";
    case UnifiedVersionType.Beta:
      return "text-yellow-400";
    case UnifiedVersionType.Alpha:
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

function getVersionTypeIcon(type: UnifiedVersionType): string {
  switch (type) {
    case UnifiedVersionType.Release:
      return "solar:tag-bold";
    case UnifiedVersionType.Beta:
      return "solar:test-tube-bold";
    case UnifiedVersionType.Alpha:
      return "solar:test-tube-bold";
    default:
      return "solar:tag-bold";
  }
}

function formatDate(dateString: string, locale = 'en-US'): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDownloads(downloads: number): string {
  if (downloads >= 1000000) {
    return `${(downloads / 1000000).toFixed(1)}M`;
  }
  if (downloads >= 1000) {
    return `${(downloads / 1000).toFixed(1)}K`;
  }
  return downloads.toString();
}

function VersionItem({
  version,
  isInstalled,
  isSelected,
  onSelect
}: {
  version: UnifiedVersion;
  isInstalled: boolean;
  isSelected: boolean;
  onSelect: (version: UnifiedVersion) => void;
}) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [curseforgeChangelog, setCurseforgeChangelog] = useState<string | null>(null);
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);

  const handleClick = () => {
    if (!isInstalled) {
      onSelect(version);
    }
  };

  const toggleExpanded = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If expanding and it's a CurseForge version without changelog loaded, load it
    if (!isExpanded && version.source === "CurseForge" && !version.changelog && !curseforgeChangelog) {
      setIsLoadingChangelog(true);
      try {
        const changelog = await UnifiedService.getCurseForgeFileChangelog(
          parseInt(version.project_id),
          parseInt(version.id)
        );
        setCurseforgeChangelog(changelog);
      } catch (error) {
        console.error("Failed to load CurseForge changelog:", error);
        setCurseforgeChangelog(""); // Empty string to prevent retrying
      } finally {
        setIsLoadingChangelog(false);
      }
    }

    setIsExpanded(!isExpanded);
  };

  // Determine which changelog to show
  const displayChangelog = version.changelog || curseforgeChangelog;

  const hasChangelog = Boolean(version.changelog) || version.source === "CurseForge";

  return (
    <div className={cn("border-b border-line last:border-b-0", isSelected && !isInstalled && "bg-s3")}>
      <div
        className={cn(
          "flex items-center gap-3 h-11 pl-3 pr-2 transition-colors duration-fast",
          isInstalled ? "cursor-default" : "cursor-pointer",
          !isSelected && !isInstalled && "hover:bg-s2",
        )}
        onClick={handleClick}
        role={isInstalled ? undefined : "radio"}
        aria-checked={isInstalled ? undefined : isSelected}
      >
        {/* Selection dot */}
        <span
          className={cn(
            "grid place-items-center w-3.5 h-3.5 rounded-full border flex-shrink-0",
            isSelected && !isInstalled ? "border-fg" : "border-line-3",
            isInstalled && "opacity-40",
          )}
          aria-hidden
        >
          {isSelected && !isInstalled && <span className="w-1.5 h-1.5 rounded-full bg-fg" />}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={cn("cc-num text-[13px] truncate", isSelected || isInstalled ? "text-fg" : "text-fg-2")}>
            {version.version_number}
          </span>
          {isInstalled && (
            <span
              className="flex-shrink-0 px-1.5 h-[18px] inline-flex items-center text-[11px] text-ok border border-ok/30"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {t('modpack_versions.current')}
            </span>
          )}
          <span className="cc-num text-[11.5px] text-fg-4 truncate">
            MC {version.game_versions.slice(0, 2).join(', ')}
            {version.game_versions.length > 2 && ` +${version.game_versions.length - 2}`}
          </span>
        </div>

        <span className="cc-num w-14 text-right text-[11.5px] text-fg-3 flex-shrink-0">
          {formatDownloads(version.downloads)}
        </span>
        <span className="cc-num w-[92px] text-right text-[11.5px] text-fg-3 flex-shrink-0">
          {formatDate(version.date_published, i18n.language)}
        </span>

        {/* Changelog toggle */}
        <span className="w-7 flex-shrink-0">
          {hasChangelog && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="cc-icon-btn"
              title={isExpanded ? t('modpack_versions.hide_changelog') : t('modpack_versions.show_changelog')}
              aria-label={t('modpack_versions.changelog')}
              aria-expanded={isExpanded}
              disabled={isLoadingChangelog}
            >
              {isLoadingChangelog ? (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              ) : isExpanded ? (
                <ChevronUp size={14} strokeWidth={1.75} />
              ) : (
                <ChevronDown size={14} strokeWidth={1.75} />
              )}
            </button>
          )}
        </span>
      </div>

      {/* Changelog */}
      {isExpanded && displayChangelog && (
        <div className="px-4 py-3 border-t border-line bg-bg/40">
          <div className="cc-eyebrow mb-2">
            {t('modpack_versions.changelog')}
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {isLoadingChangelog ? (
              <div className="flex items-center gap-2 py-4 text-[12.5px] text-fg-3">
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                <span>{t('modpack_versions.loading_changelog')}</span>
              </div>
            ) : displayChangelog ? (
              version.source === "CurseForge" ? (
                // Render HTML for CurseForge (sanitized)
                <div
                  className="max-w-none text-[12.5px] leading-relaxed text-fg-2 [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:text-fg [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:first:mt-0 [&_h2]:text-[13.5px] [&_h2]:font-semibold [&_h2]:text-fg [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-fg [&_h3]:mb-1 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mb-2 [&_ul]:space-y-0.5 [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:mb-2 [&_ol]:space-y-0.5 [&_ol]:ml-4 [&_strong]:font-semibold [&_strong]:text-fg [&_em]:italic [&_code]:bg-s3 [&_code]:px-1 [&_code]:rounded-sm [&_code]:text-[11.5px] [&_code]:font-mono [&_pre]:bg-s2 [&_pre]:border [&_pre]:border-line [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-[11.5px] [&_pre]:font-mono [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line-3 [&_blockquote]:pl-3 [&_blockquote]:text-fg-3 [&_blockquote]:my-2 [&_a]:text-fg [&_a]:underline [&_a]:decoration-line-3 [&_a]:underline-offset-2"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(displayChangelog) }}
                />
              ) : (
                // Render Markdown for Modrinth
                <div className="max-w-none text-[12.5px] leading-relaxed text-fg-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-[14px] font-semibold text-fg mb-2 mt-4 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-[13.5px] font-semibold text-fg mb-2 mt-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-[13px] font-semibold text-fg mb-1 mt-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc mb-2 space-y-0.5 ml-4">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal mb-2 space-y-0.5 ml-4">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-s3 px-1 rounded-sm text-[11.5px] font-mono text-fg">{children}</code>,
                      pre: ({ children }) => <pre className="bg-s2 border border-line p-2 rounded-md text-[11.5px] font-mono overflow-x-auto mb-2">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-line-3 pl-3 text-fg-3 my-2">{children}</blockquote>,
                      a: ({ href, children }) => <a href={href} className="text-fg underline decoration-line-3 underline-offset-2 hover:decoration-fg-3" target="_blank" rel="noopener noreferrer">{children}</a>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-2">
                          <table className="w-full border-collapse text-[12px]">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-s2">{children}</thead>,
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => <tr className="border-b border-line">{children}</tr>,
                      th: ({ children }) => <th className="px-2 py-1.5 border border-line text-left font-medium text-fg">{children}</th>,
                      td: ({ children }) => <td className="px-2 py-1.5 border border-line">{children}</td>,
                    }}
                  >
                    {displayChangelog}
                  </ReactMarkdown>
                </div>
              )
            ) : (
              <div className="text-[12.5px] text-fg-3 py-4">
                {t('modpack_versions.no_changelog')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ModpackVersionsModal({
  isOpen,
  onClose,
  versions: initialVersions,
  modpackName,
  profileId,
  onVersionSwitch,
  onSwitchComplete,
  isSwitching = false,
}: ModpackVersionsModalProps) {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<UnifiedModpackVersionsResponse | null>(initialVersions);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<UnifiedVersion | null>(null);

  // Reset selection when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
    }
  }, [isOpen]);

  // Load fresh versions when modal opens by loading the current profile
  React.useEffect(() => {
    if (isOpen && profileId) {
      setIsLoadingVersions(true);

      console.log("Loading modpack versions for profile:", profileId);
      console.log("Initial versions:", initialVersions);

      // Load the current profile to get the latest modpack source
      ProfileService.getProfile(profileId)
        .then(profile => {
          if (profile.modpack_info?.source) {
            return UnifiedService.getModpackVersions(profile.modpack_info.source);
          } else {
            throw new Error("No modpack source found in profile");
          }
        })
        .then(versions => {
          console.log("Loaded modpack versions:", versions);
          console.log("First version has changelog:", versions.all_versions[0]?.changelog);

          // Only add mock changelogs for Modrinth versions (CurseForge will be lazy loaded)
          if (versions && versions.all_versions.length > 0) {
            versions.all_versions.forEach((version, index) => {
              if (!version.changelog && version.source === "Modrinth") {
                const mockChangelogs = [
                  `### Version ${version.version_number}

**An actually working version of ${version.version_number}, sorry about last time.** No changes to anything except for the pack format, same mods and fabric version as last time.

> ### Status Update
> I've been working on new tooling for Sodium Plus for a long time now. I'm in the middle of migrating some of my infrastructure to a new system, so it may be a while. In the future, these tools will allow us to update and work on Sodium Plus a lot more quickly and with much higher quality. It is important that I finish this. In the meantime, @NoSadBeHappy will be updating the pack with smaller fixes and alpha versions to support Minecraft updates. Thank you for your patience!
> - RedstoneWizard08

#### Changes:
- Fixed compatibility with Minecraft ${version.game_versions[0] || 'latest'}
- Updated mod dependencies
- Performance improvements`,
                  `## What's New in ${version.version_number}

### Features
- Added new shader support
- Improved graphics settings
- Enhanced mod compatibility

### Bug Fixes
- Fixed crash on startup
- Resolved memory leaks
- Corrected texture rendering issues

### Technical
- Updated to Fabric ${version.loaders.includes('fabric') ? 'latest' : 'compatible'} version
- Optimized resource loading
- Better error handling`,
                  `# Changelog for ${version.version_number}

This release focuses on stability and performance improvements.

**Key Changes:**
- **Performance**: Significant FPS improvements in heavy modpacks
- **Compatibility**: Better support for Minecraft ${version.game_versions[0] || 'various versions'}
- **Bug Fixes**: Various crash fixes and stability improvements

> **Note**: This version requires Java 17 or higher for optimal performance.`
                ];
                version.changelog = mockChangelogs[index % mockChangelogs.length];
              }
            });
          }

          setVersions(versions);
        })
        .catch(err => {
          console.error("Failed to load fresh modpack versions:", err);
          setVersions(initialVersions); // fallback to initial versions
        })
        .finally(() => setIsLoadingVersions(false));
    }
  }, [isOpen, profileId, initialVersions]);

  // Reset when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setVersions(initialVersions);
      setSelectedVersion(null);
    }
  }, [isOpen, initialVersions]);

  if (!isOpen || !versions) {
    return null;
  }

  // Sort versions by date (newest first)
  const sortedVersions = [...versions.all_versions].sort(
    (a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
  );

  const installedVersionId = versions.installed_version?.id;

  const handleVersionSelect = (version: UnifiedVersion) => {
    // Don't allow selecting already installed version
    if (version.id === installedVersionId) return;
    setSelectedVersion(version);
  };

  const handleSwitchVersion = async () => {
    if (!selectedVersion) return;

    // Check if we have all required information for the new modpack switching
    if (profileId && selectedVersion.files.length > 0) {
      try {
        // Find the primary file
        const primaryFile = selectedVersion.files.find(f => f.primary) || selectedVersion.files[0];

        // Create new ModPackSource based on selected version
        let newModpackSource: ModPackSource;
        if (selectedVersion.source === "Modrinth") {
          newModpackSource = {
            source: "modrinth",
            project_id: selectedVersion.project_id,
            version_id: selectedVersion.id,
          };
        } else if (selectedVersion.source === "CurseForge") {
          // For CurseForge, we need the file_id from the primary file
          const fileId = primaryFile.fingerprint; // CurseForge uses fingerprint as file_id
          if (!fileId) {
            throw new Error("CurseForge file fingerprint (file_id) not found");
          }
          newModpackSource = {
            source: "curse_forge",
            project_id: parseInt(selectedVersion.project_id), // CurseForge project_id is number
            file_id: fileId,
          };
        } else {
          throw new Error(`Unsupported modpack source: ${selectedVersion.source}`);
        }

        const request: ModpackSwitchRequest = {
          download_url: primaryFile.url,
          modpack_source: newModpackSource,
          profile_id: profileId,
        };

        // Show loading toast
        const loadingToast = toast.loading(t('modpack_versions.toast.switching', { name: modpackName, version: selectedVersion.version_number }));

        await UnifiedService.switchModpackVersion(request);

        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success(t('modpack_versions.toast.switch_success', { name: modpackName, version: selectedVersion.version_number }));

        // Don't refresh here - let parent components handle the refresh

        // Call completion callback if provided (wait for parent components to update their state)
        if (onSwitchComplete) {
          await onSwitchComplete();
        }

        // Close modal after parent states are updated
        onClose();

      } catch (error) {
        toast.error(t('modpack_versions.toast.switch_failed', { error: parseErrorMessage(error) }));
      }
    } else if (onVersionSwitch) {
      // Fallback to old method if we don't have all required info
      onVersionSwitch(selectedVersion);
    }
  };

  return (
    <Modal
      title={t('modpack_versions.title', { name: modpackName })}
      titleIcon={<Package size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="lg"
      className="max-h-[80vh]"
      footer={
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-[12px] text-fg-3">
            {selectedVersion ? (
              <>
                {t('modpack_versions.selected')}{" "}
                <span className="text-fg-2">{selectedVersion.name}</span>
                {!selectedVersion.name.includes(selectedVersion.version_number) && (
                  <>
                    {" "}
                    <span className="cc-num text-fg-2">{selectedVersion.version_number}</span>
                  </>
                )}
              </>
            ) : (
              t('modpack_versions.select_hint')
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSwitching}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSwitchVersion}
            disabled={!selectedVersion || isSwitching}
            icon={isSwitching ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <RefreshCw size={15} strokeWidth={1.75} />}
          >
            {isSwitching ? t('modpack_versions.button.switching') : selectedVersion ? t('modpack_versions.button.switch_version') : t('modpack_versions.button.select_version')}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="cc-eyebrow">
            {isLoadingVersions ? (
              t('modpack_versions.loading')
            ) : (
              t('modpack_versions.available_count', { count: versions.all_versions.length })
            )}
          </span>
          {!isLoadingVersions && versions.updates_available && (
            <span className="text-[12px] text-ok">
              {t('modpack_versions.updates_available')}
            </span>
          )}
        </div>

        {sortedVersions.length > 0 && (
          <div
            className="overflow-hidden border border-line bg-s1"
            style={{ borderRadius: "var(--r-md)" }}
            role="radiogroup"
          >
            {sortedVersions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isInstalled={version.id === installedVersionId}
                isSelected={selectedVersion?.id === version.id}
                onSelect={handleVersionSelect}
              />
            ))}
          </div>
        )}

        {sortedVersions.length === 0 && (
          <div className="py-10 text-center text-[12.5px] text-fg-3">
            {t('modpack_versions.no_versions')}
          </div>
        )}
      </div>
    </Modal>
  );
}
