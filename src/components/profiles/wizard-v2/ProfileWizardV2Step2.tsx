"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Star, TriangleAlert } from "lucide-react";
import type { ModLoader } from "../../../types/profile";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { StatusMessage } from "../../ui/StatusMessage";
import { Select } from "../../ui/Select";
import { Tooltip } from "../../ui/Tooltip";
import type { NrcCompatibilityData } from "../../../utils/nrc-compatibility";
import { useTranslation } from "react-i18next";
import { parseErrorMessage } from "../../../utils/error-utils";
import { cn } from "../../../lib/utils";
import { WizardSteps, choiceCardClasses, FieldLabel } from "./WizardParts";

function NrcLoaderCompatibleTooltipContent() {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 max-w-[220px]">
      <div className="text-[12.5px] font-medium text-fg">{t('profiles.wizard.nrcLoaderCompatible')}</div>
      <div className="text-[12px] text-fg-3">{t('profiles.wizard.nrcLoaderFeatures')}</div>
    </div>
  );
}

interface LoaderVersionInfo {
  loader: {
    version: string;
    stable?: boolean;
  };
}

interface ProfileWizardV2Step2Props {
  onClose: () => void;
  onNext: (selectedLoader: ModLoader, selectedLoaderVersion: string | null) => void;
  onBack: () => void;
  selectedMinecraftVersion: string;
  nrcCompatibility: NrcCompatibilityData | null;
}

