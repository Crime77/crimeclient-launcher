"use client";

import React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxV2Props {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Whether the checkbox is in indeterminate state */
  indeterminate?: boolean;
  /** Optional label text */
  label?: string;
  /** Optional tooltip text */
  tooltip?: string;
  /** Custom size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Click handler for the entire component */
  onClick?: (e: React.MouseEvent) => void;
}

// box / check (px); checked = the light --fg fill with a dark check
const SIZES = {
  sm: { box: 14, icon: 10, label: "text-xs" },
  md: { box: 16, icon: 11, label: "text-[13px]" },
  lg: { box: 18, icon: 12, label: "text-sm" },
} as const;

export function CheckboxV2({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  label,
  tooltip,
  size = "md",
  className = "",
  onClick,
}: CheckboxV2Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
      if (onClick) {
        onClick(e);
      }
    }
  };

  const d = SIZES[size] ?? SIZES.md;
  const on = checked || indeterminate;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center flex-shrink-0 border transition-colors duration-fast ease-out",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3 focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
          on ? "bg-fg border-fg text-bg" : "bg-s2 border-line-3",
          !on && !disabled && "hover:border-fg-3 hover:bg-s3",
          disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
        )}
        style={{ width: d.box, height: d.box, borderRadius: "var(--r-sm)" }}
        title={tooltip}
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
      >
        {on && (indeterminate ? (
          <Minus size={d.icon} strokeWidth={3} />
        ) : (
          <Check size={d.icon} strokeWidth={3} />
        ))}
      </div>

      {label && (
        <label
          onClick={!disabled ? handleClick : undefined}
          className={cn(
            "text-fg-2 font-[450] cursor-pointer select-none transition-colors duration-fast",
            d.label,
            disabled ? "opacity-45 cursor-not-allowed" : "hover:text-fg",
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
}
