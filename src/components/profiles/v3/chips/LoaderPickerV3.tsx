"use client";

/**
 * LoaderPickerV3 — presentational picker for the mod loader type.
 *
 * Fixed 5-option set (vanilla + 4 loaders). Click = commit.
 */

import { Check } from "lucide-react";
import type { LoaderKey } from "./useHeroChipEditors";
import { loaderIconSrc, loaderLabel } from "../../../../lib/loader-icons";

interface LoaderOption {
  key: LoaderKey;
  icon: string;
  name: string;
}

const LOADERS: LoaderOption[] = (
  ["vanilla", "fabric", "forge", "quilt", "neoforge"] as const
).map((key) => ({
  key,
  icon: loaderIconSrc(key),
  name: loaderLabel(key),
}));

interface LoaderPickerV3Props {
  currentLoader: string | null | undefined;
  onSelect: (loader: LoaderKey) => void;
}

export function LoaderPickerV3({ currentLoader, onSelect }: LoaderPickerV3Props) {
  const normalized = (currentLoader ?? "vanilla").toLowerCase();

  return (
    <div>
      {LOADERS.map((l) => {
        const isCurrent = l.key === normalized;
        return (
          <button
            type="button"
            key={l.key}
            onClick={() => onSelect(l.key)}
            className={`w-full h-8 flex items-center gap-2.5 px-2 text-left text-[13px] transition-colors duration-fast ${
              isCurrent ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s3 hover:text-fg"
            }`}
            style={{ borderRadius: "var(--r-sm)" }}
          >
            <img
              src={l.icon}
              alt={l.name}
              className="w-4 h-4 flex-shrink-0"
              style={{ imageRendering: l.key === "vanilla" ? "pixelated" : undefined }}
            />
            <span className="flex-1">{l.name}</span>
            {isCurrent && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />}
          </button>
        );
      })}
    </div>
  );
}
