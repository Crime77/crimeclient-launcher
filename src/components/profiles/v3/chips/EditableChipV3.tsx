"use client";

/**
 * EditableChipV3 — an inline-editable meta value in the profile header (version, loader version,
 * group, account). Quiet by default: plain text that gets an s2 surface and a pen on hover; the
 * editor opens in a `ThemedDropdown` popover.
 *
 *  · optional Save/Cancel footer for text editors (off for list pickers that commit on click)
 *  · `onOpen` fires once when the popover opens, used to fetch picker data on demand
 */

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Lock, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "../../../ui/buttons/Button";
import { ThemedDropdown } from "../shared/ThemedDropdown";

interface EditableChipV3Props {
  icon?: LucideIcon;
  children: React.ReactNode;
  renderEditor: (ctx: { close: () => void; commit: () => void }) => React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  onOpen?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  /** Render Save/Cancel footer. Default true. Set false for list-pickers. */
  withSaveCancel?: boolean;
  /** Tailwind width class understood by `ThemedDropdown` (w-48 … w-72). */
  width?: string;
  /** Mono numerals for version-like values. */
  mono?: boolean;
  /** Tooltip for the trigger. */
  title?: string;
}

export function EditableChipV3({
  icon: Glyph,
  children,
  renderEditor,
  onSave,
  onCancel,
  onOpen,
  disabled,
  disabledReason,
  withSaveCancel = true,
  width = "w-56",
  mono = false,
  title,
}: EditableChipV3Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fire onOpen exactly when the popover transitions closed → open
  useEffect(() => {
    if (open) onOpen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = () => {
    onSave?.();
    setOpen(false);
  };

  const close = () => {
    setOpen(false);
    onCancel?.();
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        title={disabled ? disabledReason : title}
        className={`group inline-flex items-center gap-1.5 h-6 px-1.5 -mx-0.5 text-[12px] transition-colors duration-fast ${
          mono ? "cc-num" : ""
        } ${
          disabled
            ? "text-fg-3 cursor-default"
            : open
              ? "bg-s3 text-fg"
              : "text-fg-2 hover:bg-s2 hover:text-fg"
        }`}
        style={{ borderRadius: "var(--r-sm)" }}
      >
        {Glyph && <Glyph size={13} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />}
        <span className="truncate max-w-[220px]">{children}</span>
        {disabled ? (
          <Lock size={11} strokeWidth={1.75} className="flex-shrink-0 text-fg-4" />
        ) : (
          <PenLine
            size={11}
            strokeWidth={1.75}
            className={`flex-shrink-0 text-fg-3 transition-opacity duration-fast ${
              open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          />
        )}
      </button>

      <ThemedDropdown
        open={open && !disabled}
        onClose={close}
        width={width}
        align="left"
        triggerRef={triggerRef}
      >
        {renderEditor({ close, commit })}
        {withSaveCancel && (
          <>
            <div className="h-px bg-line my-1 -mx-1" />
            <div className="flex items-center justify-end gap-1 p-1">
              <Button variant="ghost" size="xs" onClick={close}>
                {t("profiles.v3.chips.cancel")}
              </Button>
              <Button variant="secondary" size="xs" onClick={commit}>
                {t("profiles.v3.chips.save")}
              </Button>
            </div>
          </>
        )}
      </ThemedDropdown>
    </div>
  );
}
