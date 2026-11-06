import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { ExternalLink, FolderOpen, Loader2, Play, Settings2, Square, User } from "lucide-react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen, emitTo, type UnlistenFn } from "@tauri-apps/api/event";
import { useProcessStore, getProcessStatus, ProcessMetrics } from "../../store/useProcessStore";
import { useLaunchStateStore, LaunchState } from "../../store/launch-state-store";
import { ProcessMetadata, ProcessState } from "../../types/processState";
import { EventType } from "../../types/events";
import * as ProcessService from "../../services/process-service";
import { usePlayerAvatar } from "../../hooks/usePlayerAvatar";
import { requireMinecraftAccount } from "../../lib/require-account";
import { handleIconImgLoad } from "../profiles/IconPicker";
import { Button } from "../ui/buttons/Button";
import { cn } from "../../lib/utils";

type InstanceStatus = "running" | "idle" | "crashed" | "starting" | "stopping";

interface InstanceData {
  id: string;
  profileId: string;
  name: string;
  version: string;
  loader: string;
  loaderVersion?: string;
  status: InstanceStatus;
  modCount: number;
  startTime: number;
  endTime?: number; // For stopped instances - when the process ended
  memoryUsage: number;
  memoryMax: number;
  cpuUsage: number;
  profileImageUrl?: string;
  accountUuid?: string;
  accountName?: string;
}

