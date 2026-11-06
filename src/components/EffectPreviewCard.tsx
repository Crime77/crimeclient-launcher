"use client";

import { Check } from "lucide-react";
import { cn } from "../lib/utils";
import { BACKGROUND_EFFECTS } from "../store/background-effect-store";
import { GridBackground } from "./effects/GridBackground";

interface EffectPreviewCardProps {
  effectId: string;
  name: string;
  /** kept for old call sites */
  icon?: string;
  isActive: boolean;
  onClick: () => void;
}

/** A background option in the appearance settings: a small live preview with its name below. */
export function EffectPreviewCard({ effectId, name, isActive, onClick }: EffectPreviewCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left flex flex-col gap-2 p-1.5 border transition-colors duration-fast",
        isActive ? "border-line-3 bg-s2" : "border-line hover:border-line-2 hover:bg-s2",
      )}
      style={{ borderRadius: "var(--r-md)" }}
    >
      <div className="relative h-20 overflow-hidden bg-bg border border-line" style={{ borderRadius: "var(--r-sm)" }}>
        {effectId === BACKGROUND_EFFECTS.GRID && <GridBackground size={12} />}
        <div className="absolute left-2 top-2 bottom-2 w-6 bg-s1 border border-line" style={{ borderRadius: 2 }} />
        <div className="absolute left-10 right-2 top-2 h-1.5 bg-s3" style={{ borderRadius: 2 }} />
      </div>
      <div className="flex items-center justify-between px-1 pb-0.5">
        <span className={cn("text-[13px]", isActive ? "text-fg" : "text-fg-2")}>{name}</span>
        {isActive && <Check size={14} className="text-fg" />}
      </div>
    </button>
  );
}

export default EffectPreviewCard;
