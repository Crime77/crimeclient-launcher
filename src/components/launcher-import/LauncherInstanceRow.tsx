"use client";

import { useTranslation } from "react-i18next";
import { convertFileSrc } from "@tauri-apps/api/core";

import { CheckboxV2 } from "../ui/CheckboxV2";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";
import { loaderIconSrc, loaderLabel } from "../../lib/loader-icons";
import { formatRelativeTime } from "../../utils/format-relative-time";
import type { ExternalInstanceRef } from "../../types/launcherImport";

export interface LauncherInstanceRowProps {
  instance: ExternalInstanceRef;
  selected: boolean;
  importedProfileId?: string;
  onToggle: () => void;
  onOpenProfile: (profileId: string) => void;
}

export function LauncherInstanceRow({
  instance,
  selected,
  importedProfileId,
  onToggle,
  onOpenProfile,
}: LauncherInstanceRowProps) {
  const { t } = useTranslation();

  const unsupported = instance.unsupported
    ? t(`profiles.launcherImport.card.unsupported_${instance.unsupported}`)
    : null;
  const disabled = Boolean(unsupported) || Boolean(importedProfileId);

  const version = instance.gameVersion ?? t("profiles.launcherImport.card.unknown_version");
  const subtitle = [
    instance.name.trim() !== version ? version : null,
    loaderLabel(instance.loader),
    instance.modCount != null
      ? t("profiles.launcherImport.card.mod_count", { count: instance.modCount })
      : null,
    instance.lastPlayed
      ? t("profiles.launcherImport.card.last_played", {
          time: formatRelativeTime(instance.lastPlayed),
        })
      : t("profiles.launcherImport.card.never_played"),
  ]
    .filter(Boolean)
    .join("  ·  ");

  const row = (
    <div
      onClick={disabled ? undefined : onToggle}
      className={cn(
        "flex items-center gap-3 h-12 pl-3 pr-2 transition-colors duration-fast",
        selected && "bg-s3",
        disabled ? "opacity-50" : cn("cursor-pointer", !selected && "hover:bg-s2"),
      )}
    >
      <div onClick={(event) => event.stopPropagation()} className="flex-shrink-0">
        <CheckboxV2 size="sm" checked={selected} disabled={disabled} onChange={onToggle} />
      </div>

      <div className="relative h-8 w-8 flex-shrink-0">
        <div
          className="flex h-full w-full items-center justify-center overflow-hidden border border-line bg-s3"
          style={{ borderRadius: "var(--r-sm)" }}
        >
          <img
            src={instance.iconPath ? convertFileSrc(instance.iconPath) : loaderIconSrc(instance.loader)}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = loaderIconSrc(instance.loader);
            }}
          />
        </div>
        {instance.iconPath && (
          <img
            src={loaderIconSrc(instance.loader)}
            alt=""
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-sm border border-line-2 bg-s4 p-px"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-[13px] font-medium text-fg",
            unsupported && "line-through decoration-fg-4",
          )}
        >
          {instance.name}
        </span>
        <span className="truncate text-[11.5px] text-fg-3">{subtitle}</span>
      </div>

      {importedProfileId && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile(importedProfileId);
          }}
          type="button"
          className="flex-shrink-0 inline-flex items-center h-7 px-2.5 border border-line-2 bg-s2 text-[12px] text-fg-2 transition-colors duration-fast hover:bg-s3 hover:text-fg"
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {t("profiles.launcherImport.card.open_profile")}
        </button>
      )}
    </div>
  );

  if (unsupported) {
    return (
      <Tooltip content={unsupported} position="top" wrapperClassName="w-full">
        {row}
      </Tooltip>
    );
  }

  return row;
}
