"use client";

import type React from "react";
import { forwardRef, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../../store/useThemeStore";
import { ThemedSurface } from "../ThemedSurface";
import { 
  getVariantColors,
  getSizeClasses,
  getBorderRadiusClass,
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

interface RippleType {
  x: number;
  y: number;
  size: number;
  id: number;
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
      shadowDepth = "short",
      onClick,
      label,
      description,
      ...props
    },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ripples, setRipples] = useState<RippleType[]>([]);
    const rippleCounter = useRef(0);
    const accentColor = useThemeStore((state) => state.accentColor);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const mergedRef = (node: HTMLButtonElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      buttonRef.current = node;
    };

    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (onClick) onClick(e);
    };

    const handleMouseDown = () => {
      if (disabled) return;
      setIsPressed(true);
    };

    const handleMouseUp = () => {
      if (disabled) return;
      setIsPressed(false);
    };

    const handleMouseEnter = () => {
      if (disabled) return;
      setIsHovered(true);

      if (
        buttonRef.current &&
        isBackgroundAnimationEnabled &&
        shouldShowShadow()
      ) {
        gsap.to(buttonRef.current, {
          boxShadow: `0 14px 34px -18px rgba(0,0,0,0.85)`,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    };

    const handleMouseLeave = () => {
      if (disabled) return;
      setIsHovered(false);

      if (
        buttonRef.current &&
        isBackgroundAnimationEnabled &&
        shouldShowShadow()
      ) {
        gsap.to(buttonRef.current, {
          boxShadow: `0 10px 30px -18px rgba(0,0,0,0.8)`,
          duration: 0.2,
          ease: "power2.out",
        });
      }

      if (isPressed) {
        handleMouseUp();
      }
    };

    // the chunky 3D drop shadow is gone in the CrimeClient design
    const shouldShowShadow = () => false;    const colors = getVariantColors(variant, accentColor);
    const radiusClass = getBorderRadiusClass();
    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      disabled
    });    const getIconButtonSizeClasses = () => {
      switch (size) {
        case "xs": return "h-[32px] w-[32px] p-2 text-xs";
        case "sm": return "h-[38px] w-[38px] p-2.5 text-xs";
        case "md": return "h-[44px] w-[44px] p-3 text-sm";
        case "lg": return "h-[52px] w-[52px] p-3.5 text-base";
        case "xl": return "h-[60px] w-[60px] p-4 text-base";
        default: return "h-[50px] w-[50px] p-3 text-sm";
      }
    };

    const sizeClasses = getIconButtonSizeClasses();

    const getIconSize = () => {
      switch (size) {
        case "xs": return "w-4 h-4";
        case "sm": return "w-5 h-5";
        case "md": return "w-6 h-6";
        case "lg": return "w-7 h-7";
        case "xl": return "w-8 h-8";
        default: return "w-6 h-6";
      }
    };

    const getBackgroundColor = () => {
      if (displayVariant === "ghost" || displayVariant === "themed-surface")
        return "transparent";

      if (variant === "ghost") {
        return isHovered ? `rgba(255, 255, 255, 0.1)` : "transparent";
      }

      if (variant === "flat" || variant === "flat-secondary" || variant === "secondary") {
        return isHovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)";
      }

      return `${colors.main}${isHovered ? "3a" : "22"}`;
    };

    const getBorderColor = () => {
      if (displayVariant === "ghost" || displayVariant === "themed-surface")
        return "transparent";

      if (variant === "ghost") {
        return "transparent";
      }

      if (variant === "flat" || variant === "flat-secondary" || variant === "secondary") {
        return "rgba(255,255,255,0.09)";
      }

      return `${colors.main}${isHovered ? "80" : "50"}`;
    };

    const getBorderBottomColor = () => {
      if (displayVariant === "ghost" || displayVariant === "themed-surface")
        return "transparent";

      if (variant === "ghost") {
        return "transparent";
      }

      return getBorderColor();
    };

    const getBoxShadow = () => {
      if (
        displayVariant === "ghost" ||
        displayVariant === "themed-surface" ||
        variant !== "3d" ||
        shadowDepth === "none"
      ) {
        return "none";
      }

      const part1Y = shadowDepth === "short" ? "4px" : "8px";
      const part2Y = shadowDepth === "short" ? "6px" : "10px";
      const part2Blur = shadowDepth === "short" ? "10px" : "15px";

      return `inset 0 1px 0 rgba(255,255,255,0.08)`;
    };

    const getBorderClasses = () => {
      if (displayVariant === "ghost" || displayVariant === "themed-surface") {
        return "";
      }

      if (variant === "ghost") {
        return "";
      }

      return "border";
    };

    const getShadowClasses = () => {
      if (
        displayVariant === "ghost" ||
        displayVariant === "themed-surface" ||
        variant !== "3d" ||
        shadowDepth === "none"
      ) {
        return "";
      }

      return "";
    };

    const buttonElement = (
      <button
        ref={mergedRef}
        disabled={disabled}
        onClick={handleRipple}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative overflow-hidden backdrop-blur-md",
          "rounded-md text-white",
          "flex items-center justify-center transition-colors duration-150",
          getBorderClasses(),
          getShadowClasses(),
          "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-black/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          displayVariant !== "themed-surface" && sizeClasses,
          className,
        )}
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderBottomColor: getBorderBottomColor(),
          boxShadow: getBoxShadow(),
          color: colors.text,
          filter: isHovered && !disabled ? "brightness(1.1)" : "brightness(1)",
        }}
        {...props}
      >
        <span
          className={cn(
            "relative z-10 flex items-center justify-center transition-transform duration-200",
            getIconSize(),
          )}
          style={{
            transform: "none",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </button>
    );

    if (displayVariant === "themed-surface") {
      const surfaceBaseColorHex =
        variant === "default" || variant === "ghost" ? undefined : colors.main;      return (
        <ThemedSurface
          baseColorHex={surfaceBaseColorHex}
          className={cn(sizeClasses, "!p-0", className)}
        >
          {buttonElement}
        </ThemedSurface>
      );
    }

    return buttonElement;
  },
);

IconButton.displayName = "IconButton";
