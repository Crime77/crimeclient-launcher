"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ExportPackFormat, Profile } from "../../../types/profile"; // Adjust path as needed
import { SearchStyleInput } from "../../ui/Input";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { Tooltip } from "../../ui/Tooltip";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/buttons/Button";
import { CheckCheck, Upload, X } from "lucide-react";
import { SettingsRow, SettingsSection } from "./SettingsRow";
import { FileNodeViewer } from "../../file-explorer/FileNodeViewer"; // Adjust path as needed
import type { FileNode } from "../../../types/fileSystem"; // Adjust path as needed
import * as ProfileService from "../../../services/profile-service"; // Adjust path as needed
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../../store/useThemeStore";
import { listen } from "@tauri-apps/api/event";
import { EventType, type EventPayload } from "../../../types/events";
import { parseErrorMessage } from "../../../utils/error-utils";

const EXPORT_FORMATS: {
  value: ExportPackFormat;
  labelKey: string;
  extension: string;
  image: string;
  disabled?: boolean;
}[] = [
  {
    value: "mrpack",
    labelKey: "export.format_mrpack",
    extension: "mrpack",
    image: "https://cdn.modrinth.com/modrinth-new.png",
  },
  {
    value: "curseforge",
    labelKey: "export.format_curseforge",
    extension: "zip",
    image: "/icons/curseforge.svg",
  },
];

interface ExportSettingsTabProps {
  profile: Profile;
  // Removed onExport, isExporting, onClone, isCloning as they are handled internally or via ProfileService
  // The component will now directly call ProfileService methods
  onClose: () => void; // To close the modal after certain actions like cloning
  // New prop to provide export action and its state to the parent
  onExportActionAvailable?: (action: {
    handleExport: () => Promise<void>;
    isDisabled: () => boolean;
    exportOpenFolder: boolean;
    setExportOpenFolder: (value: boolean) => void;
    isExporting?: boolean;
  }) => void;
  isInModalContext?: boolean; // New prop, defaults to false
}