// Format memory
const formatMemory = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)}GB`;
  }
  return `${Math.round(mb)}MB`;
};

// Convert file path to asset URL if needed
const toAssetUrl = (pathOrUrl: string | undefined): string | undefined => {
  if (!pathOrUrl) return undefined;
  // URLs and data URIs don't need conversion
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") ||
      pathOrUrl.startsWith("data:") || pathOrUrl.startsWith("asset://")) {
    return pathOrUrl;
  }
  // File paths need to be converted
  return convertFileSrc(pathOrUrl);
};

// Format elapsed time
const formatElapsedTime = (startTime: number, currentTime: number): string => {
  const elapsed = Math.floor((currentTime - startTime) / 1000);
  if (elapsed < 0) return "0:00";

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Convert ProcessMetadata to InstanceData
function processToInstance(process: ProcessMetadata, metrics?: ProcessMetrics, endTime?: number): InstanceData {
  const startTimeMs = new Date(process.start_time).getTime();
  // Convert memory_max_mb (MB) to bytes for consistency with memoryUsage
  const memoryMaxBytes = (process.memory_max_mb || 4096) * 1024 * 1024;

  return {
    id: process.id,
    profileId: process.profile_id,
    name: process.profile_name || "Unknown Profile",
    version: process.minecraft_version || "Unknown",
    loader: process.modloader?.toLowerCase() || "vanilla",
    loaderVersion: process.modloader_version || undefined,
    status: getProcessStatus(process.state),
    modCount: 0, // Will be fetched from profile if needed
    startTime: startTimeMs,
    endTime: endTime,
    memoryUsage: metrics?.memoryBytes || 0,
    memoryMax: memoryMaxBytes,
    cpuUsage: metrics?.cpuPercent || 0,
    profileImageUrl: process.profile_image_url || undefined,
    accountUuid: process.account_uuid || undefined,
    accountName: process.account_name || undefined,
  };
}

import { loaderIconSrc } from "../../lib/loader-icons";
const getLoaderIcon = loaderIconSrc;

// muted state colours (tokens), dots only
const STATUS_DOT: Record<InstanceStatus, string> = {
  running: "bg-ok",
  starting: "bg-warn",
  stopping: "bg-warn",
  crashed: "bg-err",
  idle: "bg-fg-4",
};

/** Thin neutral meter for RAM/CPU; turns warn/err only when it is high. */
function Meter({ label, value, ratio, tone }: { label: string; value: string; ratio: number; tone: "normal" | "warn" | "err" }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-fg-3">{label}</span>
        <span className={cn("truncate font-mono", tone === "err" ? "text-err" : tone === "warn" ? "text-warn" : "text-fg-2")}>
          {value}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-full bg-s3">
        <div
          className={cn(
            "h-full transition-[width] duration-slow",
            tone === "err" ? "bg-err" : tone === "warn" ? "bg-warn" : "bg-fg-3",
          )}
          style={{ width: `${Math.max(0, Math.min(ratio, 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Instance Item Component - allows using hooks for each instance
interface InstanceItemProps {
  instance: InstanceData;
  isSelected: boolean;
  isHovered: boolean;
  currentTime: number;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onOpenProfile: () => void;
}

function InstanceItem({
  instance,
  isSelected,
  isHovered,
  currentTime,
  onSelect,
  onHover,
  onOpenProfile,
}: InstanceItemProps) {
  const { t } = useTranslation();

  // Get avatar for the account
  const avatarUrl = usePlayerAvatar({
    uuid: instance.accountUuid,
    size: 16,
    overlay: true,
  });

  return (
    <div
      className={cn(
        "group relative flex h-12 cursor-pointer items-center gap-2.5 pl-3 pr-2 transition-colors duration-fast",
        isSelected ? "bg-s3" : "hover:bg-s2",
      )}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Profile Icon */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden border border-line bg-s2"
        style={{ borderRadius: "var(--r-sm)" }}
      >
        {instance.profileImageUrl ? (
          <img
            src={toAssetUrl(instance.profileImageUrl)}
            alt={instance.name}
            className="h-full w-full object-cover"
            onLoad={handleIconImgLoad}
          />
        ) : (
          <Icon icon="mdi:minecraft" className="h-4 w-4 text-fg-3" />
        )}
      </div>

      {/* Instance Info */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-[520] leading-[18px] text-fg" title={instance.name}>
          {instance.name}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-fg-3">
          {instance.accountName && (
            <>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-3 w-3 flex-shrink-0"
                  style={{ imageRendering: "pixelated", borderRadius: 2 }}
                />
              ) : (
                <User size={11} strokeWidth={1.75} className="flex-shrink-0" />
              )}
              <span className="truncate">{instance.accountName}</span>
              <span className="text-fg-4">·</span>
            </>
          )}
          <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", STATUS_DOT[instance.status])} />
          {instance.status === "crashed" && <span className="text-err">{t("instances.crashed")}</span>}
          <span className="font-mono">{formatElapsedTime(instance.startTime, instance.endTime || currentTime)}</span>
        </div>
      </div>

      {/* Settings - appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenProfile();
        }}
        className={cn(
          "cc-icon-btn h-6 w-6 flex-shrink-0 transition-opacity duration-fast",
          isHovered || isSelected ? "opacity-100" : "opacity-0",
        )}
        title={t('logs.open_profile')}
      >
        <Settings2 size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

interface InstanceSidebarProps {
  selectedInstanceId?: string;
  onSelectInstance?: (id: string) => void;
}

export function InstanceSidebar({
  selectedInstanceId,
  onSelectInstance,
}: InstanceSidebarProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  // Track processes user has requested to stop - show START immediately
  const [stoppingProcessIds, setStoppingProcessIds] = useState<Set<string>>(new Set());

  const processes = useProcessStore((state) => state.processes);
  const stoppedProcesses = useProcessStore((state) => state.stoppedProcesses);
  const processEndTimes = useProcessStore((state) => state.processEndTimes);
  const metrics = useProcessStore((state) => state.metrics);
  const fetchProcesses = useProcessStore((state) => state.fetchProcesses);
  const stopProcess = useProcessStore((state) => state.stopProcess);
  const isLoading = useProcessStore((state) => state.isLoading);

  const launchStates = useLaunchStateStore((s) => s.profiles);
  const getProfileState = useLaunchStateStore((s) => s.getProfileState);
  const initiateButtonLaunch = useLaunchStateStore((s) => s.initiateButtonLaunch);
  const finalizeButtonLaunch = useLaunchStateStore((s) => s.finalizeButtonLaunch);

  // Get launcher log functions
  const addLauncherLog = useProcessStore((state) => state.addLauncherLog);
  const clearLauncherLogs = useProcessStore((state) => state.clearLauncherLogs);
  const clearLogs = useProcessStore((state) => state.clearLogs);

  // Fetch processes on mount
  useEffect(() => {
    fetchProcesses();

    // Refresh processes periodically
    const interval = setInterval(() => {
      fetchProcesses();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchProcesses]);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for launch status events to update button UI (launcher logs are handled in useProcessEvents)
  const eventListenerRef = useRef<UnlistenFn | null>(null);
  useEffect(() => {
    let isSubscribed = true;

    const setupListener = async () => {
      eventListenerRef.current = await listen<{
        event_type: string;
        target_id: string | null;
        message: string;
      }>("state_event", (event) => {
        if (!isSubscribed) return;

        const payload = event.payload;
        const profileId = payload.target_id;

        if (!profileId) return;

        // Handle launch status events for button UI only
        if (payload.event_type === EventType.LaunchSuccessful) {
          finalizeButtonLaunch(profileId);
        } else if (payload.event_type === EventType.Error) {
          finalizeButtonLaunch(profileId, payload.message || "Error");
        }
      });
    };

    setupListener();

    return () => {
      isSubscribed = false;
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }
    };
  }, [finalizeButtonLaunch]);

  // Convert processes to instance data (merge running + stopped)
  const instances = useMemo(() => {
    // Running processes from backend
    const runningInstances = processes
      .filter((p) => {
        const status = getProcessStatus(p.state);
        return status === "running" || status === "starting" || status === "stopping";
      })
      .map((p) => processToInstance(p, metrics.get(p.id)));

    // Stopped processes (frontend-only retention) - include endTime for timer
    const stoppedInstances = Array.from(stoppedProcesses.values())
      .filter((p) => !processes.find((running) => running.id === p.id)) // Don't duplicate
      .map((p) => processToInstance(p, undefined, processEndTimes.get(p.id)));

    // Merge and sort by profileId to keep stable position
    return [...runningInstances, ...stoppedInstances].sort((a, b) =>
      a.profileId.localeCompare(b.profileId)
    );
  }, [processes, stoppedProcesses, processEndTimes, metrics]);

  // Clean up stoppingProcessIds when process is no longer running
  useEffect(() => {
    if (stoppingProcessIds.size > 0) {
      const runningIds = new Set(processes.map(p => p.id));
      const stillStopping = new Set(
        [...stoppingProcessIds].filter(id => runningIds.has(id))
      );
      if (stillStopping.size !== stoppingProcessIds.size) {
        setStoppingProcessIds(stillStopping);
      }
    }
  }, [processes, stoppingProcessIds]);

  // Auto-select first instance if none selected
  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      onSelectInstance?.(instances[0].id);
    }
  }, [instances, selectedInstanceId, onSelectInstance]);

  // Get selected instance
  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);

  const handleStopProcess = (processId: string) => {
    // Mark as stopping immediately - UI will show START button right away
    setStoppingProcessIds(prev => new Set(prev).add(processId));

    // Fire and forget - don't wait for process to stop
    stopProcess(processId).catch((error) => {
      console.error("Failed to stop process:", error);
    });
  };

  const handleOpenFolder = async (profileId: string) => {
    try {
      await invoke("open_profile_folder", { profileId });
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

  const handleLaunchProfile = async (profileId: string) => {
    // Check if already launching
    const profileState = getProfileState(profileId);
    if (profileState.isButtonLaunching) {
      return;
    }

    // No account means the backend would reject this with NoCredentialsError —
    // prompt for sign-in instead and resume once it is done.
    const signedIn = requireMinecraftAccount({
      profileName: instances.find((i) => i.profileId === profileId)?.name,
      onAuthenticated: () => handleLaunchProfile(profileId),
    });
    if (!signedIn) return;

    // Note: We allow multiple instances of the same profile to run simultaneously
    // Each will have its own process ID and can be stopped independently

    // Clear old logs before starting new launch
    clearLauncherLogs(profileId);
    // Also clear old MC logs from stopped processes with same profile
    for (const [processId, stoppedProcess] of stoppedProcesses) {
      if (stoppedProcess.profile_id === profileId) {
        clearLogs(processId);
      }
    }

    // Start launch with visual feedback
    initiateButtonLaunch(profileId);

    try {
      await ProcessService.launch(profileId);
      // Launch initiated successfully - status updates will come from events
    } catch (error) {
      console.error("Failed to launch profile:", error);
      const errorMsg = typeof error === "string" ? error : (error as Error).message || "Launch failed";
      finalizeButtonLaunch(profileId, errorMsg);
    }
  };


  const runningCount = instances.filter((i) => i.status === "running").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-line px-3">
        <span className="cc-eyebrow">{t('instances.title')}</span>
        {instances.length > 0 && (
          <span className="font-mono text-[11px] text-fg-3">{instances.length}</span>
        )}
      </div>

      {/* Instance List */}
      <div className="custom-scrollbar flex-1 overflow-y-auto py-1">
        {isLoading && instances.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-fg-3">
            <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
            {t('instances.loading')}
          </div>
        ) : instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-8 text-center">
            <p className="text-[13px] text-fg-2">{t('instances.no_active')}</p>
            <p className="text-xs text-fg-3">{t('instances.launch_to_start')}</p>
          </div>
        ) : (
          instances.map((instance) => (
            <InstanceItem
              key={instance.id}
              instance={instance}
              isSelected={selectedInstanceId === instance.id}
              isHovered={hoveredId === instance.id}
              currentTime={currentTime}
              onSelect={() => onSelectInstance?.(instance.id)}
              onHover={(hovered) => setHoveredId(hovered ? instance.id : null)}
              onOpenProfile={async () => {
                try {
                  // Emit event to main window for navigation
                  await emitTo("main", "navigate-to-profile", { profileId: instance.profileId });
                  // Focus the main window
                  await invoke("focus_main_window");
                } catch (error) {
                  console.error("Failed to open profile in main window:", error);
                }
              }}
            />
          ))
        )}
      </div>

      {/* Actions Footer - for selected instance */}
      {selectedInstance && (
        <div className="flex-shrink-0 border-t border-line px-3 pb-3 pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-[560] text-fg">{selectedInstance.name}</span>
            <span className="flex-shrink-0 font-mono text-[11px] text-fg-2">
              {formatElapsedTime(selectedInstance.startTime, selectedInstance.endTime || currentTime)}
            </span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-fg-3">
            {selectedInstance.version}
            {selectedInstance.loader !== "vanilla" && (
              <>
                <span className="text-fg-4"> · </span>
                {selectedInstance.loader}
                {selectedInstance.loaderVersion ? ` ${selectedInstance.loaderVersion}` : ""}
              </>
            )}
          </div>

          {/* Resource Bars - only for running instances with metrics */}
          {selectedInstance.status === "running" && selectedInstance.memoryUsage > 0 && (
            <div className="mt-3 flex gap-4">
              <Meter
                label="RAM"
                value={formatMemory(selectedInstance.memoryUsage)}
                ratio={selectedInstance.memoryUsage / selectedInstance.memoryMax}
                tone={
                  selectedInstance.memoryUsage > selectedInstance.memoryMax
                    ? "warn"
                    : selectedInstance.memoryUsage / selectedInstance.memoryMax > 0.8
                      ? "err"
                      : "normal"
                }
              />
              <Meter
                label="CPU"
                value={`${Math.round(selectedInstance.cpuUsage)}%`}
                ratio={selectedInstance.cpuUsage / 100}
                tone={selectedInstance.cpuUsage > 80 ? "err" : "normal"}
              />
            </div>
          )}

          <div className="mt-3 flex items-center gap-1">
            {/* Stop/Restart Toggle */}
            {(selectedInstance.status === "running" || selectedInstance.status === "starting") &&
             !stoppingProcessIds.has(selectedInstance.id) ? (
              <Button
                variant="destructive"
                size="xs"
                className="flex-1"
                icon={<Square size={12} strokeWidth={2} />}
                onClick={() => handleStopProcess(selectedInstance.id)}
              >
                {t('instances.stop')}
              </Button>
            ) : (selectedInstance.status === "crashed" || selectedInstance.status === "idle" || stoppingProcessIds.has(selectedInstance.id)) ? (() => {
              const isLaunching = launchStates[selectedInstance.profileId]?.isButtonLaunching ?? false;

              return isLaunching ? (
                <Button
                  variant="destructive"
                  size="xs"
                  className="flex-1"
                  icon={<Square size={12} strokeWidth={2} />}
                  onClick={async () => {
                    try {
                      await ProcessService.abort(selectedInstance.profileId);
                      finalizeButtonLaunch(selectedInstance.profileId, "Aborted");
                      addLauncherLog(selectedInstance.profileId, "✗ Launch aborted by user");
                    } catch (error) {
                      console.error("Failed to abort launch:", error);
                    }
                  }}
                >
                  {t('instances.stop')}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="xs"
                  className="flex-1"
                  icon={<Play size={12} strokeWidth={2} fill="currentColor" />}
                  onClick={() => handleLaunchProfile(selectedInstance.profileId)}
                >
                  {t('instances.start')}
                </Button>
              );
            })() : (
              <div className="flex-1" />
            )}

            {/* Open Folder Button */}
            <button
              type="button"
              onClick={() => handleOpenFolder(selectedInstance.profileId)}
              className="cc-icon-btn"
              title={t('logs.open_folder')}
            >
              <FolderOpen size={15} strokeWidth={1.75} />
            </button>

            {/* Popout Log Window Button */}
            <button
              type="button"
              onClick={async () => {
                await invoke("open_single_log_window", {
                  instanceId: selectedInstance.id,
                  instanceName: selectedInstance.name,
                  profileId: selectedInstance.profileId,
                  accountName: selectedInstance.accountName,
                  startTime: selectedInstance.startTime
                });
              }}
              className="cc-icon-btn"
              title={t('logs.pop_out')}
            >
              <ExternalLink size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="flex h-7 flex-shrink-0 items-center gap-1.5 border-t border-line px-3 text-[11px] text-fg-3">
        <span className={cn("h-1.5 w-1.5 rounded-full", runningCount > 0 ? "bg-ok" : "bg-fg-4")} />
        <span className="font-mono">{t('instances.count_running', { count: runningCount })}</span>
      </div>
    </div>
  );
}
