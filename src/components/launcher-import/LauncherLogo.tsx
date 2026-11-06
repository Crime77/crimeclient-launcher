"use client";

import { Icon } from "@iconify/react";

import { launcherIcon } from "../../lib/launcher-meta";
import type { ExternalLauncherId } from "../../types/launcherImport";

interface LauncherLogoProps {
  launcher: ExternalLauncherId;
  size?: "sm" | "md";
  className?: string;
}

export function LauncherLogo({ launcher, size = "md", className = "" }: LauncherLogoProps) {
  const box = size === "sm" ? "h-7 w-7 rounded-sm" : "h-10 w-10 rounded-md";

  return (
    <div
      className={`${box} flex flex-shrink-0 items-center justify-center overflow-hidden border border-line bg-s3 ${className}`}
    >
      <Icon icon={launcherIcon(launcher)} className="h-1/2 w-1/2 text-fg-2" />
    </div>
  );
}
