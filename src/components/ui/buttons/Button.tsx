"use client";

import type React from "react";
import { forwardRef, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";
import { 
  getVariantColors,
  getSizeClasses,
  getBorderRadiusClass,
  getAccessibilityProps,
  createRadiusStyle,
  type ComponentSize,
  type ComponentVariant
} from "../design-system";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ComponentVariant;
  size?: ComponentSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  shadowDepth?: "default" | "short" | "none";
  widthClassName?: string;
  heightClassName?: string;
  label?: string;
  description?: string;
}

interface RippleType {
  x: number;
  y: number;
  size: number;
  id: number;
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
      shadowDepth = "short",
      onClick,
      widthClassName,
      heightClassName,
      label,
      description,
      ...props
    },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const accentColor = useThemeStore((state) => state.accentColor);
    const borderRadius = useThemeStore((state) => state.borderRadius);
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
    };

    const handleMouseLeave = () => {
      if (disabled) return;
      setIsHovered(false);

      if (isPressed) {
        handleMouseUp();
      }
    };

    const colors = getVariantColors(variant, accentColor);
    
    const getButtonSizeClasses = () => {
      switch (size) {
        case "xs": return "h-[32px] px-3.5 text-xs";
        case "sm": return "h-[38px] px-4 text-[13px]";
        case "md": return "h-[44px] px-5 text-sm";
        case "lg": return "h-[52px] px-7 text-base";
        case "xl": return "h-[60px] px-9 text-lg";
        default: return "h-[44px] px-5 text-sm";
      }
    };
    
    const sizeClasses = getButtonSizeClasses();
    const radiusClass = getBorderRadiusClass(borderRadius);
    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      disabled
    });    // CrimeClient look: accent gradient for primary buttons, frosted glass for secondary ones,
    // tinted glass for status variants.
    const getVisual = (): React.CSSProperties => {
      const primary = variant === "default" || variant === "3d" || variant === "elevated";
      if (primary) {
        return {
          background: `linear-gradient(135deg, ${accentColor.light ?? colors.light} 0%, ${colors.main} 50%, ${accentColor.dark ?? colors.dark} 100%)`,
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            shadowDepth === "none"
              ? "inset 0 1px 0 rgba(255,255,255,0.3)"
              : `0 10px 24px -12px ${accentColor.shadowValue}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          color: "#fff",
        };
      }
      if (variant === "ghost") {
        return {
          background: isHovered ? "rgba(255,255,255,0.08)" : "transparent",
          border: "1px solid transparent",
          color: "#fff",
        };
      }
      if (variant === "flat" || variant === "flat-secondary" || variant === "secondary") {
        return {
          background: isHovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "#fff",
        };
      }
      return {
        background: `${colors.main}${isHovered ? "33" : "22"}`,
        border: `1px solid ${colors.main}55`,
        color: colors.light,
      };
    };

    return (
      <button
        ref={mergedRef}
        type="button"
        disabled={disabled}        className={cn(
          "relative overflow-hidden font-semibold tracking-normal transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          "flex items-center justify-center gap-2 backdrop-blur-md whitespace-nowrap",
          radiusClass,
          sizeClasses,
          disabled && "opacity-50 cursor-not-allowed",
          widthClassName,
          heightClassName,
          className,
        )}
        style={{
          ...getVisual(),
          transform: isPressed ? "translateY(1px)" : "translateY(0)",
          filter: isHovered && !disabled ? "brightness(1.08)" : "brightness(1)",
          ...createRadiusStyle(borderRadius),
        }}
        onClick={handleRipple}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...accessibilityProps}
        {...props}      >        {icon && iconPosition === "left" && (
          <span className="flex items-center transition-transform duration-200" style={{
            transform: "none",
          }}>{icon}</span>
        )}
        <span className="transition-transform duration-200" style={{
          transform: "none",
        }}>
          {children}
        </span>
        {icon && iconPosition === "right" && (
          <span className="flex items-center transition-transform duration-200" style={{
            transform: "none",
          }}>{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
