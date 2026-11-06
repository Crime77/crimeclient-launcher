"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";
import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  variant?:
    | "default"
    | "secondary"
    | "warning"
    | "destructive"
    | "info"
    | "success";
  size?: "sm" | "md" | "lg";
  shadowDepth?: "default" | "short" | "none";
  showProgressBar?: boolean;
  progress?: number;
  isLoading?: boolean;
}

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(
  (
    {
      message = "Loading...",
      className,
      variant = "default",
      size = "md",
      shadowDepth = "default",
      showProgressBar = true,
      progress = -1,
      isLoading = true,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const isBackgroundAnimationEnabled = useThemeStore(
      (state) => state.isBackgroundAnimationEnabled,
    );
    const [isVisible, setIsVisible] = useState(isLoading);

    const mergedRef = (node: HTMLDivElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      containerRef.current = node;
    };

    useEffect(() => {
      if (containerRef.current && isBackgroundAnimationEnabled) {
        gsap.set(containerRef.current, { y: 0, opacity: 1 });
      }
    }, [isBackgroundAnimationEnabled]);

    useEffect(() => {
      if (!containerRef.current) return;

      if (isLoading) {
        setIsVisible(true);
        gsap.to(containerRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        });
      } else {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => setIsVisible(false),
        });
      }
    }, [isLoading]);

    useEffect(() => {
      if (progressRef.current && progress >= 0 && showProgressBar) {
        gsap.to(progressRef.current, {
          width: `${Math.min(100, progress)}%`,
          duration: 0.4,
          ease: "power1.out",
        });
      }
    }, [progress, showProgressBar]);

    const sizeStyles = (() => {
      switch (size) {
        case "sm":
          return { container: "p-3", spinner: "sm", text: "text-xs" };
        case "lg":
          return { container: "p-6", spinner: "lg", text: "text-[13px]" };
        default:
          return { container: "p-4", spinner: "md", text: "text-xs" };
      }
    })();

    if (!isVisible) return null;

    return (
      <div
        ref={mergedRef}
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          sizeStyles.container,
          className,
        )}
        {...props}
      >
        <LoadingSpinner
          variant={variant}
          size={sizeStyles.spinner as any}
          shadowDepth="none"
        />

        <p className={cn("text-center text-fg-3", sizeStyles.text)}>
          {message}
        </p>

        {showProgressBar && (
          <div className="w-full max-w-[240px] h-[2px] overflow-hidden rounded-full bg-s4">
            <div
              ref={progressRef}
              className="h-full rounded-full bg-accent"
              style={{
                width: progress >= 0 ? `${Math.min(100, progress)}%` : "30%",
                animation:
                  progress < 0 ? "loading-bar 2s ease-in-out infinite" : "none",
              }}
            ></div>
          </div>
        )}
      </div>
    );
  },
);

LoadingState.displayName = "LoadingState";
