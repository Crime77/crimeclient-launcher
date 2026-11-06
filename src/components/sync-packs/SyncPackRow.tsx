"use client";

import type { ReactNode } from "react";
import { Icon } from "@iconify/react";

import { Tooltip } from "../ui/Tooltip";
import { useIsTruncated } from "../../hooks/useIsTruncated";
import { CheckboxV2 } from "../ui/CheckboxV2";
import { cn } from "../../lib/utils";

import type { SyncTargetKind } from "../../types/syncPacks";

export type SyncSelectionKind = "target" | "mod" | "jar";

export function selectionKey(
  packId: string,
  kind: SyncSelectionKind,
  id: string,
): string {
  return `${packId}|${kind}|${id}`;
}

export function parseSelectionKey(key: string): {
  packId: string;
  kind: SyncSelectionKind;
  id: string;
} {
  const [packId, kind, ...rest] = key.split("|");
  return { packId, kind: kind as SyncSelectionKind, id: rest.join("|") };
}

function MaybeTooltip({
  content,
  truncated,
  children,
}: {
  content: ReactNode;
  truncated: boolean;
  children: React.ReactNode;
}) {
  if (!truncated) return <>{children}</>;
  return (
    <Tooltip
      content={content}
      position="top"
      wrapperClassName="min-w-0 w-full max-w-full"
    >
      {children}
    </Tooltip>
  );
}

export function targetIcon(kind: SyncTargetKind): string {
  switch (kind.type) {
    case "dir_link":
      return "solar:folder-bold";
    case "mods":
      return "solar:box-minimalistic-bold";
    default:
      return "solar:file-text-bold";
  }
}

export function prettyPath(path: string): string {
  return path.replace(/^\\\\\?\\/, "");
}

export interface RowActionProps {
  label: string;
  onClick: () => void;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}

export function RowAction({
  label,
  onClick,
  icon,
  danger,
  disabled,
  title,
}: RowActionProps) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick();
  };

  const button = icon ? (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "cc-icon-btn flex-shrink-0 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 disabled:opacity-30",
        danger && "hover:!text-err",
      )}
    >
      <Icon icon={icon} className="h-3.5 w-3.5" />
    </button>
  ) : (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex-shrink-0 h-7 px-2 text-[11.5px] text-transparent transition-colors duration-fast group-hover/row:text-fg-4 disabled:opacity-30",
        danger ? "hover:!text-err" : "hover:!text-fg",
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      {label}
    </button>
  );

  return (
    <Tooltip content={title ?? label} position="top" wrapperClassName="flex-shrink-0">
      {button}
    </Tooltip>
  );
}

export interface SyncPackRowProps {
  icon?: string;
  iconUrl?: string | null;
  fallbackLetter?: string;
  title: string;
  subtitle?: ReactNode;
  subtitleTitle?: string;
  actions?: ReactNode;
  trailing?: ReactNode;
  dimmed?: boolean;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function SyncPackRow({
  icon,
  iconUrl,
  fallbackLetter,
  title,
  subtitle,
  subtitleTitle,
  actions,
  trailing,
  dimmed,
  onClick,
  selectable,
  selected,
  onToggleSelect,
}: SyncPackRowProps) {
  const titleFit = useIsTruncated<HTMLDivElement>();
  const subtitleFit = useIsTruncated<HTMLDivElement>();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group/row flex items-center gap-3 min-h-[48px] px-3 py-1.5 transition-colors duration-fast",
        selected ? "bg-s3" : "hover:bg-s2",
        onClick && "cursor-pointer",
        dimmed && "opacity-60",
      )}
    >
      {selectable && (
        <div
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "flex-shrink-0 transition-opacity duration-fast",
            selected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
          )}
        >
          <CheckboxV2
            size="sm"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.()}
          />
        </div>
      )}
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden border border-line bg-s3"
        style={{ borderRadius: "var(--r-sm)" }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : icon ? (
          <Icon icon={icon} className="h-4 w-4 text-fg-3" />
        ) : (
          <span className="text-[13px] font-semibold uppercase text-fg-3">
            {fallbackLetter ?? "?"}
          </span>
        )}
      </div>

      <div className="flex min-w-0 w-full flex-1 flex-col items-start">
        <MaybeTooltip content={title} truncated={titleFit.truncated}>
          <div
            ref={titleFit.ref}
            className={cn(
              "w-full truncate text-[13px] font-medium text-fg",
              dimmed && "line-through decoration-fg-4",
            )}
          >
            {title}
          </div>
        </MaybeTooltip>
        {subtitle && (
          <MaybeTooltip
            content={subtitleTitle ?? subtitle}
            truncated={subtitleFit.truncated}
          >
            <div
              ref={subtitleFit.ref}
              className="mt-0.5 w-full truncate text-[11.5px] text-fg-3"
            >
              {subtitle}
            </div>
          </MaybeTooltip>
        )}
      </div>

      {actions}
      {trailing}
    </div>
  );
}
