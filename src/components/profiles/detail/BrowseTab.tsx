"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import type { Profile } from "../../../types/profile";
import { useResolvedLoaderVersion } from "../../../hooks/useResolvedLoaderVersion";
import { useThemeStore } from "../../../store/useThemeStore";
import { setDiscordState } from "../../../utils/discordRpc";
import { useDisplayContextStore } from "../../../store/useDisplayContextStore";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { ModrinthSearchV2 } from "../../modrinth/v2/ModrinthSearchV2";
import { ProfileIconV2 } from "../ProfileIconV2";
import { Button } from "../../ui/buttons/Button";
import * as ProfileService from "../../../services/profile-service";
import type { ModrinthProjectType } from "../../../types/modrinth";
import { parseErrorMessage } from "../../../utils/error-utils";
import { loaderIconSrc } from "../../../lib/loader-icons";

interface BrowseTabProps {
  profile?: Profile;
  initialContentType?: string;
  onRefresh?: () => void;
  parentTransitionActive?: boolean;
}

export function BrowseTab({
  profile: initialProfile,
  initialContentType: initialContentTypeFromProp = "mods",
  onRefresh,
  parentTransitionActive,
}: BrowseTabProps) {
  const { t } = useTranslation();
  const { profileId, contentType: contentTypeFromUrl } = useParams<{ profileId: string; contentType: string }>();
  const navigate = useNavigate();
  const accentColor = useThemeStore((state) => state.accentColor);
  const setDisplayContext = useDisplayContextStore((state) => state.setContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentProfile, setCurrentProfile] = useState<Profile | undefined | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProfile && !!profileId);
  const [error, setError] = useState<string | null>(null);
  const resolvedLoaderVersion = useResolvedLoaderVersion(currentProfile);

  const activeContentType = contentTypeFromUrl || initialContentTypeFromProp;

  useEffect(() => {
    const discordMap: Record<string, string> = {
      mods: "Browsing Mods",
      resourcepacks: "Browsing Resource Packs",
      shaderpacks: "Browsing Shaders",
      datapacks: "Browsing Data Packs",
    };
    setDiscordState(discordMap[activeContentType] || "Browsing Mods");
  }, [activeContentType]);

  useEffect(() => {
    setDisplayContext("detail");
    return () => {
      setDisplayContext("standalone");
    };
  }, [setDisplayContext]);

  useEffect(() => {
    if (profileId && !initialProfile) {
      setIsLoading(true);
      setError(null);
      ProfileService.getProfile(profileId)
        .then(fetchedProfile => {
          setCurrentProfile(fetchedProfile);
        })
        .catch(err => {
          console.error(`Failed to fetch profile ${profileId}:`, err);
          setError(`Failed to load profile: ${parseErrorMessage(err)}`);
          setCurrentProfile(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (initialProfile) {
      setCurrentProfile(initialProfile);
      setIsLoading(false);
    }
  }, [profileId, initialProfile]);

  const getProjectType = () => {
    switch (activeContentType) {
      case "mods":
      case "mod":
        return "mod";
      case "resourcepacks":
      case "resourcepack":
        return "resourcepack";
      case "shaderpacks":
      case "shaderpack":
      case "shader":
        return "shader";
      case "datapacks":
      case "datapack":
        return "datapack";
      default:
        return "mod";
    }
  };



  // Get mod loader icon
  const getModLoaderIcon = () => loaderIconSrc(currentProfile?.loader);

  // Handle back navigation
  const handleBack = () => {
    if (profileId) {
      navigate(`/profilesv2/${profileId}`);
    } else {
      navigate("/profiles");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-[12px] text-fg-3">
        <Loader2 size={14} className="animate-spin" />
        {t('profiles.loading_profile_data')}
      </div>
    );
  }

  if (error || !currentProfile || !currentProfile.id) {
    return (
      <div className="h-full p-6">
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 border border-err/30 bg-err/10 max-w-[640px]"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <AlertTriangle size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-px" />
          <div className="min-w-0 text-[12px] leading-[1.5]">
            <div className="font-[560] text-fg">{error ? t('common.error') : t('mod_detail.project_not_found')}</div>
            <div className="text-fg-2 mt-0.5 break-words">
              {error ?? t('profiles.errors.profile_not_found', { id: profileId || t('common.not_available') })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loaderVersion = resolvedLoaderVersion?.version || currentProfile.loader_version;

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden px-6 pt-5 pb-4 relative">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Profile header, in the spirit of the profile detail page: icon, name, mono meta, back */}
        <div className="flex items-center gap-4 pb-4 mb-4 border-b border-line flex-shrink-0">
          <ProfileIconV2 profile={currentProfile} size="lg" className="w-14 h-14" />

          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[24px] font-[680] text-fg truncate">
              {currentProfile.name || currentProfile.id}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-fg-3 min-w-0">
              <span className="cc-num text-fg-2">{currentProfile.game_version}</span>
              {currentProfile.loader && currentProfile.loader !== "vanilla" && (
                <>
                  <span className="text-fg-4">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <img
                      src={getModLoaderIcon()}
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/icons/minecraft.png";
                      }}
                    />
                    <span className="capitalize">{currentProfile.loader}</span>
                    {loaderVersion && <span className="cc-num text-fg-4">{loaderVersion}</span>}
                  </span>
                </>
              )}
              {currentProfile.group && (
                <>
                  <span className="text-fg-4">·</span>
                  <span className="truncate">{currentProfile.group}</span>
                </>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleBack}
            title={t('profiles.back_to_profile')}
            icon={<ArrowLeft size={14} strokeWidth={1.75} />}
          >
            {t('common.back')}
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          <ModrinthSearchV2
            profiles={[currentProfile]}
            selectedProfileId={currentProfile.id}
            initialProjectType={getProjectType() as ModrinthProjectType}
            allowedProjectTypes={["mod", "resourcepack", "shader", "datapack"]}
            className="h-full"
            initialSidebarVisible={false}
            overrideDisplayContext="detail"
            disableVirtualization={true}
          />
        </div>
      </div>
    </div>
  );
}
