"use client";

import { cn } from "../../../lib/utils";

interface DropdownDividerProps {
  className?: string;
}

export function DropdownDivider({ className }: DropdownDividerProps) {
  return <div className={cn("h-px w-full my-1 bg-line", className)} />;
}
