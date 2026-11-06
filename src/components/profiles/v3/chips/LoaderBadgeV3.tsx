"use client";

/**
 * LoaderBadgeV3 — the loader icon on the bottom-right corner of the profile picture, a trigger
 * for LoaderPickerV3. A small flat square (s1, line-2) so it reads on any profile picture
 * without shadows or glows.
 *
 * Locked mode (for `is_standard_version`): a lock glyph instead of the hover state, no click.
 */

import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { loaderIconSrc } from "../../../../lib/loader-icons";
import { ThemedDropdown } from "../shared/ThemedDropdown";
import { LoaderPickerV3 } from "./LoaderPickerV3";
import type { LoaderKey } from "./useHeroChipEditors";

interface LoaderBadgeV3Props {
  loader: string | null | undefined;
  onChange: (loader: LoaderKey) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function LoaderBadgeV3({ loader, onChange, disabled, disabledReason }: LoaderBadgeV3Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const icon = loaderIconSrc(loader);
  const label = loader ?? "vanilla";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        title={disabled ? disabledReason : t("profiles.v3.chips.loader.changeTitle")}
        className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 flex items-center justify-center bg-s1 border transition-colors duration-fast ${
          disabled
            ? "border-line-2 cursor-default"
            : open
              ? "border-line-3 bg-s3"
              : "border-line-2 hover:border-line-3 hover:bg-s2"
        }`}
        style={{ borderRadius: "var(--r-sm)" }}
      >
        <img
          src={icon}
          alt={label}
          className="w-3.5 h-3.5"
          style={{ imageRendering: !loader ? "pixelated" : undefined }}
        />
        {disabled && (
          <span
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 flex items-center justify-center bg-s3 border border-line-2"
            style={{ borderRadius: "999px" }}
          >
            <Lock size={8} strokeWidth={2} className="text-fg-3" />
          </span>
        )}
      </button>

      <ThemedDropdown
        open={open && !disabled}
        onClose={() => setOpen(false)}
        width="w-48"
        align="left"
        triggerRef={triggerRef}
      >
        <LoaderPickerV3
          currentLoader={loader}
          onSelect={(l) => {
            onChange(l);
            setOpen(false);
          }}
        />
      </ThemedDropdown>
    </>
  );
}
