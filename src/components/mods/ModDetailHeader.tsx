"use client";

import React, { useEffect, useState } from "react";
import { Boxes, Database, Download, ExternalLink, Heart, Image as ImageIcon, Loader2, Package, RefreshCw, Sun, type LucideIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { UnifiedProjectDetails, UnifiedVersion, UnifiedModSearchResult } from "../../types/unified";
import { ModPlatform } from "../../types/unified";
import type { AccentColor } from "../../store/useThemeStore";
import type { Profile } from "../../types/profile";
import { Button } from "../ui/buttons/Button";
import { contentCategories, formatCompact, formatRelative, prettyCategory } from "../modrinth/v2/format";
import { ProgressToast } from "../ui/ProgressToast";
import { openExternalUrl } from "../../services/tauri-service";
import { useProfileStore } from "../../store/profile-store";
import { useGlobalModalStore } from "../../hooks/useGlobalModal";
import { ModrinthQuickInstallProfilesModal } from "../modrinth/v2/ModrinthQuickInstallProfilesModal";
import UnifiedService from "../../services/unified-service";
import { ModrinthService } from "../../services/modrinth-service";
import { CurseForgeService } from "../../services/curseforge-service";
import { installContentToProfile, installContentToTarget } from "../../services/content-service";
import { ContentType, type ContentInstallTarget, type InstallContentPayload } from "../../types/content";
import { EventType, type EventPayload } from "../../types/events";
import { useNavigate } from "react-router-dom";

interface ModDetailHeaderProps {
  project: UnifiedProjectDetails;
  accentColor: AccentColor;
  showVersions: boolean;
  onToggleVersions: () => void;
  targetProfile?: Profile;
  installTarget?: ContentInstallTarget;
}

function getProjectTypeIcon(type: string): LucideIcon {
  switch (type) {
    case "mod": return Package;
    case "modpack": return Boxes;
    case "resourcepack": return ImageIcon;
    case "shader": return Sun;
    case "datapack": return Database;
    default: return Package;
  }
}

// Helper to map project type to ContentType
function mapProjectTypeToContentType(projectType: string): ContentType | null {
  switch (projectType.toLowerCase()) {
    case 'mod':
      return ContentType.Mod;
    case 'resourcepack':
      return ContentType.ResourcePack;
    case 'shader':
      return ContentType.ShaderPack;
    case 'datapack':
      return ContentType.DataPack;
    case 'modpack':
      return null; // Modpacks are handled differently
    default:
      return null;
  }
}

// Helper to find best version for a profile
function findBestVersionForProfile(profile: Profile, versions: UnifiedVersion[]): UnifiedVersion | null {
  if (!profile || !versions || versions.length === 0) return null;

  // First try: find a version matching both game version and loader
  if (profile.game_version && profile.loader) {
    const exactMatch = versions.find(v =>
      v.game_versions.includes(profile.game_version!) &&
      v.loaders.map(l => l.toLowerCase()).includes(profile.loader!.toLowerCase())
    );
    if (exactMatch) return exactMatch;
  }

  // Second try: match just game version
  if (profile.game_version) {
    const gameVersionMatch = versions.find(v =>
      v.game_versions.includes(profile.game_version!)
    );
    if (gameVersionMatch) return gameVersionMatch;
  }

  // Last resort: just return the latest version
  return versions[0];
}

export function ModDetailHeader({ project, accentColor, showVersions, onToggleVersions, targetProfile, installTarget }: ModDetailHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profiles, fetchProfiles } = useProfileStore();
  const showModal = useGlobalModalStore(state => state.openModal);
  const hideModal = useGlobalModalStore(state => state.closeModal);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installingProfiles, setInstallingProfiles] = useState<Record<string, boolean>>({});
  const [installStatus, setInstallStatus] = useState<Record<string, boolean>>({});
  const [installModalVersions, setInstallModalVersions] = useState<UnifiedVersion[] | null>(null);

  // Check if this is a modpack
  const isModpack = project.project_type.toLowerCase() === 'modpack';

  const handleOpenProjectPage = async () => {
    try {
      await openExternalUrl(project.project_url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      toast.error(t('common.open_link_failed'));
    }
  };

  // Convert UnifiedProjectDetails to format expected by modal
  const projectAsSearchResult: UnifiedModSearchResult = {
    project_id: project.id,
    source: project.source,
    title: project.title,
    slug: project.slug,
    description: project.description,
    author: project.author,
    categories: project.categories,
    display_categories: project.categories,
    downloads: project.downloads,
    follows: project.followers,
    icon_url: project.icon_url,
    project_url: project.project_url,
    project_type: project.project_type,
    gallery: project.gallery.map(g => g.url),
  };

  // Handle modpack installation (creates a new profile)
  const handleModpackInstall = async () => {
    const eventId = crypto.randomUUID();
    const toastId = `install-${eventId}`;
    let progressUnlisten: UnlistenFn | null = null;

    setIsInstalling(true);
    toast.loading(t('mod_detail.fetching_versions', { title: project.title }), { id: toastId });

    try {
      const response = await UnifiedService.getModVersions({
        source: project.source,
        project_id: project.id,
      });
      const allVersions = response.versions;

      if (!allVersions || allVersions.length === 0) {
        throw new Error(t('mod_detail.no_versions_found'));
      }

      // Sort all versions by date published, newest first
      const sortedVersions = allVersions.sort((a, b) =>
        new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
      );

      // Try to find the latest 'release' version
      let latestVersion = sortedVersions.find(v => v.release_type === 'release');
      if (!latestVersion) {
        latestVersion = sortedVersions[0];
      }

      if (!latestVersion?.files?.length) {
        throw new Error(t('mod_detail.no_files_in_version'));
      }

      const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
      if (!primaryFile) {
        throw new Error(t('mod_detail.no_primary_file'));
      }

      const fileName = primaryFile.filename || project.title || "modpack";

      // Set up event listener for progress updates
      progressUnlisten = await listen<EventPayload>("state_event", (progressEvent) => {
        const progressPayload = progressEvent.payload;
        if (progressPayload.event_type !== EventType.TaskProgress) return;
        if (progressPayload.event_id !== eventId) return;

        const progress = (progressPayload.progress ?? 0) * 100; // Convert 0-1 to 0-100

        // Update toast with progress
        toast.custom(
          () => <ProgressToast message={`Installing ${fileName}`} progress={progress} />,
          { id: toastId, duration: Infinity }
        );
      });

      // Show initial progress toast
      toast.custom(
        () => <ProgressToast message={`Installing ${fileName}`} progress={0} />,
        { id: toastId, duration: Infinity }
      );

      let newProfileId: string;

      if (project.source === ModPlatform.CurseForge) {
        const projectId = parseInt(project.id);
        const fileId = parseInt(latestVersion.id);

        if (isNaN(projectId) || isNaN(fileId)) {
          throw new Error(t('mod_detail.invalid_curseforge_ids'));
        }

        newProfileId = await CurseForgeService.downloadAndInstallCurseForgeModpack(
          projectId,
          fileId,
          primaryFile.filename,
          primaryFile.url,
          project.icon_url || undefined,
          primaryFile.size,
          eventId
        );
      } else {
        newProfileId = await ModrinthService.downloadAndInstallModpack(
          project.id,
          latestVersion.id,
          primaryFile.filename,
          primaryFile.url,
          project.icon_url || undefined,
          primaryFile.size,
          eventId
        );
      }

      // Clean up listener before showing success
      if (progressUnlisten) {
        progressUnlisten();
        progressUnlisten = null;
      }

      toast.success(t('mod_detail.installed_as_profile', { title: project.title }), { id: toastId, duration: 3000 });

      // Refresh profiles and navigate
      await fetchProfiles();
      navigate(`/profilesv2/${newProfileId}`);

    } catch (error: any) {
      console.error("Modpack installation failed:", error);
      toast.error(t('mod_detail.modpack_install_failed', { error: error.message || error }), { id: toastId });
    } finally {
      // Clean up listener
      if (progressUnlisten) {
        progressUnlisten();
      }
      setIsInstalling(false);
    }
  };

  const installVersionToProfile = async (profile: Profile, bestVersion: UnifiedVersion) => {
    setInstallingProfiles(prev => ({ ...prev, [profile.id]: true }));
    try {
      const primaryFile = bestVersion.files.find(f => f.primary) || bestVersion.files[0];
      if (!primaryFile) {
        toast.error(t('mod_detail.no_download_file'));
        return;
      }

      const contentType = mapProjectTypeToContentType(project.project_type);
      if (!contentType) {
        toast.error(t('mod_detail.cannot_install_type', { type: project.project_type }));
        return;
      }

      const payload: InstallContentPayload = {
        profile_id: profile.id,
        project_id: project.id,
        version_id: bestVersion.id,
        file_name: primaryFile.filename,
        download_url: primaryFile.url,
        file_hash_sha1: primaryFile.hashes?.sha1,
        file_fingerprint: primaryFile.fingerprint,
        content_name: project.title,
        version_number: bestVersion.version_number,
        content_type: contentType,
        loaders: bestVersion.loaders,
        game_versions: bestVersion.game_versions,
        source: project.source,
      };

      await installContentToTarget(payload, installTarget);
      toast.success(t('mod_detail.installed_to_profile', { title: project.title, version: bestVersion.version_number, profile: installTarget?.type === 'syncPack' ? installTarget.packName : profile.name }));
      setInstallStatus(prev => ({ ...prev, [profile.id]: true }));
    } catch (error) {
      console.error("Installation failed:", error);
      toast.error(t('mod_detail.install_failed', { error }));
    } finally {
      setInstallingProfiles(prev => ({ ...prev, [profile.id]: false }));
    }
  };

  const handleInstallClick = async () => {
    if (isModpack) {
      handleModpackInstall();
      return;
    }

    setIsInstalling(true);

    try {
      const response = await UnifiedService.getModVersions({
        source: project.source,
        project_id: project.id,
      });

      if (response.versions.length === 0) {
        toast.error(t('mod_detail.no_versions_available'));
        return;
      }

      if (targetProfile) {
        const bestVersion = findBestVersionForProfile(targetProfile, response.versions);
        if (!bestVersion) {
          toast.error(t('mod_detail.no_compatible_version', { profile: targetProfile.name }));
          return;
        }
        await installVersionToProfile(targetProfile, bestVersion);
        return;
      }

      setInstallModalVersions(response.versions);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
      toast.error(t('mod_detail.load_versions_failed'));
    } finally {
      setIsInstalling(false);
    }
  };

  useEffect(() => {
    if (!installModalVersions) return;

    const versions = installModalVersions;
    const modalId = `install-${project.id}`;

    const handleProfileSelect = async (_: any, profile: Profile) => {
      const bestVersion = findBestVersionForProfile(profile, versions);
      if (!bestVersion) {
        toast.error(t('mod_detail.no_compatible_version', { profile: profile.name }));
        return;
      }

      setInstallingProfiles(prev => ({ ...prev, [profile.id]: true }));

      try {
        const primaryFile = bestVersion.files.find(f => f.primary) || bestVersion.files[0];
        if (!primaryFile) {
          toast.error(t('mod_detail.no_download_file'));
          return;
        }

        const contentType = mapProjectTypeToContentType(project.project_type);
        if (!contentType) {
          toast.error(t('mod_detail.cannot_install_type', { type: project.project_type }));
          return;
        }

        const payload: InstallContentPayload = {
          profile_id: profile.id,
          project_id: project.id,
          version_id: bestVersion.id,
          file_name: primaryFile.filename,
          download_url: primaryFile.url,
          file_hash_sha1: primaryFile.hashes?.sha1,
          file_fingerprint: primaryFile.fingerprint,
          content_name: project.title,
          version_number: bestVersion.version_number,
          content_type: contentType,
          loaders: bestVersion.loaders,
          game_versions: bestVersion.game_versions,
          source: project.source,
        };

        await installContentToProfile(payload);
        toast.success(t('mod_detail.installed_to_profile', { title: project.title, version: bestVersion.version_number, profile: profile.name }));
        setInstallStatus(prev => ({ ...prev, [profile.id]: true }));
      } catch (error) {
        console.error("Installation failed:", error);
        toast.error(t('mod_detail.install_failed', { error }));
      } finally {
        setInstallingProfiles(prev => ({ ...prev, [profile.id]: false }));
      }
    };

    showModal(
      modalId,
      <ModrinthQuickInstallProfilesModal
        project={projectAsSearchResult as any}
        profiles={profiles}
        onProfileSelect={handleProfileSelect}
        onClose={() => {
          hideModal(modalId);
          setInstallModalVersions(null);
          setIsInstalling(false);
          setInstallingProfiles({});
          setInstallStatus({});
        }}
        installingProfiles={installingProfiles}
        installStatus={installStatus}
      />,
      1200
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installModalVersions, installingProfiles, installStatus, profiles, project.id]);

  const TypeIcon = getProjectTypeIcon(project.project_type);
  const categories = contentCategories(project.categories);

  return (
    <div className="flex items-start gap-4">
      {/* Project Icon */}
      <div
        className="w-16 h-16 flex-shrink-0 overflow-hidden bg-s3 border border-line grid place-items-center"
        style={{ borderRadius: "var(--r-md)" }}
      >
        {project.icon_url ? (
          <img
            src={project.icon_url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <TypeIcon size={24} strokeWidth={1.5} className="text-fg-4" />
        )}
      </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-[24px] leading-[1.15] font-[650] text-fg truncate" title={project.title}>
          {project.title}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-[12.5px] text-fg-3 min-w-0">
          {project.author && <span className="truncate">{t('mods.by_author', { author: project.author })}</span>}
          {project.author && <span className="text-fg-4">·</span>}
          <span className="inline-flex items-center gap-1 flex-shrink-0">
            <TypeIcon size={12} strokeWidth={1.75} className="text-fg-4" />
            {t(`mods.kind.${project.project_type}`, { defaultValue: project.project_type })}
          </span>
          <span className="text-fg-4">·</span>
          <span className="flex-shrink-0">{project.source}</span>
        </div>

        {/* Description */}
        <p className="mt-2 text-[13.5px] leading-[1.5] text-fg-2 line-clamp-2 max-w-[720px]">
          {project.description}
        </p>

        {/* Stats and categories */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1 cc-num text-[11.5px] text-fg-3" title={project.downloads.toLocaleString()}>
            <Download size={12} strokeWidth={1.75} className="text-fg-4" />
            {formatCompact(project.downloads)}
          </span>
          <span className="inline-flex items-center gap-1 cc-num text-[11.5px] text-fg-3" title={project.followers.toLocaleString()}>
            <Heart size={12} strokeWidth={1.75} className="text-fg-4" />
            {formatCompact(project.followers)}
          </span>
          {project.date_modified && (
            <span className="inline-flex items-center gap-1 cc-num text-[11.5px] text-fg-3">
              <RefreshCw size={12} strokeWidth={1.75} className="text-fg-4" />
              {formatRelative(project.date_modified)}
            </span>
          )}
          {categories.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              {categories.slice(0, 4).map((category) => (
                <span
                  key={category}
                  className="h-[18px] inline-flex items-center px-1.5 bg-s2 text-[11px] text-fg-3 capitalize"
                  style={{ borderRadius: "var(--r-sm)" }}
                >
                  {prettyCategory(category)}
                </span>
              ))}
              {categories.length > 4 && (
                <span className="cc-num text-[11px] text-fg-4">+{categories.length - 4}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Install (the one accent button on the page) + open on the website */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="default"
          size="md"
          icon={isInstalling ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} strokeWidth={1.75} />}
          disabled={isInstalling}
          onClick={handleInstallClick}
          className="min-w-[112px]"
        >
          {isInstalling ? t('modrinth.installing') : t('modrinth.install')}
        </Button>
        <button
          type="button"
          onClick={handleOpenProjectPage}
          className="cc-icon-btn w-9 h-9"
          title={t('mods.detail.open_website', { source: project.source })}
          aria-label={t('mods.detail.open_website', { source: project.source })}
        >
          <ExternalLink size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
