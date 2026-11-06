"use client";

import type React from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  variant?:
    | "default"
    | "secondary"
    | "warning"
    | "destructive"
    | "info"
    | "success";
  message?: string;
  showMessage?: boolean;
  shadowDepth?: "default" | "short" | "none";
}

// ring diameter / stroke (px)
const SIZES = {
  xs: { d: 12, w: 1.5, text: "text-[11px]", gap: "mt-2" },
  sm: { d: 14, w: 1.5, text: "text-xs", gap: "mt-2" },
  md: { d: 18, w: 1.5, text: "text-xs", gap: "mt-2.5" },
  lg: { d: 22, w: 2, text: "text-[13px]", gap: "mt-3" },
  xl: { d: 28, w: 2, text: "text-[13px]", gap: "mt-3" },
  xxl: { d: 32, w: 2, text: "text-[13px]", gap: "mt-3" },
} as const;

const ARC: Record<NonNullable<LoadingSpinnerProps["variant"]>, string> = {
  default: "var(--fg-3)",
  secondary: "var(--fg-3)",
  warning: "var(--warn)",
  destructive: "var(--err)",
  info: "var(--info)",
  success: "var(--ok)",
};

/** "Werkzeug" loading: a thin ring on a hairline track, an optional fg-3 line below. */
export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = "md",
      variant = "default",
      message,
      showMessage = true,
      className,
      shadowDepth = "short",
      ...props
    },
    ref,
  ) => {
    const dims = SIZES[size] ?? SIZES.md;

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center",
          shadowDepth !== "none" && "p-4",
          className,
        )}
        {...props}
      >
        <span
          className="block rounded-full animate-spin"
          style={{
            width: dims.d,
            height: dims.d,
            borderWidth: dims.w,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderTopColor: ARC[variant] ?? ARC.default,
          }}
          role="status"
          aria-label={message || "Loading"}
        />

        {showMessage && message && (
          <p className={cn("text-center text-fg-3", dims.text, dims.gap)}>
            {message}
          </p>
        )}
      </div>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";
