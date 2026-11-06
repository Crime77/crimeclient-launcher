"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FlaskConical, FolderOpen, Loader2 } from "lucide-react";
import type { Profile } from "../../../types/profile";
import { Button } from "../../ui/buttons/Button";
import { useThemeStore } from "../../../store/useThemeStore";
import { RangeSlider } from "../../ui/RangeSlider";
import { Input, SearchStyleTextArea } from "../../ui/Input";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { gsap } from "gsap";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "react-hot-toast";
import { cn } from "../../../lib/utils";
import { getGlobalMemorySettings, setGlobalMemorySettings, getGlobalCustomJvmArgs, setGlobalCustomJvmArgs } from "../../../services/launcher-config-service";
import type { MemorySettings } from "../../../types/launcherConfig";
import { useTranslation } from "react-i18next";
import { parseErrorMessage } from "../../../utils/error-utils";

interface JavaSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  systemRam: number;
  recommendedRam: number;
  tempRamMb: number;
  setTempRamMb: (value: number) => void;
}

// New type for Java Installation
interface JavaInstallation {
  path: string;
  major_version: number;
  vendor: string;
  architecture: string;
  is_default?: boolean; // Optional: if your backend provides this
}

export function JavaSettingsTab({
  editedProfile,
  updateProfile,
  systemRam,
  recommendedRam,
  tempRamMb,
  setTempRamMb,
}: JavaSettingsTabProps) {
  const { t } = useTranslation();
  const [useCustomJava, setUseCustomJava] = useState(
    editedProfile.settings?.use_custom_java_path ?? false,
  );
  const [useCustomArgs, setUseCustomArgs] = useState(
    (editedProfile.settings?.custom_jvm_args?.length || 0) > 0,
  );
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);
  const javaInstallRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  const argsRef = useRef<HTMLDivElement>(null);

  // New state variables for Java detection and validation
  const [detectedJavaInstallations, setDetectedJavaInstallations] = useState<
    JavaInstallation[]
  >([]);
  const [isDetectingJava, setIsDetectingJava] = useState(false);
  const [javaDetectionError, setJavaDetectionError] = useState<string | null>(
    null,
  );
  const [customJavaPathInput, setCustomJavaPathInput] = useState(
    editedProfile.settings?.java_path || "",
  );
  const [isValidatingJavaPath, setIsValidatingJavaPath] = useState(false);
  const [validationResult, setValidationResult] = useState<
    "valid" | "invalid" | "error" | null
  >(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  
  // Global memory settings for standard profiles
  const [globalMemorySettings, setGlobalMemorySettingsState] = useState<MemorySettings | null>(null);
  const [isLoadingGlobalMemory, setIsLoadingGlobalMemory] = useState(false);
  const [isSystemRamLoaded, setIsSystemRamLoaded] = useState(false);

  // Global JVM args for standard profiles
  const [globalJvmArgs, setGlobalJvmArgsState] = useState<string | null>(null);
  const [isLoadingGlobalJvmArgs, setIsLoadingGlobalJvmArgs] = useState(false);
  

  useEffect(() => {
    if (isBackgroundAnimationEnabled) {
      if (tabRef.current) {
        gsap.fromTo(
          tabRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
        );
      }

      const elements = [
        javaInstallRef.current,
        memoryRef.current,
        argsRef.current,
      ].filter(Boolean);

      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.2,
          },
        );
      }
    }
  }, [isBackgroundAnimationEnabled]);

  const detectJavaInstallations = async () => {
    setIsDetectingJava(true);
    setJavaDetectionError(null);
    setValidationResult(null);
    setValidationMessage(null);
    try {
      const installations: JavaInstallation[] = await invoke(
        "detect_java_installations_command",
      );
      setDetectedJavaInstallations(installations);
      if (installations.length === 0) {
        toast(
          t('java.no_installations_found'),
        );
      } else if (!customJavaPathInput) {
        const currentProfileJavaPath = editedProfile.settings?.java_path;
        const preselected = currentProfileJavaPath
          ? installations.find((inst) => inst.path === currentProfileJavaPath)
          : installations.find((inst) => inst.is_default) || installations[0];
        if (preselected) {
          setCustomJavaPathInput(preselected.path);
          // await testCustomJavaPath(preselected.path); // Optionally auto-test
        }
      }
    } catch (error) {
      console.error("Error detecting Java installations:", error);
      const errorMessage =
        parseErrorMessage(error);
      setJavaDetectionError(errorMessage); // Store for internal reference if needed
      toast.error(t('java.detect_failed', { error: errorMessage }));
      setDetectedJavaInstallations([]);
    } finally {
      setIsDetectingJava(false);
    }
  };

  useEffect(() => {
    detectJavaInstallations();
  }, []);

  // Track when systemRam changes from initial value
  useEffect(() => {
    if (systemRam !== 8192) {
      setIsSystemRamLoaded(true);
    }
  }, [systemRam]);

  // Load global memory settings for standard profiles
  useEffect(() => {
    if (editedProfile.is_standard_version) {
      setIsLoadingGlobalMemory(true);
      getGlobalMemorySettings()
        .then((settings) => {
          setGlobalMemorySettingsState(settings);
          // Synchronize tempRamMb with global settings for standard profiles
          setTempRamMb(settings.max);
        })
        .catch((error) => {
          console.error("Failed to load global memory settings:", error);
          toast.error(t('java.load_memory_failed'));
        })
        .finally(() => {
          setIsLoadingGlobalMemory(false);
        });
    } else {
      // For custom profiles, we're not loading anything
      setIsLoadingGlobalMemory(false);
    }
  }, [editedProfile.is_standard_version, setTempRamMb]);

  // Load global JVM args for standard profiles
  useEffect(() => {
    if (editedProfile.is_standard_version) {
      setIsLoadingGlobalJvmArgs(true);
      getGlobalCustomJvmArgs()
        .then((args) => {
          setGlobalJvmArgsState(args);
          // Initialize useCustomArgs based on whether global args exist
          setUseCustomArgs((args?.length || 0) > 0);
        })
        .catch((error) => {
          console.error("Failed to load global JVM args:", error);
          toast.error(t('java.load_jvm_failed'));
        })
        .finally(() => {
          setIsLoadingGlobalJvmArgs(false);
        });
    } else {
      setIsLoadingGlobalJvmArgs(false);
    }
  }, [editedProfile.is_standard_version]);

  const browseForJavaPath = async () => {
    try {
      const selected = await open({
        title: t('settings.java.select_java_executable'),
        directory: false,
        multiple: false,
      });
      if (typeof selected === "string" && selected) {
        setCustomJavaPathInput(selected);
        await testCustomJavaPath(selected);
      }
    } catch (error) {
      console.error("Error browsing for Java path:", error);
      const errorMessage = String(
        error instanceof Error ? error.message : error,
      );
      toast.error(t('java.browse_error', { error: errorMessage }));
    }
  };

  const testCustomJavaPath = async (path_to_test?: string) => {
    const currentPath = path_to_test || customJavaPathInput;
    if (!currentPath) {
      toast.error(t('java.select_path_to_test'));
      return;
    }
    setIsValidatingJavaPath(true);
    setValidationResult(null);
    setValidationMessage(null);
    try {
      const isValid: boolean = await invoke("validate_java_path_command", {
        path: currentPath,
      });
      if (isValid) {
        setValidationResult("valid");
        toast.success(t('java.path_valid'));
        updateProfile({
          settings: {
            ...editedProfile.settings,
            java_path: currentPath,
            use_custom_java_path: true,
          },
        });
      } else {
        setValidationResult("invalid");
        toast.error(t('java.path_invalid'));
      }
    } catch (error: any) {
      console.error(`Error validating Java path ${currentPath}:`, error);
      setValidationResult("error");
      const message = error?.message?.includes("Java path does not exist")
        ? t('java.path_not_exist')
        : error?.message || parseErrorMessage(error);
      toast.error(t('java.validation_error', { error: message }));
    } finally {
      setIsValidatingJavaPath(false);
    }
  };

  const recommendedMaxRam = Math.min(recommendedRam, systemRam);
  
  // Use global memory settings for standard profiles, profile settings for custom profiles
  const memory = editedProfile.is_standard_version
    ? (globalMemorySettings || { min: 1024, max: recommendedMaxRam })
    : (editedProfile.settings?.memory || { min: 1024, max: recommendedMaxRam });

  const handleMemoryChange = async (value: number) => {
    if (editedProfile.is_standard_version) {
      // For standard profiles, save to global settings
      const newGlobalSettings: MemorySettings = {
        min: memory.min,
        max: value,
      };
      
      try {
        await setGlobalMemorySettings(newGlobalSettings);
        setGlobalMemorySettingsState(newGlobalSettings);
      } catch (error) {
        console.error("Failed to save global memory settings:", error);
        toast.error(t('java.save_ram_failed'));
      }
    } else {
      // For custom profiles, save to profile settings
      const newSettings = { ...editedProfile.settings };
      if (!newSettings.memory) {
        newSettings.memory = {
          min: 1024,
          max: value,
        };
      } else {
        newSettings.memory.max = value;
      }
      updateProfile({ settings: newSettings });
    }
  };

  const handleJavaPathInputChange = (newPath: string) => {
    setCustomJavaPathInput(newPath);
    setValidationResult(null);
  };

  const handleDetectedJavaListItemClick = (installation: JavaInstallation) => {
    setCustomJavaPathInput(installation.path);
    testCustomJavaPath(installation.path); // Auto-test selected detected path
  };

  const handleJavaArgsChange = async (args: string) => {
    if (editedProfile.is_standard_version) {
      // For standard profiles, save to global settings
      try {
        await setGlobalCustomJvmArgs(args || null);
        setGlobalJvmArgsState(args || null);
      } catch (error) {
        console.error("Failed to save global JVM args:", error);
        toast.error(t('java.save_jvm_failed'));
      }
    } else {
      // For custom profiles, save to profile settings
      const newSettings = { ...editedProfile.settings };
      newSettings.custom_jvm_args = args;
      updateProfile({ settings: newSettings });
    }
  };

  const handleCustomJavaToggle = (checked: boolean) => {
    setUseCustomJava(checked);
    if (checked) {
      if (!customJavaPathInput && detectedJavaInstallations.length > 0) {
        const defaultOrFirst =
          detectedJavaInstallations.find((j) => j.is_default) ||
          detectedJavaInstallations[0];
        if (defaultOrFirst) setCustomJavaPathInput(defaultOrFirst.path);
      }
      updateProfile({
        settings: { ...editedProfile.settings, use_custom_java_path: true },
      });
    } else {
      updateProfile({
        settings: { ...editedProfile.settings, use_custom_java_path: false },
      });
      setValidationResult(null);
    }
  };

  const handleCustomArgsToggle = async (checked: boolean) => {
    setUseCustomArgs(checked);

    const defaultArgs = [
      "-XX:+UseG1GC",
      "-XX:+ParallelRefProcEnabled",
      "-XX:MaxGCPauseMillis=200",
    ].join(" ");

    if (editedProfile.is_standard_version) {
      // For standard profiles, save to global settings
      try {
        if (checked) {
          const argsToSet = globalJvmArgs || defaultArgs;
          await setGlobalCustomJvmArgs(argsToSet);
          setGlobalJvmArgsState(argsToSet);
        } else {
          await setGlobalCustomJvmArgs(null);
          setGlobalJvmArgsState(null);
        }
      } catch (error) {
        console.error("Failed to save global JVM args:", error);
        toast.error(t('java.save_jvm_failed'));
      }
    } else {
      // For custom profiles, save to profile settings
      const newSettings = { ...editedProfile.settings };
      if (checked) {
        if (!newSettings.custom_jvm_args) {
          newSettings.custom_jvm_args = defaultArgs;
        }
      } else {
        newSettings.custom_jvm_args = null;
      }
      updateProfile({ settings: newSettings });
    }

    if (checked && isBackgroundAnimationEnabled) {
      const textareaContainer = argsRef.current?.querySelector(
        ".custom-args-textarea",
      );
      if (textareaContainer) {
        gsap.fromTo(
          textareaContainer,
          { opacity: 0, height: 0 },
          {
            opacity: 1,
            height: "auto",
            duration: 0.3,
            ease: "power2.out",
          },
        );
      }
    }
  };


  const memoryLoading =
    (editedProfile.is_standard_version && (isLoadingGlobalMemory || !globalMemorySettings)) || !isSystemRamLoaded;

  return (
    <div ref={tabRef} className="space-y-8 select-none">
      <div ref={memoryRef}>
        <SettingsSection title={t('profiles.settings.memory')}>
          <SettingsRow
            stacked
            label={editedProfile.is_standard_version ? t('profiles.settings.globalMemoryAllocated') : t('profiles.settings.memoryAllocated')}
            description={
              memoryLoading ? undefined : (
                <>
                  {t('profiles.settings.recommended')}:{" "}
                  <span className="cc-num text-fg-2">
                    {recommendedMaxRam} MB ({(recommendedMaxRam / 1024).toFixed(1)} GB)
                  </span>
                  {editedProfile.is_standard_version && (
                    <span className="block">{t('profiles.settings.appliesToAllStandard')}</span>
                  )}
                </>
              )
            }
          >
            {memoryLoading ? (
              <div className="flex items-center gap-2 h-12 text-[12px] text-fg-3">
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                {t('profiles.settings.loadingSettings')}
              </div>
            ) : (
              <RangeSlider
                value={tempRamMb}
                onChange={(value) => {
                  setTempRamMb(value);
                  // For standard profiles, save to global settings immediately
                  if (editedProfile.is_standard_version) {
                    handleMemoryChange(value);
                  }
                }}
                min={512}
                max={systemRam}
                step={512}
                valueLabel={`${tempRamMb} MB (${(tempRamMb / 1024).toFixed(1)} GB)`}
                minLabel="512 MB"
                maxLabel={`${systemRam} MB`}
                variant="flat"
                recommendedRange={[4096, 8192]}
                unit="MB"
              />
            )}
          </SettingsRow>
        </SettingsSection>
      </div>

      <div ref={javaInstallRef}>
        <SettingsSection title={t('profiles.settings.java')}>
          <SettingsRow
            label={t('profiles.settings.customJavaInstallation')}
            description={useCustomJava ? undefined : t('profiles.settings.defaultJavaDescription')}
          >
            <ToggleSwitch checked={useCustomJava} onChange={(checked) => handleCustomJavaToggle(checked)} />
          </SettingsRow>

          {useCustomJava && (
            <SettingsRow stacked label={t('profiles.settings.manualJavaPath')} htmlFor="custom-java-path-input">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Input
                    id="custom-java-path-input"
                    value={customJavaPathInput}
                    onChange={(e) => handleJavaPathInputChange(e.target.value)}
                    placeholder={t('placeholders.java_path')}
                    className="font-mono text-[12px]"
                    variant="flat"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={browseForJavaPath}
                  icon={<FolderOpen size={15} strokeWidth={1.75} />}
                  aria-label={t('profiles.settings.browse_java')}
                >
                  {t('profiles.settings.browse')}
                </Button>
              </div>

              {isDetectingJava && (
                <div className="flex items-center gap-2 mt-3 text-[12px] text-fg-3">
                  <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                  {t('profiles.settings.detectingJava')}
                </div>
              )}

              {detectedJavaInstallations.length > 0 && !isDetectingJava && (
                <div className="mt-4">
                  <div className="cc-eyebrow mb-1.5">{t('profiles.settings.detectedJavaInstallations')}</div>
                  <div
                    className="max-h-44 overflow-y-auto custom-scrollbar border border-line divide-y divide-line bg-s1"
                    style={{ borderRadius: "var(--r-md)" }}
                  >
                    {detectedJavaInstallations.map((java) => {
                      const isSelected = customJavaPathInput === java.path;
                      return (
                        <button
                          key={java.path}
                          type="button"
                          onClick={() => handleDetectedJavaListItemClick(java)}
                          title={java.path}
                          aria-pressed={isSelected}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 h-11 text-left transition-colors duration-fast",
                            isSelected ? "bg-s3" : "hover:bg-s2",
                          )}
                        >
                          <span
                            className={cn(
                              "cc-num text-[11px] w-9 flex-shrink-0 text-center py-0.5 border",
                              isSelected ? "border-line-3 text-fg" : "border-line-2 text-fg-2",
                            )}
                            style={{ borderRadius: "var(--r-sm)" }}
                          >
                            {java.major_version}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block cc-num text-[12px] truncate", isSelected ? "text-fg" : "text-fg-2")}>
                              {java.path}
                            </span>
                            <span className="block text-[11px] text-fg-3 truncate">
                              {java.vendor} · <span className="cc-num">{java.architecture}</span>
                            </span>
                          </span>
                          {isSelected && <Check size={14} strokeWidth={2} className="text-fg-2 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="default"
                  size="md"
                  onClick={() => testCustomJavaPath()}
                  disabled={isValidatingJavaPath || !customJavaPathInput}
                  icon={
                    isValidatingJavaPath ? (
                      <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                    ) : (
                      <FlaskConical size={15} strokeWidth={1.75} />
                    )
                  }
                >
                  {isValidatingJavaPath ? t('profiles.settings.testing') : t('profiles.settings.testAndUsePath')}
                </Button>
              </div>
            </SettingsRow>
          )}
        </SettingsSection>
      </div>

      <div ref={argsRef}>
        <SettingsSection>
          <SettingsRow
            label={editedProfile.is_standard_version ? t('profiles.settings.globalCustomJavaArgs') : t('profiles.settings.customJavaArgs')}
            description={
              <>
                {t('profiles.settings.javaArgsHint')}
                {editedProfile.is_standard_version && (
                  <span className="block">{t('profiles.settings.appliesToAllStandard')}</span>
                )}
              </>
            }
          >
            <ToggleSwitch
              checked={useCustomArgs}
              onChange={(checked) => handleCustomArgsToggle(checked)}
              disabled={editedProfile.is_standard_version && isLoadingGlobalJvmArgs}
            />
          </SettingsRow>

          {useCustomArgs && (
            <div className="custom-args-textarea py-3.5">
              {editedProfile.is_standard_version && isLoadingGlobalJvmArgs ? (
                <div className="flex items-center gap-2 h-12 text-[12px] text-fg-3">
                  <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                  {t('profiles.settings.loadingSettings')}
                </div>
              ) : (
                <SearchStyleTextArea
                  value={editedProfile.is_standard_version
                    ? (globalJvmArgs || "")
                    : (editedProfile.settings?.custom_jvm_args || "")}
                  onChange={(e) => handleJavaArgsChange(e.target.value)}
                  placeholder={t('profiles.settings.enterJavaArgs')}
                  className="font-mono text-[12px]"
                  minHeight="88px"
                />
              )}
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}
