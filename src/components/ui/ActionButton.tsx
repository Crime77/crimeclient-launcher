"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

export type ActionButtonVariant = "primary" | "secondary" | "icon-only" | "destructive" | "text" | "highlight";

export interface ActionButtonProps {
  /** Unique identifier for the button */
  id?: string;
  /** Label text to display */
  label?: string;
  /** Icon to display */
  icon: string;
  /** Button variant/style */
  variant?: ActionButtonVariant;
  /** Optional tooltip text */
  tooltip?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Custom size override */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes for the icon */
  iconClassName?: string;
}

// heights 28 / 32 / 36 px; icon-only buttons are square
const SIZES = {
  sm: { label: "h-7 px-2.5 gap-1.5 text-xs", square: "h-7 w-7", icon: "w-3.5 h-3.5" },
  md: { label: "h-8 px-3 gap-2 text-[13px]", square: "h-8 w-8", icon: "w-4 h-4" },
  lg: { label: "h-9 px-3.5 gap-2 text-[13px]", square: "h-9 w-9", icon: "w-4 h-4" },
} as const;

// "Werkzeug": primary = the accent fill (the one main action), secondary = s3 with a hairline,
// text = quiet, highlight = a text action at full strength, destructive = state text and hairline
const VARIANTS: Record<ActionButtonVariant, string> = {
  primary: "cc-btn-primary border border-transparent",
  secondary: "bg-s3 border border-line-2 text-fg hover:bg-s4 hover:border-line-3",
  "icon-only": "bg-transparent border border-transparent text-fg-3 hover:text-fg hover:bg-s3 justify-center",
  destructive: "bg-transparent border border-err/35 text-err hover:bg-err/10",
  text: "bg-transparent text-fg-3 hover:text-fg hover:bg-s3",
  highlight: "bg-transparent text-fg font-[560] hover:bg-s3",
};

export function ActionButton({
  id,
  label,
  icon,
  variant = "secondary",
  tooltip,
  disabled = false,
  className = "",
  onClick,
  size = "md",
  iconClassName = "",
}: ActionButtonProps) {
  // Auto-detect icon-only if no label is provided (but preserve special variants)
  const effectiveVariant = !label && variant !== "icon-only" && variant !== "highlight" && variant !== "text" ? "icon-only" : variant;
  const dims = SIZES[size] ?? SIZES.md;
  const square = !label || effectiveVariant === "icon-only";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      id={id}
      onClick={handleClick}
      className={cn(
        "relative flex items-center justify-center whitespace-nowrap font-[520] rounded-md",
        "transition-[background-color,border-color,color,transform] duration-fast ease-out active:scale-[0.98]",
        square ? dims.square : dims.label,
        VARIANTS[effectiveVariant] ?? VARIANTS.secondary,
        disabled && "opacity-45 cursor-not-allowed active:scale-100",
        className,
      )}
      title={tooltip}
      disabled={disabled}
    >
      <span className={cn("flex items-center justify-center flex-shrink-0", dims.icon)}>
        <Icon icon={icon} className={cn(dims.icon, iconClassName)} />
      </span>
      {effectiveVariant !== "icon-only" && label && <span className="truncate">{label}</span>}
    </button>
  );
}
