"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { IconButton } from "./buttons/IconButton";

interface ModalProps {
  title: string;
  titleIcon?: React.ReactNode;
  titleSubtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnClickOutside?: boolean;
  hideCloseButton?: boolean;
  headerActions?: React.ReactNode;
  variant?: "default" | "flat" | "3d";
  className?: string;
  contentClassName?: string;
}

export function Modal({
  title,
  titleIcon,
  titleSubtitle,
  onClose,
  children,
  footer,
  width = "md",
  closeOnClickOutside = true,
  hideCloseButton = false,
  headerActions,
  variant = "default",
  className,
  contentClassName,
}: ModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isClosing) {
        handleClose();
      }
    };
    
    if (closeOnClickOutside !== false) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeOnClickOutside, isClosing]);

  useEffect(() => {
    const recordMouseDownTarget = (event: MouseEvent) => {
      mouseDownTargetRef.current = event.target;
    };

    document.addEventListener('mousedown', recordMouseDownTarget, true);

    return () => {
      document.removeEventListener('mousedown', recordMouseDownTarget, true);
      mouseDownTargetRef.current = null;
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (
      closeOnClickOutside &&
      e.target === modalRef.current &&
      mouseDownTargetRef.current === modalRef.current &&
      !isClosing
    ) {
      e.stopPropagation();
      handleClose();
    }
  };

  const widthClasses = {
    sm: "max-w-lg",
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw] w-full",
  };

  const getBorderClasses = () => {
    if (variant === "3d") {
      return "border";
    }
    return "border";
  };

  const getBoxShadow = () => {
    if (variant === "3d") {
      return `0 40px 90px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px -30px ${accentColor.shadowValue}`;
    }
    return "0 40px 90px -30px rgba(0,0,0,0.9)";
  };
  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md-anyos"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "relative flex flex-col w-full overflow-hidden max-h-[90vh] backdrop-blur-2xl",
          getBorderClasses(),
          variant === "3d" ? "shadow-2xl" : "",
          widthClasses[width],
          className,
        )}
        style={{
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(28,28,36,0.94), rgba(16,16,22,0.96))",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: getBoxShadow(),
        }}
      >
        <span
          className="absolute inset-x-10 top-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor.value}, transparent)` }}
        />

        <div
          ref={headerRef}
          className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0"
        >
          <div className="flex items-center space-x-3">
            {titleIcon && (
              <span className="text-white flex-shrink-0 flex items-center">
                {titleIcon}
              </span>
            )}
            <div className="flex flex-col">
              <h2 className="font-display text-lg font-semibold text-white">
                {title}
              </h2>
              {titleSubtitle && <div className="mt-0.5">{titleSubtitle}</div>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {headerActions}
            {!hideCloseButton && (
              <IconButton
                ref={closeButtonRef}
                icon={<Icon icon="solar:close-circle-bold" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                variant="ghost"
                size="sm"
                aria-label={t('common.close_modal')}
              />
            )}
          </div>
        </div>

        <div
          ref={contentRef}
          className={cn("flex-1 overflow-y-auto custom-scrollbar", contentClassName)}
        >
          {children}
        </div>

        {footer && (
          <div className="flex-shrink-0">
            <div className="border-t border-white/10 mx-6 mt-4 mb-4"></div>
            <div className="px-6 pb-4">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
