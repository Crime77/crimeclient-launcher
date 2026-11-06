"use client";

import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { FolderOpen } from "lucide-react";
import { handleIconImgLoad } from "../profiles/IconPicker";
import { BLOCK_ICONS } from "../../data/block-icons";

function fallbackBlockUrl(packId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < packId.length; i++) {
    hash ^= packId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return BLOCK_ICONS[Math.abs(hash) % BLOCK_ICONS.length].url;
}

interface SyncPackIconProps {
  packId: string;
  icon: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function SyncPackIcon({
  packId,
  icon,
  size = "md",
  className = "",
}: SyncPackIconProps) {
  const [failed, setFailed] = useState(false);

  const src = icon
    ? /^https?:\/\//i.test(icon)
      ? icon
      : convertFileSrc(icon)
    : fallbackBlockUrl(packId);

  useEffect(() => setFailed(false), [src]);

  const box =
    size === "xs"
      ? "h-5 w-5 rounded-sm"
      : size === "sm"
        ? "h-8 w-8 rounded-sm"
        : "h-10 w-10 rounded-md";

  return (
    <div
      className={`${box} flex flex-shrink-0 items-center justify-center overflow-hidden border border-line bg-s3 ${className}`}
    >
      {failed ? (
        <FolderOpen className="h-1/2 w-1/2 text-fg-3" strokeWidth={1.75} />
      ) : (
        <img
          src={src}
          alt=""
          onLoad={handleIconImgLoad}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
