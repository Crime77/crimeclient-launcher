"use client";

import type React from "react";

import { cn } from "../../../lib/utils";

interface DropdownItemProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  shortcut?: React.ReactNode;
  role?: string;
}

/** A menu row: inset, r-sm, hover s3; the active row is s3 with full-strength text. */
export function DropdownItem({
  className,
  children,
  onClick,
  isActive = false,
  icon,
  disabled = false,
  shortcut,
  role,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role={role}
      disabled={disabled}
      className={cn(
        "mx-1 w-[calc(100%-0.5rem)] min-h-8 px-2.5 py-1.5 text-left text-[13px] font-[450] rounded-sm",
        "flex items-center gap-2.5 transition-colors duration-fast ease-out",
        disabled
          ? "cursor-not-allowed opacity-40 text-fg-3"
          : isActive
            ? "bg-s3 text-fg"
            : "text-fg-2 hover:text-fg hover:bg-s3 active:bg-s4",
        className,
      )}
      onClick={onClick}
    >
      {icon && <span className={cn("flex-shrink-0 flex items-center", isActive ? "text-fg" : "text-fg-3")}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <span className="shrink-0 cc-num text-[11px] text-fg-4">{shortcut}</span>}
    </button>
  );
}
