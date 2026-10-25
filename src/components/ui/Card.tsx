"use client";

import type React from "react";
import { forwardRef, type ReactNode, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { 
  getVariantColors,
  getBorderRadiusClass,
  createRadiusStyle,
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
  const accentColor = useThemeStore((state) => state.accentColor);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [isHovered, setIsHovered] = useState(false);

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

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const colors = getVariantColors(variant, accentColor);
  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel,
    disabled: false
  });

  // CrimeClient: neutral frosted glass; status variants keep a light tint of their colour
  const isStatus = ["warning", "destructive", "info", "success"].includes(variant);

  const getBoxShadow = () =>
    variant === "elevated" || variant === "3d"
      ? "0 18px 40px -24px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "inset 0 1px 0 rgba(255,255,255,0.04)";

  const getBorderStyle = () => "border";

  const getBackgroundColor = () => {
    if (isStatus) return `${colors.main}${isHovered && onClick ? "26" : "1a"}`;
    return isHovered && onClick ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.04)";
  };

  const getBorderColor = () => (isStatus ? `${colors.main}55` : "rgba(255,255,255,0.08)");

  const getBorderBottomColor = getBorderColor;

  return (
    <div
      ref={mergedRef}
      role={role || (onClick ? "button" : undefined)}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative backdrop-blur-md overflow-hidden",
        getBorderRadiusClass(borderRadius),
        getBorderStyle(),
        onClick && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2",
        className,
      )}
      style={{
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        borderBottomColor: getBorderBottomColor(),
        boxShadow: getBoxShadow(),
        ...createRadiusStyle(borderRadius, 1.2),
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={onContextMenu}
      {...accessibilityProps}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";
