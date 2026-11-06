"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, FileText, Monitor, Square, X } from "lucide-react";
import { cn } from "../../lib/utils";
import * as ProcessService from "../../services/process-service";
import type { ProcessMetadata } from "../../types/processState";
import { timeAgo } from "../../utils/time-utils";
import { Button } from "../ui/./buttons/Button";
import { IconButton } from "../ui/./buttons/IconButton";
import { Label } from "../ui/./Label";
import { Dropdown } from "../ui/./dropdown/Dropdown";
import { DropdownHeader } from "../ui/./dropdown/DropdownHeader";
import { DropdownFooter } from "../ui/./dropdown/DropdownFooter";
import { invoke } from "@tauri-apps/api/core";

interface RunningInstancesIndicatorProps {
  className?: string;
}

export function RunningInstancesIndicator({
  className,
}: RunningInstancesIndicatorProps) {
  const { t } = useTranslation();
  const [processes, setProcesses] = useState<ProcessMetadata[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [viewingLogsId, setViewingLogsId] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set(),
  );
  const buttonRef = useRef<HTMLDivElement>(null);

  const fetchProcesses = useCallback(async () => {
    setError(null);
    try {
      const fetchedProcesses = await ProcessService.getRunningProcesses();
      setProcesses(fetchedProcesses);
    } catch (err) {
      setError(t('instances.fetch_failed'));
      console.error(err);
      setProcesses([]);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    fetchProcesses();

    const intervalId = setInterval(fetchProcesses, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchProcesses]);

  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleStopProcess = async (processId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStoppingId(processId);
    try {
      await ProcessService.stopProcess(processId);
      console.log(
        "[RunningInstancesIndicator] Process stop initiated successfully via service.",
      );
      setProcesses((prevProcesses) =>
        prevProcesses.filter((p) => p.id !== processId),
      );
    } catch (err) {
      console.error(
        `[RunningInstancesIndicator] Failed to stop process ${processId}:`,
        err,
      );
      await fetchProcesses();
    } finally {
      setStoppingId(null);
      setTimeout(() => fetchProcesses(), 500);
    }
  };

  const handleViewLogs = async (processId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingLogsId(processId);
    try {
      await ProcessService.openLogWindow(processId);
    } catch (err) {
      console.error(
        `Failed to open log window for process ID ${processId}:`,
        err,
      );
    } finally {
      setTimeout(() => setViewingLogsId(null), 1000);
    }
  };

  const handleStopAll = async () => {
    try {
      const idsToStop = processes.map((p) => p.id);
      for (const process of processes) {
        await ProcessService.stopProcess(process.id);
      }
      console.log("[RunningInstancesIndicator] Stop all processes initiated.");
      setProcesses((prevProcesses) =>
        prevProcesses.filter((p) => !idsToStop.includes(p.id)),
      );
      handleCloseDropdown();
    } catch (err) {
      console.error(
        `[RunningInstancesIndicator] Failed to stop all processes:`,
        err,
      );
      await fetchProcesses();
    }
  };

  const handleOpenLogWindow = async () => {
    try {
      await invoke("open_minecraft_log_window", { crashedProcess: null });
    } catch (err) {
      console.error("Failed to open log window:", err);
    }
  };

  const instanceCount = processes.length;
  const hasInstances = instanceCount > 0;

  const ring = (
    <span className="block w-3.5 h-3.5 rounded-full border-[1.5px] border-line-2 border-t-fg-2 animate-spin" />
  );

  return (
    <div className={cn("relative", className)}>
      <div ref={buttonRef} className="relative">
        {/* 28 px title-bar item: the icon alone, or a green dot and the count while games run */}
        <button
          type="button"
          onClick={handleOpenLogWindow}
          title={
            isLoading && instanceCount === 0
              ? t('instances.loading')
              : instanceCount === 0
                ? t('instances.no_instances')
                : `${instanceCount} ${t('common.instance', { count: instanceCount })}`
          }
          className={cn(
            "cc-free relative flex items-center h-7 transition-colors duration-fast",
            hasInstances
              ? "gap-1.5 pl-2 pr-2.5 bg-s2 border border-line-2 text-fg hover:bg-s3"
              : "w-7 justify-center text-fg-3 hover:text-fg hover:bg-s3",
          )}
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {hasInstances && <span className="w-1.5 h-1.5 rounded-full bg-ok flex-shrink-0" />}
          <Monitor size={15} strokeWidth={1.75} className={hasInstances ? "text-fg-2" : undefined} />
          {hasInstances && <span className="cc-num text-xs font-[560]">{instanceCount}</span>}
        </button>
      </div>

      <Dropdown
        isOpen={isDropdownOpen}
        onClose={handleCloseDropdown}
        triggerRef={buttonRef}
        width={340}
        offset={6}
      >
        <DropdownHeader title={t('instances.running_instances')}>
          <button
            type="button"
            onClick={handleCloseDropdown}
            className="cc-icon-btn w-6 h-6 -mr-1.5"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </DropdownHeader>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isLoading && processes.length === 0 ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2.5 text-center">
              {ring}
              <p className="text-fg-3 text-xs">
                {t('instances.loading_instances')}
              </p>
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-err text-xs">
                Error: {error}
              </p>
            </div>
          ) : processes.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-fg-2 text-[13px] font-[520]">
                {t('instances.no_running')}
              </p>
              <p className="text-fg-3 text-xs mt-1">
                {t('instances.launch_to_start')}
              </p>
            </div>
          ) : (
            <div className="py-1 divide-y divide-line">
              {processes.map((process) => (
                <div
                  key={process.id}
                  className="px-3 py-2 hover:bg-s3 transition-colors duration-fast"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 overflow-hidden bg-s3">
                        {process.profile_image_url &&
                        !imageLoadErrors.has(process.id) ? (
                          <img
                            src={process.profile_image_url}
                            alt={process.profile_name || "Profile Icon"}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageLoadErrors((prev) =>
                                new Set(prev).add(process.id),
                              );
                            }}
                          />
                        ) : (
                          <img
                            src="/icons/minecraft.png"
                            alt="Minecraft Default Icon"
                            className="w-5 h-5"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col gap-1">
                        <p
                          className="text-[13px] font-[520] text-fg truncate leading-none"
                          title={process.profile_name || process.profile_id}
                        >
                          {process.profile_name ||
                            `Profile ${process.profile_id.substring(0, 6)}...`}
                        </p>
                        <div className="flex items-center gap-1.5 text-fg-3 leading-none">
                          <Clock size={11} strokeWidth={1.75} />
                          <span className="cc-num text-[11px]">
                            {timeAgo(new Date(process.start_time).getTime())}
                          </span>
                          {typeof process.state === "object" &&
                            "Crashed" in process.state && (
                              <Label variant="destructive" size="xs" className="ml-1 h-4">
                                {t('instances.crashed')}
                              </Label>
                            )}
                          {typeof process.state === "string" &&
                            process.state !== "Running" && (
                              <Label variant="warning" size="xs" className="ml-1 h-4">
                                {process.state}
                              </Label>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {process.id && (
                        <IconButton
                          onClick={(e) => handleViewLogs(process.id, e)}
                          size="xs"
                          icon={viewingLogsId === process.id ? ring : <FileText size={14} strokeWidth={1.75} />}
                          aria-label={t('instances.view_logs')}
                        />
                      )}
                      <IconButton
                        onClick={(e) => handleStopProcess(process.id, e)}
                        disabled={stoppingId === process.id}
                        variant="destructive"
                        size="xs"
                        className="border-transparent"
                        icon={stoppingId === process.id ? ring : <Square size={12} strokeWidth={2} className="fill-current" />}
                        aria-label={t('instances.stop_process')}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DropdownFooter>
          <div className="flex items-center justify-between w-full gap-2">
            {processes.length > 0 ? (
              <span className="flex items-center gap-1.5 pl-1 text-xs text-fg-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                {t('instances.count_running', { count: processes.length })}
              </span>
            ) : (
              <span className="pl-1 text-fg-3 text-xs">
                {t('instances.none')}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={handleOpenLogWindow}
                icon={<Monitor size={14} strokeWidth={1.75} />}
              >
                {t('instances.logs')}
              </Button>
              {processes.length > 0 && (
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={handleStopAll}
                  icon={<Square size={11} strokeWidth={2} className="fill-current" />}
                >
                  {t('instances.stop_all')}
                </Button>
              )}
            </div>
          </div>
        </DropdownFooter>
      </Dropdown>
    </div>
  );
}
