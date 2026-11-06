"use client";

import { ChevronRight, Loader2, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CheckboxV2 } from "../ui/CheckboxV2";
import { Tooltip } from "../ui/Tooltip";
import { LauncherLogo } from "./LauncherLogo";
import { LauncherInstanceRow } from "./LauncherInstanceRow";
import { cn } from "../../lib/utils";
import { isSelectable } from "../../types/launcherImport";
import type { DetectedLauncher, ExternalInstanceRef } from "../../types/launcherImport";

export interface LauncherGroupSectionProps {
  launcher: DetectedLauncher;
  instances: ExternalInstanceRef[];
  visibleInstances: ExternalInstanceRef[];
  collapsed: boolean;
  phase: "idle" | "loading" | "ready" | "error";
  error: string | null;
  selected: string[];
  importedThisSession: Record<string, string>;
  onToggleCollapsed: () => void;
  onToggleLauncher: () => void;
  onToggleInstance: (instanceDir: string) => void;
  onOpenProfile: (profileId: string) => void;
  onRemove?: () => void;
  onRetry: () => void;
}

export function LauncherGroupSection({
  launcher,
  instances,
  visibleInstances,
  collapsed,
  phase,
  error,
  selected,
  importedThisSession,
  onToggleCollapsed,
  onToggleLauncher,
  onToggleInstance,
  onOpenProfile,
  onRemove,
  onRetry,
}: LauncherGroupSectionProps) {
  const { t } = useTranslation();

  const selectable = visibleInstances.filter((instance) =>
    isSelectable(instance, importedThisSession),
  );
  const selectedHere = selectable.filter((instance) =>
    selected.includes(instance.instanceDir),
  ).length;
  const allSelected = selectable.length > 0 && selectedHere === selectable.length;

  return (
    <div
      className={cn(
        "overflow-hidden border bg-s1 transition-colors duration-fast",
        selectedHere > 0 ? "border-line-2" : "border-line",
      )}
      style={{ borderRadius: "var(--r-lg)" }}
    >
      <div
        onClick={onToggleCollapsed}
        className="group/head flex cursor-pointer items-center gap-3 h-12 px-3 transition-colors duration-fast hover:bg-s2"
      >
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          className="flex-shrink-0 text-fg-4 transition-[color,transform] duration-fast group-hover/head:text-fg-2"
          style={{ transform: collapsed ? undefined : "rotate(90deg)" }}
        />

        <div onClick={(event) => event.stopPropagation()} className="flex-shrink-0">
          <CheckboxV2
            size="sm"
            checked={allSelected}
            indeterminate={selectedHere > 0 && !allSelected}
            onChange={onToggleLauncher}
            disabled={phase === "error" || selectable.length === 0}
          />
        </div>

        <Tooltip content={launcher.instancesDir} position="top" wrapperClassName="flex-shrink-0">
          <LauncherLogo launcher={launcher.launcher} size="sm" />
        </Tooltip>

        <div className="min-w-0 flex-1">
          <span className="truncate text-[13.5px] font-semibold text-fg">
            {launcher.displayName}
          </span>
          {!launcher.autoDetected && (
            <span className="ml-2 text-[11.5px] text-fg-4">
              {t("profiles.launcherImport.added_by_you")}
            </span>
          )}
        </div>

        <span className="flex-shrink-0 cc-num text-[11.5px] text-fg-3">
          {t("profiles.launcherImport.instance_count", { count: launcher.instanceCount })}
        </span>

        {onRemove && (
          <Tooltip
            content={t("profiles.launcherImport.manual.remove")}
            position="top"
            wrapperClassName="flex-shrink-0"
          >
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              type="button"
              aria-label={t("profiles.launcherImport.manual.remove")}
              className="cc-icon-btn opacity-0 group-hover/head:opacity-100 focus-visible:opacity-100"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </Tooltip>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-line">
          {phase === "loading" && (
            <div className="flex items-center gap-2 px-4 h-11 text-[12.5px] text-fg-3">
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              {t("profiles.launcherImport.loading_instances")}
            </div>
          )}

          {phase === "error" && (
            <div className="flex items-center gap-2 px-4 h-11">
              <TriangleAlert size={14} strokeWidth={1.75} className="flex-shrink-0 text-warn" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg-2">
                {t("profiles.launcherImport.instances_failed", {
                  launcher: launcher.displayName,
                  error: error ?? "",
                })}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="flex-shrink-0 h-7 px-2 rounded-sm text-[12px] text-fg-3 transition-colors duration-fast hover:bg-s3 hover:text-fg"
              >
                {t("profiles.launcherImport.retry")}
              </button>
            </div>
          )}

          {phase === "ready" && visibleInstances.length === 0 && (
            <div className="px-4 py-3 text-[12px] text-fg-4">
              {instances.length === 0
                ? t("profiles.launcherImport.launcher_empty")
                : t("profiles.launcherImport.no_match_in_launcher")}
            </div>
          )}

          {visibleInstances.length > 0 && (
            <div className="divide-y divide-line">
              {visibleInstances.map((instance) => (
                <LauncherInstanceRow
                  key={instance.instanceDir}
                  instance={instance}
                  selected={selected.includes(instance.instanceDir)}
                  importedProfileId={importedThisSession[instance.instanceDir]}
                  onToggle={() => onToggleInstance(instance.instanceDir)}
                  onOpenProfile={onOpenProfile}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
