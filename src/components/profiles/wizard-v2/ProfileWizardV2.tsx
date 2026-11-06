"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, Loader2, Search, Star } from "lucide-react";
import type { MinecraftVersion, VersionManifest } from "../../../types/minecraft";
import type { ModLoader } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { SearchWithFilters } from "../../ui/SearchWithFilters";
import { ProfileWizardV2Step2 } from "./ProfileWizardV2Step2";
import { ProfileWizardV2Step3 } from "./ProfileWizardV2Step3";
import { useProfileStore } from "../../../store/profile-store";
import type { CreateProfileParams } from "../../../types/profile";
import type { ChosenIcon } from "../IconPicker";
import { uploadProfileImages } from "../../../services/profile-service";
import { toast } from "react-hot-toast";
import { Tooltip } from "../../ui/Tooltip";
import type { NoriskModpacksConfig } from "../../../types/noriskPacks";
import { extractNrcCompatibility, type NrcCompatibilityData } from "../../../utils/nrc-compatibility";
import { useTranslation } from "react-i18next";
import { parseErrorMessage } from "../../../utils/error-utils";
import { loadPacks } from "../../../hooks/usePacks";
import { logError } from "../../../utils/logging-utils";
import { ProfileSourceChooser, type ProfileSource } from "../ProfileSourceChooser";
import { ProfileWizardV2LauncherStep } from "./ProfileWizardV2LauncherStep";
import { ProfileWizardV2ReviewStep } from "./ProfileWizardV2ReviewStep";
import {
  runLauncherImportQueue,
  runLauncherInstanceImport,
  type LauncherImportOverrides,
} from "../../../utils/launcher-instance-import";
import { DEFAULT_IMPORT_SELECTION, type ExternalInstanceRef } from "../../../types/launcherImport";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import { WizardSteps, Segmented, choiceCardClasses } from "./WizardParts";

function NrcCompatibleTooltipContent() {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 max-w-[220px]">
      <div className="text-[12.5px] font-medium text-fg">{t('profiles.wizard.nrcCompatible')}</div>
      <div className="text-[12px] text-fg-3">{t('profiles.wizard.nrcFeaturesAvailable')}</div>
    </div>
  );
}

type WizardStep = 0 | 1 | 2 | 3 | "launcher" | "launcher-review";

interface ProfileWizardV2Props {
  onClose: () => void;
  onSave: (profile: any) => void;
  onSource?: (source: Exclude<ProfileSource, "blank" | "launcher">) => void;
  onImported?: (profileIds: string[]) => void;
  startAtSource?: boolean;
  defaultGroup?: string | null;
}

