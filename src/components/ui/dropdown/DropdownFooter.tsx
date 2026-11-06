"use client";

import type React from "react";

import { cn } from "../../../lib/utils";

interface DropdownFooterProps {
  className?: string;
  children: React.ReactNode;
}

/** The bottom row of a menu panel: actions right, a hairline above, a shade darker. */
export function DropdownFooter({ className, children }: DropdownFooterProps) {
  return (
    <div
      className={cn(
        "px-2 py-2 border-t border-line bg-s1 flex items-center justify-end gap-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
