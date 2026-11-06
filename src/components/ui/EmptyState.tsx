"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon?: string;
  message: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  fullHeight?: boolean;
  compact?: boolean;
  /**
   * Render the description one step below the message instead of at the same
   * size. Opt-in so existing empty states are untouched: today the description
   * is `text-2xl` in both the compact and the regular branch, i.e. exactly as
   * large as the heading above it, which looks like an oversight rather than a
   * decision worth propagating silently.
   */
  smallDescription?: boolean;
  onIconClick?: () => void;
}

/** "Werkzeug" empty state: a small quiet icon, one line of fg-2, one of fg-3, optionally an action. */
export function EmptyState({
  icon = "solar:info-circle-bold",
  message,
  description,
  className,
  action,
  fullHeight = true,
  compact = false,
  smallDescription = false,
  onIconClick,
}: EmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [isDelayedContentVisible, setIsDelayedContentVisible] = useState(false);

  useEffect(() => {
    const contentTimer = setTimeout(() => {
      setIsDelayedContentVisible(true);
    }, 150);
    return () => {
      clearTimeout(contentTimer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "cc-enter flex flex-col items-center justify-center text-center",
        compact ? "p-4" : "p-8",
        fullHeight ? "h-full w-full" : "auto",
        className,
      )}
    >
      <div
        ref={iconRef}
        className={cn(
          "flex items-center justify-center text-fg-3",
          compact ? "mb-2.5" : "mb-3",
          onIconClick ? "cursor-pointer hover:text-fg-2 transition-colors duration-fast" : ""
        )}
        onClick={onIconClick}
      >
        <Icon icon={icon} className={compact ? "w-5 h-5" : "w-6 h-6"} />
      </div>

      <p className="text-[13px] font-[520] text-fg-2 max-w-md">
        {message}
      </p>

      {description && (
        <p
          className={cn(
            "text-fg-3 max-w-md mt-1",
            smallDescription ? "text-xs" : "text-[13px]",
          )}
        >
          {description}
        </p>
      )}

      {action && isDelayedContentVisible && (
        <div className={cn("animate-in fade-in-0 duration-200", compact ? "mt-3" : "mt-4")}>
          {action}
        </div>
      )}
    </div>
  );
}