export function ProfileWizardV2Step2({
  onClose,
  onNext,
  onBack,
  selectedMinecraftVersion,
  nrcCompatibility
}: ProfileWizardV2Step2Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoader, setSelectedLoader] = useState<ModLoader>("fabric");
  const [selectedLoaderVersion, setSelectedLoaderVersion] = useState<string | null>(null);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [showNoVersionsFound, setShowNoVersionsFound] = useState(false);
  const [unavailableLoaders, setUnavailableLoaders] = useState<Set<ModLoader>>(new Set());

  const modLoaders: { key: ModLoader; label: string; icon: string; backgroundImage: string }[] = [
    { key: "vanilla", label: "Vanilla", icon: "solar:gamepad-bold", backgroundImage: "/icons/minecraft.png" },
    { key: "fabric", label: "Fabric", icon: "solar:box-bold", backgroundImage: "/icons/fabric.png" },
    { key: "forge", label: "Forge", icon: "solar:sledgehammer-bold", backgroundImage: "/icons/forge.png" },
    { key: "neoforge", label: "NeoForge", icon: "solar:shield-bold", backgroundImage: "/icons/neoforge.png" },
    { key: "quilt", label: "Quilt", icon: "solar:widget-bold", backgroundImage: "/icons/quilt.png" },
  ];

  // Check all mod loaders availability when Minecraft version changes
  useEffect(() => {
    const checkAllLoaders = async () => {
      setUnavailableLoaders(new Set());
      
      // Check all mod loaders in parallel
      const modLoaderKeys: Exclude<ModLoader, "vanilla">[] = ["fabric", "forge", "neoforge", "quilt"];
      
      const checkPromises = modLoaderKeys.map(async (loaderKey) => {
        try {
          let versions: string[] = [];
          
          switch (loaderKey) {
            case "fabric":
              const fabricVersions = await invoke<LoaderVersionInfo[]>(
                "get_fabric_loader_versions",
                { minecraftVersion: selectedMinecraftVersion }
              );
              versions = fabricVersions.map(v => 
                `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`
              );
              break;
              
            case "forge":
              versions = await invoke<string[]>("get_forge_versions", {
                minecraftVersion: selectedMinecraftVersion,
              });
              break;
              
            case "neoforge":
              versions = await invoke<string[]>("get_neoforge_versions", {
                minecraftVersion: selectedMinecraftVersion,
              });
              break;
              
            case "quilt":
              const quiltVersions = await invoke<LoaderVersionInfo[]>(
                "get_quilt_loader_versions",
                { minecraftVersion: selectedMinecraftVersion }
              );
              versions = quiltVersions.map(v => 
                `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`
              );
              break;
          }
          
          // If no versions available, mark as unavailable
          if (versions.length === 0) {
            return loaderKey;
          }
          return null;
        } catch (err) {
          // Check if error is a 400/404 (no versions available) vs real error
          const errorMessage = err instanceof Error 
            ? err.message 
            : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as any).message)
            : parseErrorMessage(err);
          const errorKind = typeof err === 'object' && err !== null && 'kind' in err
            ? String((err as any).kind)
            : '';
          const isNoVersionsError = 
            errorMessage.includes("Status 400") || 
            errorMessage.includes("Status 404") ||
            errorKind.includes("Status 400") ||
            errorKind.includes("Status 404");
          
          if (isNoVersionsError) {
            return loaderKey;
          }
          // Real error - don't mark as unavailable, let user see the error
          return null;
        }
      });
      
      const unavailableResults = await Promise.all(checkPromises);
      const unavailable = unavailableResults.filter((loader): loader is Exclude<ModLoader, "vanilla"> => loader !== null);
      
      if (unavailable.length > 0) {
        setUnavailableLoaders(new Set(unavailable));
        
        // If currently selected loader becomes unavailable, switch to vanilla
        if (unavailable.includes(selectedLoader as Exclude<ModLoader, "vanilla">)) {
          setSelectedLoader("vanilla");
        }
      }
    };
    
    checkAllLoaders();
  }, [selectedMinecraftVersion]);

  // Fetch versions when loader changes
  useEffect(() => {
    const fetchVersions = async () => {
      if (selectedLoader === "vanilla") {
        setLoaderVersions([]);
        setSelectedLoaderVersion(null);
        setShowLoadingIndicator(false);
        setShowNoVersionsFound(false);
        return;
      }

      setLoadingVersions(true);
      setShowLoadingIndicator(false);
      setShowNoVersionsFound(false);
      setError(null);

      // Show loading indicator only after 800ms delay
      const loadingTimeout = setTimeout(() => {
        if (loadingVersions) {
          setShowLoadingIndicator(true);
        }
      }, 800);

      // Show "no versions found" only after 800ms delay
      const noVersionsTimeout = setTimeout(() => {
        if (!loadingVersions && loaderVersions.length === 0 && !error) {
          setShowNoVersionsFound(true);
        }
      }, 800);

      try {
        let versions: string[] = [];

        switch (selectedLoader) {
          case "fabric":
            const fabricVersions = await invoke<LoaderVersionInfo[]>(
              "get_fabric_loader_versions",
              { minecraftVersion: selectedMinecraftVersion }
            );
            versions = fabricVersions.map(v => 
              `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`
            );
            break;

          case "forge":
            versions = await invoke<string[]>("get_forge_versions", {
              minecraftVersion: selectedMinecraftVersion,
            });
            break;

          case "neoforge":
            versions = await invoke<string[]>("get_neoforge_versions", {
              minecraftVersion: selectedMinecraftVersion,
            });
            break;

          case "quilt":
            const quiltVersions = await invoke<LoaderVersionInfo[]>(
              "get_quilt_loader_versions",
              { minecraftVersion: selectedMinecraftVersion }
            );
            versions = quiltVersions.map(v => 
              `${v.loader.version}${v.loader.stable ? " (stable)" : ""}`
            );
            break;
        }

        setLoaderVersions(versions);
        // Auto-select latest (first) version
        if (versions.length > 0) {
          setSelectedLoaderVersion(versions[0]);
          setShowNoVersionsFound(false);
        } else {
          // No versions available - mark loader as unavailable
          if (selectedLoader === "fabric" || selectedLoader === "forge" || selectedLoader === "neoforge" || selectedLoader === "quilt") {
            setUnavailableLoaders(prev => new Set(prev).add(selectedLoader));
            setSelectedLoader("vanilla");
          }
          setSelectedLoaderVersion(null);
          setShowNoVersionsFound(false);
        }
      } catch (err) {
        console.error(`Failed to fetch ${selectedLoader} versions:`, err);
        
        // Check if error is a 400/404 (no versions available) vs real error
        const errorMessage = err instanceof Error 
          ? err.message 
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message)
          : parseErrorMessage(err);
        const errorKind = typeof err === 'object' && err !== null && 'kind' in err
          ? String((err as any).kind)
          : '';
        const isNoVersionsError = 
          errorMessage.includes("Status 400") || 
          errorMessage.includes("Status 404") ||
          errorKind.includes("Status 400") ||
          errorKind.includes("Status 404");
        
        if (isNoVersionsError) {
          // No versions available - mark loader as unavailable, don't show error
          // Only mark mod loaders as unavailable (not vanilla)
          if (selectedLoader === "fabric" || selectedLoader === "forge" || selectedLoader === "neoforge" || selectedLoader === "quilt") {
            setUnavailableLoaders(prev => new Set(prev).add(selectedLoader));
            setSelectedLoader("vanilla");
          }
          setLoaderVersions([]);
          setSelectedLoaderVersion(null);
          setShowNoVersionsFound(false);
          setError(null);
        } else {
          // Real error - show error message
          setError(t('profiles.wizard.loadLoaderVersionsError', { loader: selectedLoader }));
          setLoaderVersions([]);
          setSelectedLoaderVersion(null);
          setShowNoVersionsFound(false);
        }
      } finally {
        clearTimeout(loadingTimeout);
        clearTimeout(noVersionsTimeout);
        setLoadingVersions(false);
        setShowLoadingIndicator(false);
      }
    };

    fetchVersions();
  }, [selectedLoader, selectedMinecraftVersion]);

  const handleNext = () => {
    onNext(selectedLoader, selectedLoaderVersion);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-64 text-fg-3">
          <Loader2 size={20} strokeWidth={1.75} className="animate-spin" />
          <p className="text-[12.5px]">{t('profiles.wizard.loading')}</p>
        </div>
      );
    }

    if (error) {
      return <StatusMessage type="error" message={error} />;
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Mod loader: flat choice cards */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="cc-eyebrow">{t('profiles.wizard.steps.loader')}</span>
            <span className="cc-num text-[11.5px] text-fg-4">Minecraft {selectedMinecraftVersion}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {modLoaders.map(loader => {
              const isUnavailable = unavailableLoaders.has(loader.key);
              const isDisabled = isUnavailable && loader.key !== "vanilla";
              const isSelected = selectedLoader === loader.key && !isDisabled;
              const isNrcCompatible = nrcCompatibility
                ?.compatibleLoadersByVersion
                .get(selectedMinecraftVersion)
                ?.has(loader.key) ?? false;

              return (
                <button
                  key={loader.key}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative h-[92px] px-3 flex flex-col items-center justify-center gap-2",
                    choiceCardClasses(isSelected, isDisabled),
                  )}
                  style={{ borderRadius: "var(--r-lg)" }}
                  onClick={() => !isDisabled && setSelectedLoader(loader.key)}
                >
                  {isNrcCompatible && !isDisabled && (
                    <span className="absolute top-2 right-2">
                      <Tooltip content={<NrcLoaderCompatibleTooltipContent />}>
                        <Star size={12} strokeWidth={1.75} className="text-fg-3" />
                      </Tooltip>
                    </span>
                  )}
                  <img
                    src={loader.backgroundImage}
                    alt=""
                    className={cn("w-7 h-7 object-contain", isDisabled ? "grayscale" : !isSelected && "opacity-80")}
                    draggable={false}
                  />
                  <span className={cn("text-[13px] font-medium", isSelected ? "text-fg" : "text-fg-2")}>
                    {loader.label}
                  </span>
                  {isDisabled && (
                    <span className="-mt-1.5 text-[11px] text-fg-4">{t('profiles.wizard.notAvailable')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loader version */}
        <div className="min-h-[68px]">
          {selectedLoader === "vanilla" ? (
            <p className="text-[12.5px] text-fg-3">{t('profiles.wizard.noAdditionalVersion')}</p>
          ) : showLoadingIndicator ? (
            <div className="flex items-center gap-2 text-fg-3">
              <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
              <p className="text-[12.5px]">{t('profiles.wizard.loadingVersions')}</p>
            </div>
          ) : loaderVersions.length > 0 ? (
            <div>
              <FieldLabel hint={<span className="cc-num">{loaderVersions.length}</span>}>
                {t('profiles.wizard.loaderVersionLabel')}
              </FieldLabel>
              <Select
                value={selectedLoaderVersion || ""}
                onChange={setSelectedLoaderVersion}
                options={loaderVersions.map(version => ({
                  value: version,
                  label: version
                }))}
                placeholder={t('profiles.wizard.selectLoaderVersion', { loader: modLoaders.find(l => l.key === selectedLoader)?.label })}
                size="md"
                className="w-full"
              />
            </div>
          ) : showNoVersionsFound ? (
            <div className="flex items-center gap-2 text-fg-3">
              <TriangleAlert size={15} strokeWidth={1.75} className="text-warn" />
              <p className="text-[12.5px]">
                {t('profiles.wizard.noLoaderVersions', { loader: selectedLoader, version: selectedMinecraftVersion })}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex justify-between items-center">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={loading || loadingVersions}
        size="sm"
        icon={<ArrowLeft size={15} strokeWidth={1.75} />}
        iconPosition="left"
      >
        {t('profiles.wizard.back')}
      </Button>

      <Button
        variant="default"
        onClick={handleNext}
        disabled={loading || loadingVersions || (selectedLoader !== "vanilla" && !selectedLoaderVersion)}
        size="sm"
        className="min-w-[96px]"
        icon={<ArrowRight size={15} strokeWidth={1.75} />}
        iconPosition="right"
      >
        {t('profiles.wizard.next')}
      </Button>
    </div>
  );

  return (
    <Modal
      title={t('profiles.newProfile')}
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <WizardSteps current={2} />
      <div className="min-h-[460px] px-5 py-5">
        {renderContent()}
      </div>
    </Modal>
  );
} 