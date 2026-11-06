"use client";

import { ArrowUpRight, ChevronDown, Link2, User } from "lucide-react";
import { SyncPackIcon } from "../../../../sync-packs/SyncPackIcon";

interface ContentGroupDividerProps {
  label: string;
  tag?: string;
  count: number;
  packId?: string;
  packIcon?: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onOpen?: () => void;
  openLabel?: string;
}

/** Group header in the content list: an eyebrow row with chevron, pack icon, count and a hairline. */
export function ContentGroupDivider({
  label,
  tag,
  count,
  packId,
  packIcon,
  collapsed,
  onToggle,
  onOpen,
  openLabel,
}: ContentGroupDividerProps) {
  return (
    <div className="flex items-center gap-2 h-9 px-5 border-b border-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group/divider flex min-w-0 flex-1 items-center gap-2 h-full text-left"
      >
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className="flex-shrink-0 text-fg-4 transition-transform duration-fast group-hover/divider:text-fg-2"
          style={{ transform: collapsed ? "rotate(-90deg)" : undefined }}
        />
        {packId ? (
          <SyncPackIcon packId={packId} icon={packIcon ?? null} size="xs" />
        ) : (
          <span
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center bg-s3 border border-line"
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <User size={10} strokeWidth={2} className="text-fg-3" />
          </span>
        )}
        <span className="cc-eyebrow min-w-0 truncate transition-colors duration-fast group-hover/divider:text-fg-2">
          {label}
        </span>
        {tag && (
          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-fg-4">
            <Link2 size={11} strokeWidth={1.75} />
            {tag}
          </span>
        )}
        <span className="cc-num flex-shrink-0 text-[11px] text-fg-4">{count}</span>
      </button>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="flex h-6 flex-shrink-0 items-center gap-1 px-1.5 text-[12px] text-fg-3 transition-colors duration-fast hover:bg-s3 hover:text-fg"
          style={{ borderRadius: "var(--r-sm)" }}
        >
          {openLabel}
          <ArrowUpRight size={12} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
