"use client";

import type React from "react";
import { forwardRef, type ReactNode, useRef } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentVariant
} from "./design-system";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: ComponentVariant;
  withAnimation?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  role?: string;
  ariaLabel?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    variant = "default",
    withAnimation = true,
    onClick,
    onContextMenu,
    role,
    ariaLabel,
  },
  ref,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const borderRadius = useThemeStore((state) => state.borderRadius);

  const mergedRef = (node: HTMLDivElement) => {
    if (ref) {
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
    cardRef.current = node;
  };

  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel,
    disabled: false
  });

  // "Werkzeug": a flat s1 panel with a hairline; status variants colour only the hairline
  const STATUS_BORDER: Partial<Record<ComponentVariant, string>> = {
    warning: "border-warn/30",
    destructive: "border-err/30",
    info: "border-info/30",
    success: "border-ok/30",
  };
  const statusBorder = STATUS_BORDER[variant];

  return (
    <div
      ref={mergedRef}
      role={role || (onClick ? "button" : undefined)}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative overflow-hidden bg-s1 border transition-colors duration-fast ease-out",
        statusBorder ?? "border-line",
        onClick && "cursor-pointer hover:bg-s2 focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3",
        onClick && !statusBorder && "hover:border-line-2",
        className,
      )}
      style={{ borderRadius: borderRadius === 0 ? 0 : "var(--r-lg)" }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...accessibilityProps}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";
