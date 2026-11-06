"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "@iconify/react";

import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** a lucide element, or an iconify name for the few icons lucide does not have */
  icon: ReactNode | string;
  label: string;
  tone?: "default" | "danger";
  /** "overlay" sits on a picture: a dark backing keeps it readable */
  surface?: "plain" | "overlay";
  tooltipPosition?: "top" | "bottom";
  withTooltip?: boolean;
}

/** Small square icon button of the clips area (28 px, flat). */
export function ClipIconButton({
  icon,
  label,
  tone = "default",
  surface = "plain",
  tooltipPosition = "bottom",
  withTooltip = true,
  className,
  disabled,
  ...rest
}: Props) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors duration-fast",
        surface === "overlay"
          ? "bg-black/60 text-fg enabled:hover:bg-black/80"
          : "text-fg-2 enabled:hover:bg-s3 enabled:hover:text-fg",
        tone === "danger" && "enabled:hover:bg-err/10 enabled:hover:text-err",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
      {...rest}
    >
      {typeof icon === "string" ? (
        <Icon icon={icon} className="pointer-events-none h-4 w-4" />
      ) : (
        <span className="pointer-events-none flex">{icon}</span>
      )}
    </button>
  );

  if (!withTooltip) return button;

  return (
    <Tooltip content={label} position={tooltipPosition}>
      {button}
    </Tooltip>
  );
}
