"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant,
} from "../design-system";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  /** kept for old call sites; the flat design has no button shadows */
  shadowDepth?: "default" | "short" | "none";
  widthClassName?: string;
  heightClassName?: string;
  label?: string;
  description?: string;
}

// heights 28 / 32 / 36 / 44 / 48 px
const SIZES: Record<ComponentSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5",
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  xl: "h-12 px-6 text-[15px] gap-2.5",
};

// state variants: coloured text and a hairline in the state colour, filled only on hover
const STATE: Partial<Record<ComponentVariant, string>> = {
  warning: "text-warn border-warn/35 hover:bg-warn/10",
  destructive: "text-err border-err/35 hover:bg-err/10",
  info: "text-info border-info/35 hover:bg-info/10",
  success: "text-ok border-ok/35 hover:bg-ok/10",
};

function variantClasses(variant: ComponentVariant): string {
  switch (variant) {
    case "default":
    case "3d":
    case "elevated":
      // the accent, solid; the only loud button
      return "cc-btn-primary border-transparent";
    case "ghost":
      return "bg-transparent border-transparent text-fg-2 hover:text-fg hover:bg-s3";
    case "flat":
    case "flat-secondary":
    case "secondary":
      return "bg-s3 border-line-2 text-fg hover:bg-s4 hover:border-line-3";
    default:
      return cn("bg-transparent", STATE[variant] ?? "border-line-2 text-fg hover:bg-s3");
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      disabled = false,
      icon,
      iconPosition = "left",
      shadowDepth: _shadowDepth,
      onClick,
      widthClassName,
      heightClassName,
      label,
      description,
      style,
      ...props
    },
    ref,
  ) => {
    const borderRadius = useThemeStore((state) => state.borderRadius);
    const accessibilityProps = getAccessibilityProps({ label, description, disabled });

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap border font-medium",
          "transition-[background-color,border-color,color,transform] duration-fast ease-out",
          "active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3",
          "disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100",
          SIZES[size] ?? SIZES.md,
          variantClasses(variant),
          widthClassName,
          heightClassName,
          className,
        )}
        style={{ borderRadius: borderRadius === 0 ? 0 : "var(--r-md)", ...style }}
        onClick={(e) => {
          if (!disabled) onClick?.(e);
        }}
        {...accessibilityProps}
        {...props}
      >
        {icon && iconPosition === "left" && <span className="flex items-center shrink-0">{icon}</span>}
        {children !== undefined && children !== null && children !== false && <span className="truncate">{children}</span>}
        {icon && iconPosition === "right" && <span className="flex items-center shrink-0">{icon}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";
