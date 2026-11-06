"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

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

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/65 animate-in fade-in duration-150"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "cc-pop relative flex flex-col w-full overflow-hidden max-h-[88vh] border",
          widthClasses[width],
          className,
        )}
        style={{
          borderRadius: "var(--r-lg)",
          background: "var(--s1)",
          borderColor: "var(--line-2)",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <div
          ref={headerRef}
          className="flex items-center justify-between gap-4 pl-5 pr-3 h-14 border-b border-line flex-shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            {titleIcon && (
              <span className="text-fg-2 flex-shrink-0 flex items-center">
                {titleIcon}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="font-display text-[15px] font-semibold text-fg truncate">
                {title}
              </h2>
              {titleSubtitle && <div className="text-xs text-fg-3 truncate">{titleSubtitle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {headerActions}
            {!hideCloseButton && (
              <button
                ref={closeButtonRef}
                type="button"
                className="cc-icon-btn w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label={t('common.close_modal')}
              >
                <X size={16} />
              </button>
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
          <div className="flex-shrink-0 border-t border-line px-5 py-3 bg-[rgb(14_14_15/0.4)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
