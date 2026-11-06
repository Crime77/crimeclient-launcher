"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../store/useThemeStore';
import { getAccessibilityProps } from './design-system';

interface ThemedSurfaceProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  surfaceRef?: React.Ref<HTMLDivElement>;
  alwaysActive?: boolean;
  baseColorHex?: string;
  borderVisibility?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
  };
  style?: React.CSSProperties;
  role?: string;
  ariaLabel?: string;
}

/**
 * "Werkzeug" surface: flat s1 with a hairline. Hover lifts it to s2 when it is clickable,
 * alwaysActive marks it as the selected one (s3, brighter line). baseColorHex, kept for old
 * call sites, only tints the hairline.
 */
export function ThemedSurface({
  children,
  className,
  onClick,
  onContextMenu,
  surfaceRef,
  alwaysActive = false,
  baseColorHex,
  borderVisibility,
  style: incomingStyle,
  role,
  ariaLabel,
}: ThemedSurfaceProps) {
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const accessibilityProps = getAccessibilityProps({
    label: ariaLabel
  });

  const isValidHex = (hex: string | undefined): hex is string => {
    if (!hex) return false;
    return /^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{8}$/i.test(hex);
  };

  const {
    top: showTopBorder = true,
    bottom: showBottomBorder = true,
    left: showLeftBorder = true,
    right: showRightBorder = true
  } = borderVisibility || {};

  const tint = isValidHex(baseColorHex) ? `${baseColorHex.substring(0, 7)}59` : undefined;
  const sideStyles: React.CSSProperties = {
    ...(tint ? { borderColor: tint } : {}),
    ...(showTopBorder ? {} : { borderTopColor: 'transparent' }),
    ...(showRightBorder ? {} : { borderRightColor: 'transparent' }),
    ...(showBottomBorder ? {} : { borderBottomColor: 'transparent' }),
    ...(showLeftBorder ? {} : { borderLeftColor: 'transparent' }),
  };

  return (
    <div
      ref={surfaceRef}
      role={role || (onClick ? "button" : undefined)}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "relative p-3 w-full select-none border transition-colors duration-fast ease-out",
        alwaysActive
          ? "bg-s3 border-line-3"
          : cn("bg-s1 border-line", onClick && "hover:bg-s2 hover:border-line-2"),
        onClick && "cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3",
        className
      )}
      style={{
        ...sideStyles,
        ...incomingStyle,
        borderRadius: borderRadius === 0 ? 0 : "var(--r-lg)",
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...accessibilityProps}
    >
      {children}
    </div>
  );
}
