"use client";

import type React from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
  message?: string;
  variant?:
    | "default"
    | "secondary"
    | "warning"
    | "destructive"
    | "info"
    | "success";
  size?: "sm" | "md" | "lg" | "xl";
  shadowDepth?: "default" | "short" | "none";
  showProgressBar?: boolean;
  progress?: number;
}

export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      isLoading,
      message = "Loading content...",
      className,
      variant = "default",
      size = "md",
      shadowDepth = "default",
      showProgressBar = true,
      progress = -1,
      ...props
    },
    ref,
  ) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);
    const [isVisible, setIsVisible] = useState(isLoading);

    const mergedRef = (node: HTMLDivElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      overlayRef.current = node;
    };

    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      const overlay = overlayRef.current;
      const content = contentRef.current;

      if (!overlay || !content) return;

      const tl = gsap.timeline();

      if (isLoading) {
        setIsVisible(true);
        tl.set(overlay, { display: "flex", opacity: 1 }).set(content, {
          scale: 1,
          y: 0,
          opacity: 1,
        });
      } else {
        tl.to(content, {
          y: 4,
          opacity: 0,
          duration: 0.18,
          ease: "power2.in",
        })
          .to(
            overlay,
            { opacity: 0, duration: 0.18, ease: "power2.in" },
            "-=0.06",
          )
          .set(overlay, { display: "none" })
          .call(() => setIsVisible(false));
      }

      return () => {
        tl.kill();
      };
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
          return { container: "px-5 py-4 max-w-sm", spinner: "sm", text: "text-xs" };
        case "lg":
          return { container: "px-7 py-6 max-w-2xl", spinner: "lg", text: "text-[13px]" };
        case "xl":
          return { container: "px-8 py-7 max-w-3xl", spinner: "xl", text: "text-sm" };
        default:
          return { container: "px-6 py-5 max-w-lg", spinner: "md", text: "text-[13px]" };
      }
    })();

    if (!isVisible) return null;

    return (
      <div
        ref={mergedRef}
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center transition-opacity",
          className,
        )}
        style={{ backgroundColor: "rgba(14, 14, 15, 0.78)" }}
        {...props}
      >
        <div
          ref={contentRef}
          className={cn(
            "relative overflow-hidden min-w-[220px]",
            shadowDepth !== "none" && "bg-s1 border border-line-2 shadow-pop",
            sizeStyles.container,
          )}
          style={{ borderRadius: "var(--r-lg)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner
              variant={variant}
              size={sizeStyles.spinner as any}
              shadowDepth="none"
            />

            <p className={cn("text-center text-fg-2", sizeStyles.text)}>
              {message}
            </p>

            {showProgressBar && (
              <div className="w-full h-[2px] overflow-hidden rounded-full bg-s4">
                <div
                  ref={progressRef}
                  className="h-full rounded-full bg-accent"
                  style={{
                    width:
                      progress >= 0 ? `${Math.min(100, progress)}%` : "30%",
                    animation:
                      progress < 0
                        ? "loading-bar 2s ease-in-out infinite"
                        : "none",
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

LoadingOverlay.displayName = "LoadingOverlay";
