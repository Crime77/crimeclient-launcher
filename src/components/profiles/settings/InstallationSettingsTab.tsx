"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ModLoader, Profile } from "../../../types/profile";
import { useResolvedLoaderVersion } from "../../../hooks/useResolvedLoaderVersion";
import type { MinecraftVersion } from "../../../types/minecraft";
import { invoke } from "@tauri-apps/api/core";
import { StatusMessage } from "../../ui/StatusMessage";
import { useThemeStore } from "../../../store/useThemeStore";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { SearchWithFilters } from "../../ui/SearchWithFilters";
import { Select } from "../../ui/Select";
import { gsap } from "gsap";
import { cn } from "../../../lib/utils";
import { useTranslation } from "react-i18next";
import { parseErrorMessage } from "../../../utils/error-utils";

interface InstallationSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  refreshTrigger?: number; // Increment this to trigger a refresh
}

type VersionType = "release" | "snapshot" | "old-beta" | "old-alpha";

export function InstallationSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  refreshTrigger,
}: InstallationSettingsTabProps) {
  const { t } = useTranslation();
  const [selectedVersionType, setSelectedVersionType] =
    useState<VersionType>("release");
  const [minecraftVersions, setMinecraftVersions] = useState<
    MinecraftVersion[]
  >([]);
  const [filteredVersions, setFilteredVersions] = useState<string[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [isLoadingLoaderVersions, setIsLoadingLoaderVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const resolvedLoaderVersion = useResolvedLoaderVersion(editedProfile, refreshTrigger);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);
  const currentInstallRef = useRef<HTMLDivElement>(null);
  const versionsRef = useRef<HTMLDivElement>(null);
  const platformsRef = useRef<HTMLDivElement>(null);
  const loaderVersionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [previousLoader, setPreviousLoader] = useState<string>(
    editedProfile.loader || "vanilla",
  );

  useEffect(() => {
    const findScrollContainer = () => {
      let element: HTMLDivElement | null = tabRef.current;
      while (element) {
        const overflowY = window.getComputedStyle(element).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          return element;
        }
        element = element.parentElement as HTMLDivElement | null;
      }
      return null;
    };

    if (tabRef.current) {
      scrollContainerRef.current = findScrollContainer();
    }
  }, []);

  useEffect(() => {
    const currentLoader = editedProfile.loader || "vanilla";

    if (previousLoader !== currentLoader) {
      if (
        currentLoader !== "vanilla" &&
        loaderVersionRef.current &&
        isBackgroundAnimationEnabled
      ) {
        scrollToLoaderVersion();
      }

      setPreviousLoader(currentLoader);
    }
  }, [editedProfile.loader, previousLoader, isBackgroundAnimationEnabled]);


  useEffect(() => {
    async function fetchMinecraftVersions() {
      try {
        setIsLoadingVersions(true);
        setError(null);
        const result = await invoke<{ versions: MinecraftVersion[] }>(
          "get_minecraft_versions",
        );
        setMinecraftVersions(result.versions);
      } catch (err) {
        console.error("Failed to fetch Minecraft versions:", err);
        setError(
          `failed to fetch minecraft versions: ${parseErrorMessage(err)}`,
        );
      } finally {
        setIsLoadingVersions(false);
      }
    }

    fetchMinecraftVersions();
  }, []);

  useEffect(() => {
    if (minecraftVersions.length > 0) {
      // Convert filter value to API format (old-beta -> old_beta)
      const apiVersionType = selectedVersionType.replace('-', '_');

      const filtered = minecraftVersions
        .filter((version) => version.type === apiVersionType)
        .filter((version) =>
          searchQuery
            ? version.id.toLowerCase().includes(searchQuery.toLowerCase())
            : true,
        )
        .map((version) => version.id);
      setFilteredVersions(filtered);
    }
  }, [minecraftVersions, selectedVersionType, searchQuery]);

  useEffect(() => {
    async function fetchLoaderVersions() {
      if (!editedProfile.game_version || editedProfile.loader === "vanilla") {
        setLoaderVersions([]);
        return;
      }

      try {
        setIsLoadingLoaderVersions(true);
        setError(null);
        let versions: string[] = [];

        switch (editedProfile.loader) {
          case "fabric":
            const fabricResult = await invoke<{ loader: { version: string } }[]>(
              "get_fabric_loader_versions",
              {
                minecraftVersion: editedProfile.game_version,
              },
            );
            versions = fabricResult.map((v) => v.loader.version);
            break;
          case "forge":
            versions = await invoke<string[]>("get_forge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
          case "quilt":
            const quiltResult = await invoke<{ loader: { version: string } }[]>(
              "get_quilt_loader_versions",
              {
                minecraftVersion: editedProfile.game_version,
              },
            );
            versions = quiltResult.map((v) => v.loader.version);
            break;
          case "neoforge":
            versions = await invoke<string[]>("get_neoforge_versions", {
              minecraftVersion: editedProfile.game_version,
            });
            break;
        }

        setLoaderVersions(versions);
      } catch (err) {
        console.error(`Failed to fetch ${editedProfile.loader} versions:`, err);
        setError(
          `failed to fetch ${editedProfile.loader} versions: ${parseErrorMessage(err)}`,
        );
      } finally {
        setIsLoadingLoaderVersions(false);
      }
    }

    fetchLoaderVersions();
  }, [editedProfile.game_version, editedProfile.loader]);

  function isModLoaderCompatible(
    loader: string,
    minecraftVersion: string,
  ): boolean {
    if (loader === "vanilla") return true;

    switch (loader) {
      case "fabric":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "forge":
        return true;
      case "quilt":
        return isVersionNewerOrEqual(minecraftVersion, "1.14");
      case "neoforge":
        return isVersionNewerOrEqual(minecraftVersion, "1.20.1");
      default:
        return false;
    }
  }

  function isVersionNewerOrEqual(
    version: string,
    baseVersion: string,
  ): boolean {
    const parseVersion = (v: string) => {
      const parts = v.split(".");
      return {
        major: Number.parseInt(parts[0]) || 0,
        minor: Number.parseInt(parts[1]) || 0,
        patch: Number.parseInt(parts[2]) || 0,
      };
    };

    const v1 = parseVersion(version);
    const v2 = parseVersion(baseVersion);

    if (v1.major !== v2.major) return v1.major > v2.major;
    if (v1.minor !== v2.minor) return v1.minor > v2.minor;
    return v1.patch >= v2.patch;
  }

  const handleVersionTypeClick = (type: VersionType) => {
    if (selectedVersionType !== type) {
      setSelectedVersionType(type);
    }
  };

  const handleGameVersionClick = (versionId: string) => {
    updateProfile({ game_version: versionId, loader_version: null });
    if (isBackgroundAnimationEnabled) {
      scrollToPlatforms();
    }
  };

  const handleLoaderClick = (loaderName: string) => {
    const newLoader = (
      editedProfile.loader === loaderName ? "vanilla" : loaderName
    ) as ModLoader;
    updateProfile({ loader: newLoader, loader_version: null });

    if (newLoader !== "vanilla" && isBackgroundAnimationEnabled) {
      scrollToLoaderVersion();
    }
  };

  const scrollToPlatforms = () => {
    if (!platformsRef.current || !scrollContainerRef.current) return;
    if (isBackgroundAnimationEnabled) {
      gsap.to(scrollContainerRef.current, {
        duration: 0.5,
        scrollTo: {
          y:
            platformsRef.current.offsetTop -
            scrollContainerRef.current.offsetTop -
            20,
          autoKill: true,
        },
        ease: "power2.out",
      });
      gsap.fromTo(
        platformsRef.current,
        { scale: 0.98, opacity: 0.5 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" },
      );
    }
  };

  const scrollToLoaderVersion = () => {
    if (!loaderVersionRef.current || !scrollContainerRef.current) return;
    if (isBackgroundAnimationEnabled) {
      gsap.to(scrollContainerRef.current, {
        duration: 0.5,
        scrollTo: {
          y:
            loaderVersionRef.current.offsetTop -
            scrollContainerRef.current.offsetTop -
            20,
          autoKill: true,
        },
        ease: "power2.out",
      });
      gsap.fromTo(
        loaderVersionRef.current,
        { scale: 0.98, opacity: 0.5 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" },
      );
    }
  };



  const getReasonText = (reason: string): string => {
    switch (reason) {
      case "norisk_pack":
        return t('profiles.settings.reasonNoriskPack');
      case "user_overwrite":
        return t('profiles.settings.reasonUserOverwrite');
      case "profile_default":
        return t('profiles.settings.reasonProfileDefault');
      case "not_resolved":
        return t('profiles.settings.reasonNotResolved');
      default:
        return reason;
    }
  };

  const loaderOptions = [
    { name: "vanilla", label: "Vanilla", icon: "/icons/minecraft.png" },
    { name: "fabric", label: "Fabric", icon: "/icons/fabric.png" },
    { name: "forge", label: "Forge", icon: "/icons/forge.png" },
    { name: "quilt", label: "Quilt", icon: "/icons/quilt.png" },
    { name: "neoforge", label: "NeoForge", icon: "/icons/neoforge.png" },
  ];
  const currentLoaderOption =
    loaderOptions.find((l) => l.name === editedProfile.loader) ?? loaderOptions[0];

  return (
    <div ref={tabRef} className="space-y-8 select-none">
      {error && <StatusMessage type="error" message={error} />}

      <SettingsSection title={t('profiles.settings.installation')}>
        <div ref={currentInstallRef}>
          <SettingsRow label={t('profiles.settings.currentlyInstalled')}>
            <div className="flex items-center gap-3 cc-num text-[12px]">
              <span className="flex items-center gap-1.5 text-fg">
                <img src="/icons/minecraft.png" alt="Minecraft" className="w-3.5 h-3.5 object-contain" />
                {editedProfile.game_version}
              </span>
              <span className="w-px h-3.5 bg-line-2" />
              <span className="flex items-center gap-1.5 text-fg-2">
                <img
                  src={currentLoaderOption.icon}
                  alt={editedProfile.loader || "Vanilla"}
                  className="w-3.5 h-3.5 object-contain"
                />
                {editedProfile.loader === "vanilla"
                  ? "vanilla"
                  : `${editedProfile.loader} ${resolvedLoaderVersion?.version || editedProfile.loader_version || ""}`.trim()}
              </span>
            </div>
          </SettingsRow>
        </div>

        <div ref={versionsRef}>
          <SettingsRow stacked label={t('profiles.settings.gameVersion')}>
            <SearchWithFilters
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder={t('profiles.settings.searchVersions')}
              className="w-full"
              showSort={false}
              showFilter={true}
              filterOptions={[
                { value: "release", label: t('profiles.settings.release'), icon: "solar:filter-bold" },
                { value: "snapshot", label: t('profiles.settings.snapshot'), icon: "solar:filter-bold" },
                { value: "old-beta", label: t('profiles.settings.oldBeta'), icon: "solar:filter-bold" },
                { value: "old-alpha", label: t('profiles.settings.oldAlpha'), icon: "solar:filter-bold" },
              ]}
              filterValue={selectedVersionType}
              onFilterChange={(value) => {
                const versionType = value as VersionType;
                handleVersionTypeClick(versionType);
              }}
            />

            <div
              className="mt-2 bg-s1 border border-line max-h-48 overflow-y-auto custom-scrollbar"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {isLoadingVersions ? (
                <div className="flex items-center justify-center gap-2 h-20 text-[12px] text-fg-3">
                  <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                  {t('profiles.settings.loadingVersions')}
                </div>
              ) : filteredVersions.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-[12px] text-fg-3">
                  {t('profiles.settings.noVersionsFound')}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1 p-1.5">
                  {filteredVersions.map((version) => {
                    const isSelected = editedProfile.game_version === version;
                    return (
                      <button
                        key={version}
                        type="button"
                        aria-pressed={isSelected}
                        className={cn(
                          "h-7 px-2 border cc-num text-[12px] truncate transition-colors duration-fast",
                          isSelected
                            ? "bg-s3 border-line-3 text-fg"
                            : "border-transparent text-fg-2 hover:bg-s2 hover:text-fg",
                          profile.is_standard_version && "cursor-not-allowed opacity-50"
                        )}
                        style={{ borderRadius: "var(--r-sm)" }}
                        onClick={() => !profile.is_standard_version && handleGameVersionClick(version)}
                        disabled={profile.is_standard_version ? true : false}
                      >
                        {version}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </SettingsRow>
        </div>

        <div ref={platformsRef}>
          <SettingsRow stacked label={t('profiles.settings.platform')}>
            <div
              className="grid grid-cols-5 gap-0.5 p-0.5 bg-s2 border border-line"
              style={{ borderRadius: "var(--r-md)" }}
              role="radiogroup"
              aria-label={t('profiles.settings.platform')}
            >
              {loaderOptions.map((loader) => {
                const isCompatible = isModLoaderCompatible(
                  loader.name,
                  editedProfile.game_version,
                );
                const isSelected = editedProfile.loader === loader.name;

                return (
                  <button
                    key={loader.name}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!isCompatible}
                    title={isCompatible ? loader.label : t('profiles.settings.notCompatible')}
                    className={cn(
                      "h-8 min-w-0 flex items-center justify-center gap-2 px-2 text-[13px] transition-colors duration-fast",
                      `platform-${loader.name}`,
                      isSelected
                        ? "bg-s4 text-fg font-[560]"
                        : isCompatible
                          ? "text-fg-2 hover:text-fg hover:bg-s3"
                          : "text-fg-4 cursor-not-allowed",
                    )}
                    style={{ borderRadius: "var(--r-sm)" }}
                    onClick={() => isCompatible && handleLoaderClick(loader.name)}
                  >
                    <img
                      src={loader.icon || "/placeholder.svg"}
                      alt=""
                      className="w-4 h-4 object-contain flex-shrink-0"
                      style={{ opacity: isCompatible ? 1 : 0.4 }}
                    />
                    <span className="truncate">{loader.label}</span>
                  </button>
                );
              })}
            </div>
          </SettingsRow>
        </div>
      </SettingsSection>

      {editedProfile.loader !== "vanilla" && (
        <div ref={loaderVersionRef}>
          <SettingsSection title={t('profiles.settings.loaderVersion', { loader: editedProfile.loader })}>
            {resolvedLoaderVersion && (
              <SettingsRow
                label={t('profiles.settings.inUse')}
                description={
                  resolvedLoaderVersion.reason !== "profile_default"
                    ? getReasonText(resolvedLoaderVersion.reason)
                    : undefined
                }
              >
                <span className="cc-num text-[12px] text-fg">
                  {resolvedLoaderVersion.version || t('profiles.settings.notSet')}
                </span>
              </SettingsRow>
            )}

            {isLoadingLoaderVersions ? (
              <div className="flex items-center gap-2 py-3.5 text-[12px] text-fg-3">
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                {t('profiles.settings.loadingLoaderVersions', { loader: editedProfile.loader })}
              </div>
            ) : loaderVersions.length > 0 ? (
              <SettingsRow
                label={t('profiles.settings.useCustomLoaderVersion', { loader: editedProfile.loader.charAt(0).toUpperCase() + editedProfile.loader.slice(1) })}
                description={t('profiles.settings.customLoaderVersionDescription')}
              >
                <div className="w-[200px]">
                  <Select
                    value={editedProfile.settings.overwrite_loader_version || ""}
                    onChange={(value) => updateProfile({
                      settings: {
                        ...editedProfile.settings,
                        overwrite_loader_version: value
                      }
                    })}
                    options={[
                      { value: "", label: t('profiles.settings.selectCustomVersion') },
                      ...loaderVersions.map((version) => ({
                        value: version,
                        label: version,
                      })),
                    ]}
                    size="sm"
                    className="cc-num"
                    variant="flat"
                    disabled={!editedProfile.settings.use_overwrite_loader_version}
                  />
                </div>
                <ToggleSwitch
                  checked={editedProfile.settings.use_overwrite_loader_version}
                  onChange={(checked) => updateProfile({
                    settings: {
                      ...editedProfile.settings,
                      use_overwrite_loader_version: checked
                    }
                  })}
                />
              </SettingsRow>
            ) : (
              <div className="py-3.5 text-[12px] text-fg-3">
                {t('profiles.settings.noLoaderVersions', { loader: editedProfile.loader, version: editedProfile.game_version })}
              </div>
            )}
          </SettingsSection>
        </div>
      )}
    </div>
  );
}