export function ProfileWizardV2({
  onClose,
  onSave,
  onSource,
  onImported,
  startAtSource = false,
  defaultGroup,
}: ProfileWizardV2Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>(startAtSource && onSource ? 0 : 1);
  const [launcherTarget, setLauncherTarget] = useState<ExternalInstanceRef | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Step 1 data
  const [minecraftVersions, setMinecraftVersions] = useState<MinecraftVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVersionType, setSelectedVersionType] = useState<"release" | "snapshot">("release");
  
  // Step 2 data
  const [selectedLoader, setSelectedLoader] = useState<ModLoader>("fabric");
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState<string | null>(null);

  // NRC compatibility data
  const [nrcCompatibility, setNrcCompatibility] = useState<NrcCompatibilityData | null>(null);

  useEffect(() => {
    const loadMinecraftVersions = async () => {
      setLoading(true);
      setShowLoadingIndicator(false);
      
      // Show loading indicator only after 800ms delay
      const loadingTimeout = setTimeout(() => {
        if (loading) {
          setShowLoadingIndicator(true);
        }
      }, 800);

      try {
        const manifest = await invoke<VersionManifest>("get_minecraft_versions");
        setMinecraftVersions(manifest.versions);
        
        // Auto-select latest release
        const latestRelease = manifest.versions.find(v => v.type === "release");
        if (latestRelease) {
          setSelectedVersion(latestRelease.id);
        }
      } catch (err) {
        setError(t('profiles.wizard.loadVersionsError'));
        console.error("Failed to load Minecraft versions:", err);
      } finally {
        clearTimeout(loadingTimeout);
        setLoading(false);
        setShowLoadingIndicator(false);
      }
    };

    loadMinecraftVersions();
  }, []);

  // Load NRC compatibility data in parallel
  useEffect(() => {
    const loadNrcCompatibility = async () => {
      try {
        const packsConfig: NoriskModpacksConfig = { packs: await loadPacks(), repositories: {} };
        setNrcCompatibility(extractNrcCompatibility(packsConfig));
      } catch (err) {
        logError(`Failed to load NRC compatibility: ${err}`);
      }
    };
    loadNrcCompatibility();
  }, []);

  const filteredVersions = minecraftVersions
    .filter(version => {
      // Release shows all non-snapshot versions (release, alpha, etc.)
      // Snapshot shows only snapshot versions
      if (selectedVersionType === "release" && version.type === "snapshot") {
        return false;
      }
      if (selectedVersionType === "snapshot" && version.type !== "snapshot") {
        return false;
      }
      if (searchQuery) {
        return version.id.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

  const handleStep1Next = () => {
    if (selectedVersion) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = (loader: ModLoader, loaderVersion: string | null) => {
    setSelectedLoader(loader);
    setSelectedLoaderVersion(loaderVersion);
    setCurrentStep(3);
  };

  const handleStep3Create = async (profileData: {
    name: string;
    group: string | null;
    minecraftVersion: string;
    loader: ModLoader;
    loaderVersion: string | null;
    memoryMaxMb: number;
    selectedNoriskPackId: string | null;
    use_shared_minecraft_folder?: boolean;
    chosenIcon: ChosenIcon;
  }) => {
    const { createProfile } = useProfileStore.getState();

    const createParams: CreateProfileParams = {
      name: profileData.name,
      game_version: profileData.minecraftVersion,
      loader: profileData.loader,
      loader_version: profileData.loaderVersion || undefined,
      selected_norisk_pack_id: profileData.selectedNoriskPackId || undefined,
      use_shared_minecraft_folder: profileData.use_shared_minecraft_folder,
    };

    const creationPromise = async () => {
      const profileId = await createProfile(createParams);

      // Update profile with additional settings
      const updateData: any = {};
      
      if (profileData.group) {
        updateData.group = profileData.group;
      }

      // Set memory settings
      updateData.settings = {
        memory: {
          min: 1024, // Default minimum
          max: profileData.memoryMaxMb
        }
      };

      if (Object.keys(updateData).length > 0) {
        await useProfileStore.getState().updateProfile(profileId, updateData);
      }

      // Apply the chosen profile icon (best-effort — a download failure must not abort creation)
      try {
        const icon = profileData.chosenIcon;
        await uploadProfileImages({
          profileId,
          imageType: "icon",
          ...("url" in icon ? { iconUrl: icon.url } : { path: icon.path }),
        });
      } catch (iconErr) {
        console.warn("Failed to apply profile icon:", iconErr);
      }

      const createdProfile = await useProfileStore.getState().getProfile(profileId);
      onSave(createdProfile);
      return createdProfile;
    };

    return toast.promise(creationPromise(), {
      loading: t('profiles.wizard.creatingProfile'),
      success: (createdProfile) => t('profiles.wizard.createSuccess', { name: createdProfile.name }),
      error: (err) => t('profiles.wizard.createError', { error: parseErrorMessage(err) }),
    });
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const handleBackToStep2 = () => {
    setCurrentStep(2);
  };

  const renderContent = () => {
    if (showLoadingIndicator) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-64 text-fg-3">
          <Loader2 size={20} strokeWidth={1.75} className="animate-spin" />
          <p className="text-[12.5px]">{t('profiles.wizard.loadingVersions')}</p>
        </div>
      );
    }

    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div className="space-y-4">
        {/* Search and type */}
        <div className="flex gap-3 items-center">
          <SearchWithFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={t('profiles.wizard.searchVersions')}
            showSort={false}
            showFilter={false}
            className="flex-1 min-w-0"
          />

          <Segmented<"release" | "snapshot">
            value={selectedVersionType}
            onChange={setSelectedVersionType}
            options={[
              { value: "release", label: t('profiles.wizard.release') },
              { value: "snapshot", label: t('profiles.wizard.snapshot'), icon: <FlaskConical size={13} strokeWidth={1.75} /> },
            ]}
          />
        </div>

        {/* Version grid: dense cells, mono ids */}
        <div className="max-h-[392px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 grid grid-cols-4 gap-1.5 content-start">
          {filteredVersions.map(version => {
            const isNrcCompatible = nrcCompatibility?.compatibleVersions.has(version.id);
            const isSelected = selectedVersion === version.id;
            // In the release list only the old alpha/beta builds name their type
            const typeLabel = version.type !== "release" && version.type !== "snapshot"
              ? version.type.replace(/^old_/, "")
              : null;

            return (
              <button
                key={version.id}
                type="button"
                aria-pressed={isSelected}
                className={cn("h-10 px-3 flex items-center gap-2", choiceCardClasses(isSelected))}
                style={{ borderRadius: "var(--r-md)" }}
                onClick={() => setSelectedVersion(version.id)}
              >
                <span className={cn("cc-num text-[13px] truncate", isSelected ? "text-fg" : "text-fg-2")}>
                  {version.id}
                </span>
                {typeLabel && (
                  <span className="text-[11px] text-fg-4 capitalize">{typeLabel}</span>
                )}
                {isNrcCompatible && (
                  <span className="ml-auto flex-shrink-0">
                    <Tooltip content={<NrcCompatibleTooltipContent />}>
                      <Star size={12} strokeWidth={1.75} className="text-fg-3" />
                    </Tooltip>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filteredVersions.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-2 py-10 text-fg-3">
            <Search size={18} strokeWidth={1.75} />
            <p className="text-[12.5px]">{t('profiles.wizard.noVersionsFound')}</p>
          </div>
        )}
      </div>
    );
  };

  const renderFooter = () => (
    <div className={`flex items-center ${startAtSource && onSource ? "justify-between" : "justify-end"}`}>
      {startAtSource && onSource && (
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(0)}
          size="sm"
          icon={<ArrowLeft size={15} strokeWidth={1.75} />}
        >
          {t('profiles.wizard.back')}
        </Button>
      )}
      <Button
        variant="default"
        onClick={handleStep1Next}
        disabled={loading || !selectedVersion}
        size="sm"
        className="min-w-[96px]"
        icon={<ArrowRight size={15} strokeWidth={1.75} />}
        iconPosition="right"
      >
        {t('profiles.wizard.next')}
      </Button>
    </div>
  );

  const finishLauncherImport = (profileIds: string[]) => {
    setImporting(false);
    if (profileIds.length > 0) onImported?.(profileIds);
  };

  const importInstances = async (instances: ExternalInstanceRef[]) => {
    if (instances.length === 1) {
      setLauncherTarget(instances[0]);
      setCurrentStep("launcher-review");
      return;
    }

    setImporting(true);
    const outcome = await runLauncherImportQueue(
      instances.map((target) => ({
        target,
        overrides: { selection: DEFAULT_IMPORT_SELECTION },
      })),
    );
    finishLauncherImport(outcome.imported);
  };

  const importReviewed = async (overrides: LauncherImportOverrides) => {
    if (!launcherTarget) return;
    setImporting(true);
    const profileId = await runLauncherInstanceImport(launcherTarget, overrides);
    finishLauncherImport(profileId ? [profileId] : []);
  };

  if (currentStep === 0 && onSource) {
    return (
      <Modal title={t('profiles.newProfile')} onClose={onClose} width="md">
        <ProfileSourceChooser
          onChoose={(source) => {
            if (source === "blank") setCurrentStep(1);
            else if (source === "launcher") setCurrentStep("launcher");
            else onSource(source);
          }}
        />
      </Modal>
    );
  }

  if (currentStep === "launcher") {
    return (
      <ProfileWizardV2LauncherStep
        onClose={onClose}
        onBack={() => setCurrentStep(0)}
        onImport={(instances) => void importInstances(instances)}
        onOpenProfile={(profileId) => {
          onClose();
          navigate(`/profilesv2/${profileId}`);
        }}
        busy={importing}
      />
    );
  }

  if (currentStep === "launcher-review" && launcherTarget) {
    return (
      <ProfileWizardV2ReviewStep
        target={launcherTarget}
        onClose={onClose}
        onBack={() => setCurrentStep("launcher")}
        onImport={(overrides) => void importReviewed(overrides)}
        busy={importing}
      />
    );
  }

  // Show Step 2 if we're on step 2
  if (currentStep === 2) {
    return (
      <ProfileWizardV2Step2
        onClose={onClose}
        onNext={handleStep2Next}
        onBack={handleBackToStep1}
        selectedMinecraftVersion={selectedVersion}
        nrcCompatibility={nrcCompatibility}
      />
    );
  }

  // Show Step 3 if we're on step 3
  if (currentStep === 3) {
    return (
      <ProfileWizardV2Step3
        onClose={onClose}
        onBack={handleBackToStep2}
        onCreate={handleStep3Create}
        selectedMinecraftVersion={selectedVersion}
        selectedLoader={selectedLoader}
        selectedLoaderVersion={selectedLoaderVersion}
        defaultGroup={defaultGroup}
      />
    );
  }

  // Default: Show Step 1
  return (
    <Modal
      title={t('profiles.newProfile')}
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <WizardSteps current={1} />
      <div className="min-h-[460px] px-5 py-4">
        {renderContent()}
      </div>
    </Modal>
  );
} 