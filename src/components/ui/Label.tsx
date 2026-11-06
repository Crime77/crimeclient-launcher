"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { cn } from "../../lib/utils";

interface LabelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "ghost"
    | "warning"
    | "destructive"
    | "info"
    | "success"
    | "flat"
    | "3d";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  withAnimation?: boolean;
}

// "Werkzeug" label: a flat s3 chip with fg-2 text; state variants colour text and hairline only
const SIZES = {
  xs: { box: "h-5 px-1.5 text-[11px] gap-1", icon: "w-3 h-3" },
  sm: { box: "h-6 px-2 text-xs gap-1.5", icon: "w-3.5 h-3.5" },
  md: { box: "h-7 px-2.5 text-xs gap-1.5", icon: "w-3.5 h-3.5" },
  lg: { box: "h-8 px-3 text-[13px] gap-2", icon: "w-4 h-4" },
  xl: { box: "h-9 px-3.5 text-[13px] gap-2", icon: "w-4 h-4" },
} as const;

const VARIANTS: Record<NonNullable<LabelProps["variant"]>, string> = {
  default: "bg-s3 border-transparent text-fg-2",
  flat: "bg-s3 border-transparent text-fg-2",
  "3d": "bg-s3 border-line-2 text-fg-2",
  secondary: "bg-s2 border-line text-fg-3",
  ghost: "bg-transparent border-transparent text-fg-2",
  warning: "bg-transparent border-warn/35 text-warn",
  destructive: "bg-transparent border-err/35 text-err",
  info: "bg-transparent border-info/35 text-info",
  success: "bg-transparent border-ok/35 text-ok",
};

export const Label = forwardRef<HTMLDivElement, LabelProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "md",
      icon,
      iconPosition = "left",
      withAnimation = true,
      ...props
    },
    ref,
  ) => {
    const labelRef = useRef<HTMLDivElement>(null);

    const mergedRef = (node: HTMLDivElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      labelRef.current = node;
    };

    const dims = SIZES[size] ?? SIZES.md;

    return (
      <div
        ref={mergedRef}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap border rounded-sm font-[520]",
          VARIANTS[variant] ?? VARIANTS.default,
          dims.box,
          className,
        )}
        {...props}
      >
        {icon && iconPosition === "left" && (
          <span className={cn("flex items-center justify-center flex-shrink-0", dims.icon)}>
            {icon}
          </span>
        )}
        <span className="relative">{children}</span>
        {icon && iconPosition === "right" && (
          <span className={cn("flex items-center justify-center flex-shrink-0", dims.icon)}>
            {icon}
          </span>
        )}
      </div>
    );
  },
);

Label.displayName = "Label";
