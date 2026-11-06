"use client";

import type React from "react";

import { cn } from "../../../lib/utils";

interface DropdownHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

/** The top row of a menu panel: a small eyebrow title, a hairline below. */
export function DropdownHeader({
  title,
  className,
  children,
}: DropdownHeaderProps) {
  return (
    <div
      className={cn(
        "px-3 h-9 border-b border-line relative",
        "flex items-center justify-between gap-2",
        className,
      )}
    >
      <span className="cc-eyebrow truncate">{title}</span>
      {children}
    </div>
  );
}