export function ExportSettingsTab({
  profile,
  onClose,
  onExportActionAvailable,
  isInModalContext = false, // Default to false
}: ExportSettingsTabProps) {
  const { t } = useTranslation();
  const [exportFilename, setExportFilename] = useState(profile.name);
  const [exportFormat, setExportFormat] =
    useState<ExportPackFormat>("mrpack");
  const [selectedExportPaths, setSelectedExportPaths] = useState<Set<string>>(
    new Set()
  );
  // Ref to hold the latest selection, initialized with the initial state
  const selectedExportPathsRef = useRef<Set<string>>(selectedExportPaths);

  const [exportOpenFolder, setExportOpenFolder] = useState(true);

  const [directoryStructure, setDirectoryStructure] = useState<FileNode | null>(
    null
  );
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportMessage, setExportMessage] = useState<string>("");
  const exportToastIdRef = useRef<string | null>(null);

  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled
  );

  const handleFileSelectionChange = (newSelectedPaths: Set<string>) => {
    setSelectedExportPaths(newSelectedPaths);
    selectedExportPathsRef.current = newSelectedPaths;
  };

  useEffect(() => {
    selectedExportPathsRef.current = selectedExportPaths;
  }, [selectedExportPaths]);

  // Listen for export progress events
  useEffect(() => {
    if (!isExporting || !profile.id) return;

    let isMounted = true;
    const unlistenPromise = listen<EventPayload>("state_event", (event) => {
      if (!isMounted) return;
      const payload = event.payload;

      // Only handle events for this profile
      if (payload.target_id === profile.id && payload.event_type === EventType.ExportingProfile) {
        setExportMessage(payload.message);
        
        if (payload.progress !== null) {
          const progressPercent = Math.round(payload.progress * 100);
          setExportProgress(progressPercent);
          
          // Update the existing loading toast with progress
          if (exportToastIdRef.current) {
            toast.loading(
              `${payload.message} (${progressPercent}%)`,
              { id: exportToastIdRef.current }
            );
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unlistenPromise.then((unlisten) => unlisten()).catch(console.error);
    };
  }, [isExporting, profile.id]);

  useEffect(() => {
    const fetchStructure = async () => {
      if (!profile.id) {
        setDirectoryError(t('export.profile_id_missing'));
        setIsLoadingDirectory(false);
        return;
      }
      setIsLoadingDirectory(true);
      setDirectoryError(null);
      try {
        const structure = await ProfileService.getProfileDirectoryStructure(
          profile.id
        );
        console.log(structure);
        setDirectoryStructure(structure);
      } catch (err) {
        console.error("Failed to fetch directory structure:", err);
        const message = parseErrorMessage(err);
        setDirectoryError(t('export.load_structure_failed', { error: message }));
        toast.error(t('export.load_structure_failed', { error: message }));
      } finally {
        setIsLoadingDirectory(false);
      }
    };
    fetchStructure();
  }, [profile.id]);

  const getAllPathsRecursive = (node: FileNode, paths: Set<string>) => {
    paths.add(node.path);
    if (node.is_dir && node.children) {
      for (const child of node.children) {
        getAllPathsRecursive(child, paths);
      }
    }
  };
  const handleSelectAll = () => {
    if (!directoryStructure) return;
    const newSelectedPaths = new Set<string>();
    if (directoryStructure.children) {
      directoryStructure.children.forEach((childNode) =>
        getAllPathsRecursive(childNode, newSelectedPaths)
      );
    }
    setSelectedExportPaths(newSelectedPaths);
    selectedExportPathsRef.current = newSelectedPaths;
  };

  const handleDeselectAll = () => {
    const emptySet = new Set<string>();
    setSelectedExportPaths(emptySet);
    selectedExportPathsRef.current = emptySet;
  };

  const handleExport = async () => {
    if (!exportFilename.trim()) {
      toast.error(t('export.enter_filename'));
      return;
    }

    const currentPathsForExport = selectedExportPathsRef.current;

    // Set exporting state and reset progress
    setIsExporting(true);
    setExportProgress(0);
    setExportMessage(t('export.starting'));

    const exportPromise = ProfileService.exportProfile({
      profile_id: profile.id,
      file_name: exportFilename,
      include_files:
        currentPathsForExport.size > 0 // Use the value from the ref
          ? Array.from(currentPathsForExport) // Use the value from the ref
          : undefined,
      open_folder: exportOpenFolder,
      format: exportFormat,
    });

    // Store the toast ID so we can update it with progress
    const toastId = toast.loading(t('export.exporting_profile', { name: exportFilename }));
    exportToastIdRef.current = toastId;

    try {
      const exportPath = await exportPromise;
      toast.success(t('export.export_success', { path: exportPath }), { id: toastId });
      setIsExporting(false);
      setExportProgress(null);
      setExportMessage("");
      exportToastIdRef.current = null;
    } catch (err) {
      const message = parseErrorMessage(err);
      console.error("Failed to export profile:", err);
      toast.error(t('export.export_failed', { error: message }), { id: toastId });
      setIsExporting(false);
      setExportProgress(null);
      setExportMessage("");
      exportToastIdRef.current = null;
    }
  };

  const contentRef = React.useRef<HTMLDivElement>(null);

  // useEffect to pass the export action and disabled state to the parent IF in modal context
  useEffect(() => {
    if (isInModalContext && onExportActionAvailable) {
      onExportActionAvailable({
        handleExport,
        isDisabled: () =>
          isExporting || !exportFilename.trim() || isLoadingDirectory,
        exportOpenFolder,
        setExportOpenFolder,
        isExporting,
      });
    }
  }, [
    isInModalContext,
    onExportActionAvailable,
    isExporting,
    exportFilename,
    exportFormat,
    isLoadingDirectory,
    exportOpenFolder,
    setExportOpenFolder,
  ]);

  const formatExtension =
    EXPORT_FORMATS.find((format) => format.value === exportFormat)?.extension ??
    exportFormat;

  const progressBlock = isExporting && exportProgress !== null && (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center gap-3 text-[12px]">
        <span className="text-fg-2 truncate min-w-0">{exportMessage}</span>
        <span className="cc-num text-fg flex-shrink-0">{exportProgress}%</span>
      </div>
      <div
        className="w-full h-1 bg-s3 overflow-hidden"
        style={{ borderRadius: "var(--r-sm)" }}
      >
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${exportProgress}%` }}
        />
      </div>
    </div>
  );

  return (
    <div ref={contentRef} className="space-y-8 min-w-0">
      <SettingsSection
        title={!isInModalContext ? t('export.title') : undefined}
        description={!isInModalContext ? t('export.description') : undefined}
      >
        {/* Filename and format */}
        <SettingsRow
          label={t('export.filename_label')}
          htmlFor="exportFilename"
          stacked
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <SearchStyleInput
                id="exportFilename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder={t('placeholders.enter_filename')}
                disabled={isExporting}
                className="font-mono text-[12px]"
              />
            </div>
            <div
              role="radiogroup"
              className="flex flex-shrink-0 gap-0.5 p-0.5 bg-s2 border border-line"
              style={{ borderRadius: "var(--r-md)" }}
            >
              {EXPORT_FORMATS.map((format) => {
                const isSelected = exportFormat === format.value;
                const isLocked = format.disabled === true;
                const label = isLocked
                  ? t('export.format_coming_soon', {
                      format: t(format.labelKey),
                    })
                  : t(format.labelKey);

                const isBlocked = isLocked || isExporting;

                return (
                  <Tooltip key={format.value} content={label} position="top">
                    <button
                      type="button"
                      role="radio"
                      aria-label={label}
                      aria-checked={isSelected}
                      aria-disabled={isBlocked}
                      onClick={() => {
                        if (isBlocked) return;
                        setExportFormat(format.value as ExportPackFormat);
                      }}
                      className={cn(
                        "h-8 px-2.5 flex items-center gap-2 border transition-colors duration-fast",
                        isSelected
                          ? "bg-s3 border-line-3 text-fg"
                          : "border-transparent text-fg-3",
                        isLocked
                          ? "opacity-40 grayscale cursor-not-allowed"
                          : isExporting
                            ? "opacity-50 cursor-not-allowed"
                            : !isSelected && "cursor-pointer hover:text-fg-2 hover:bg-s3/60",
                      )}
                      style={{ borderRadius: "var(--r-sm)" }}
                    >
                      <img
                        src={format.image}
                        alt=""
                        className={cn(
                          "w-4 h-4 object-contain",
                          !isSelected && !isLocked && "opacity-60",
                        )}
                      />
                      <span className="cc-num text-[11px]">.{format.extension}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <p className="mt-2 cc-num text-[11px] text-fg-3 truncate">
            {t('export.saved_as', {
              filename: `${exportFilename.trim() || profile.name}.${formatExtension}`,
            })}
          </p>
        </SettingsRow>

        {!isInModalContext && (
          <SettingsRow label={t('export.open_folder_after')}>
            <ToggleSwitch
              checked={exportOpenFolder}
              onChange={(checked) => setExportOpenFolder(checked)}
              disabled={isExporting}
              size="sm"
            />
          </SettingsRow>
        )}
      </SettingsSection>

      {/* File selection section */}
      <SettingsSection
        title={t('export.select_files_title')}
        description={t('export.select_files_description')}
        aside={
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleSelectAll}
              disabled={
                isLoadingDirectory ||
                !directoryStructure ||
                !directoryStructure.children ||
                directoryStructure.children.length === 0
              }
              icon={<CheckCheck size={14} strokeWidth={1.75} />}
            >
              {t('common.select_all')}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleDeselectAll}
              disabled={isLoadingDirectory || selectedExportPaths.size === 0}
              icon={<X size={14} strokeWidth={1.75} />}
            >
              {t('export.deselect_all')}
            </Button>
          </>
        }
        flush
      >
        <div
          className="p-2 bg-s1 border border-line max-h-64 min-h-64 overflow-y-auto custom-scrollbar"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <FileNodeViewer
            rootNode={directoryStructure}
            loading={isLoadingDirectory}
            error={directoryError}
            selectedFiles={selectedExportPaths}
            onSelectionChange={handleFileSelectionChange}
            checkboxesEnabled={true}
            hideRootNode={true}
            preSelectPaths={[
              "resourcepacks",
              "shaderpacks",
              "options.txt",
              "NoRiskClientLauncher",
              "config",
              "custom_mods",
              "mods",
            ]}
            selectChildrenWithParent={true}
            defaultRootCollapsed={false}
            className="text-[12px]"
          />
        </div>
      </SettingsSection>

      {/* Progress indicator during export (shown in both contexts) */}
      {progressBlock}

      {!isInModalContext && ( // Internal controls only if NOT in modal context
        <div className="flex justify-end pt-4 border-t border-line">
          <Button
            variant="default"
            onClick={handleExport}
            disabled={
              isExporting || !exportFilename.trim() || isLoadingDirectory
            }
            icon={<Upload size={15} strokeWidth={1.75} />}
            size="md"
          >
            {isExporting ? t('export.exporting') : t('export.export_profile')}
          </Button>
        </div>
      )}
    </div>
  );
}
