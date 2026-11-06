"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant
} from "../design-system";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  displayVariant?: "button" | "ghost" | "themed-surface";
  size?: ComponentSize;
  icon: React.ReactNode;
  shadowDepth?: "default" | "short" | "none";
  label?: string;
  description?: string;
}

// square sizes 28 / 32 / 36 / 40 / 44 px; the icon box inside
const SIZES: Record<ComponentSize, { box: string; icon: string }> = {
  xs: { box: "h-7 w-7", icon: "w-4 h-4" },
  sm: { box: "h-8 w-8", icon: "w-4 h-4" },
  md: { box: "h-9 w-9", icon: "w-4 h-4" },
  lg: { box: "h-10 w-10", icon: "w-[18px] h-[18px]" },
  xl: { box: "h-11 w-11", icon: "w-5 h-5" },
};

// state variants colour only the icon and the hairline
const STATE: Partial<Record<ComponentVariant, string>> = {
  warning: "text-warn border-warn/35 hover:bg-warn/10",
  destructive: "text-err border-err/35 hover:bg-err/10",
  info: "text-info border-info/35 hover:bg-info/10",
  success: "text-ok border-ok/35 hover:bg-ok/10",
};

function look(variant: ComponentVariant, displayVariant: IconButtonProps["displayVariant"]): string {
  if (displayVariant === "ghost") {
    return "bg-transparent border-transparent text-fg-3 hover:text-fg hover:bg-s3";
  }
  switch (variant) {
    case "flat":
    case "flat-secondary":
    case "secondary":
      return "bg-s3 border-line-2 text-fg-2 hover:text-fg hover:bg-s4 hover:border-line-3";
    case "warning":
    case "destructive":
    case "info":
    case "success":
      return cn("bg-transparent", STATE[variant]);
    default:
      // "default", "ghost", "3d", "elevated": an icon button is quiet unless asked otherwise
      return displayVariant === "themed-surface"
        ? "bg-s1 border-line text-fg-2 hover:text-fg hover:bg-s2 hover:border-line-2"
        : "bg-transparent border-transparent text-fg-3 hover:text-fg hover:bg-s3";
  }
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = "default",
      displayVariant = "button",
      size = "md",
      disabled = false,
      icon,
      shadowDepth: _shadowDepth,
      onClick,
      label,
      description,
      style,
      ...props
    },
    ref,
  ) => {
    const borderRadius = useThemeStore((state) => state.borderRadius);
    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      disabled
    });
    const dims = SIZES[size] ?? SIZES.md;

    return (
      <button
        ref={ref}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          if (onClick) onClick(e);
        }}
        className={cn(
          "relative flex items-center justify-center flex-shrink-0 border",
          "transition-[background-color,border-color,color,transform] duration-fast ease-out",
          "active:scale-[0.96] focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          look(variant, displayVariant),
          dims.box,
          className,
        )}
        style={{ borderRadius: borderRadius === 0 ? 0 : "var(--r-md)", ...style }}
        {...accessibilityProps}
        {...props}
      >
        <span
          className={cn("relative flex items-center justify-center", dims.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
