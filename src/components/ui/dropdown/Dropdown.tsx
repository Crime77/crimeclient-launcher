"use client";

import type React from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/utils";
import { useThemeStore } from "../../../store/useThemeStore";
import { getAccessibilityProps } from "../design-system";

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  width?: number;
  className?: string;
  children: React.ReactNode;
  position?: "bottom" | "top" | "left" | "right";
  role?: string;
  ariaLabel?: string;
  align?: "center" | "start";
  offset?: number;
}

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      isOpen,
      onClose,
      triggerRef,
      width = 300,
      className,
      children,
      position = "bottom",
      role = "menu",
      ariaLabel,
      align = "center",
      offset = 12,
    },
    ref,
  ) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownTop, setDropdownTop] = useState<number>(0);
    const [dropdownLeft, setDropdownLeft] = useState<number>(0);
    const [animationState, setAnimationState] = useState<
      "entering" | "entered" | "exiting" | "exited"
    >("exited");
    const borderRadius = useThemeStore((state) => state.borderRadius);
    const previousIsOpen = useRef(isOpen);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [dropdownHeight, setDropdownHeight] = useState(300);

    const accessibilityProps = getAccessibilityProps({
      label: ariaLabel
    });

    useEffect(() => {
      setIsMounted(true);
      return () => {
        setIsMounted(false);
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      if (isOpen !== previousIsOpen.current) {
        if (isOpen) {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }

          setAnimationState("entering");
          setTimeout(() => {
            if (isMounted) {
              setAnimationState("entered");
            }
          }, 10);
        } else if (
          animationState === "entered" ||
          animationState === "entering"
        ) {
          setAnimationState("exiting");

          closeTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setAnimationState("exited");
            }
            closeTimeoutRef.current = null;
          }, 200);
        }

        previousIsOpen.current = isOpen;
      }    }, [isOpen, animationState, isMounted]);

    useEffect(() => {
      if (isOpen && dropdownRef.current && animationState === "entered") {
        const height = dropdownRef.current.offsetHeight;
        setDropdownHeight(height);
        calculatePosition(height);
      }
    }, [isOpen, animationState]);

    const calculatePosition = useCallback(
      (actualHeight?: number) => {
        if (!isOpen || !triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;

        const estimatedHeight = actualHeight || Math.min(400, dropdownHeight);

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        let effectivePosition = position;
        if (
          position === "bottom" &&
          spaceBelow < estimatedHeight &&
          spaceAbove > estimatedHeight
        ) {
          effectivePosition = "top";
        } else if (
          position === "top" &&
          spaceAbove < estimatedHeight &&
          spaceBelow > estimatedHeight
        ) {
          effectivePosition = "bottom";
        }

        switch (effectivePosition) {
          case "bottom":
            top = rect.bottom + scrollY + offset;
            left = align === "start" ? rect.left + scrollX : rect.left + scrollX + rect.width / 2 - width / 2;
            break;
          case "top":
            top = rect.top + scrollY - estimatedHeight - offset;
            left = align === "start" ? rect.left + scrollX : rect.left + scrollX + rect.width / 2 - width / 2;
            break;
          case "left":
            top = rect.top + scrollY + rect.height / 2 - estimatedHeight / 2;
            left = rect.left + scrollX - width - offset;
            break;
          case "right":
            top = rect.top + scrollY + rect.height / 2 - estimatedHeight / 2;
            left = rect.right + scrollX + offset;
            break;        }

        const padding = 16;
        left = Math.max(padding + scrollX, left);
        left = Math.min(left, viewportWidth + scrollX - width - padding);

        top = Math.max(padding + scrollY, top);

        if (top + estimatedHeight > viewportHeight + scrollY - padding) {
          if (rect.top - estimatedHeight - offset > padding) {
            top = rect.top + scrollY - estimatedHeight - offset;
          } else {
            top = viewportHeight + scrollY - estimatedHeight - padding;
          }
        }

        setDropdownTop(top);
        setDropdownLeft(left);
      },
      [isOpen, triggerRef, width, position, dropdownHeight, align, offset],
    );

    useEffect(() => {
      const handleResizeOrScroll = () => calculatePosition();

      if (isOpen) {
        calculatePosition();
        window.addEventListener("resize", handleResizeOrScroll);
        window.addEventListener("scroll", handleResizeOrScroll, true);
      }

      return () => {
        window.removeEventListener("resize", handleResizeOrScroll);
        window.removeEventListener("scroll", handleResizeOrScroll, true);
      };
    }, [isOpen, calculatePosition]);
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      if (isOpen) {
        setTimeout(() => {
          document.addEventListener("mousedown", handleClickOutside);
        }, 0);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen, onClose, triggerRef]);

    if (!isMounted || animationState === "exited") {
      return null;
    }

    const getAnimationClasses = () => {
      switch (position) {
        case "bottom":
          return {
            entering: "opacity-0 translate-y-[-4px]",
            entered: "opacity-100 translate-y-0",
            exiting: "opacity-0 translate-y-[-4px]",
          };
        case "top":
          return {
            entering: "opacity-0 translate-y-[4px]",
            entered: "opacity-100 translate-y-0",
            exiting: "opacity-0 translate-y-[4px]",
          };
        case "left":
          return {
            entering: "opacity-0 translate-x-[4px]",
            entered: "opacity-100 translate-x-0",
            exiting: "opacity-0 translate-x-[4px]",
          };
        case "right":
          return {
            entering: "opacity-0 translate-x-[-4px]",
            entered: "opacity-100 translate-x-0",
            exiting: "opacity-0 translate-x-[-4px]",
          };
      }
    };

    const animationClasses = getAnimationClasses();    return createPortal(
      <div
        ref={(node) => {
          if (ref) {
            if (typeof ref === "function") {
              ref(node);
            } else {
              ref.current = node;
            }
          }
          dropdownRef.current = node;
        }}
        role={role}
        className={cn(
          // "Werkzeug" popover: s2, a hairline, r-md, the floating shadow; short fade + 4 px slide
          "fixed font-smallcaps z-[1001] overflow-hidden text-fg",
          "bg-s2 border border-line-2 shadow-pop",
          "transition-[opacity,transform] duration-med ease-out",
          animationState === "entering" && animationClasses.entering,
          animationState === "entered" && animationClasses.entered,
          animationState === "exiting" && animationClasses.exiting,
          className,
        )}
        style={{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          width: `${width}px`,
          borderRadius: borderRadius === 0 ? 0 : "var(--r-md)",
        }}
        {...accessibilityProps}
      >
        <div className="relative">{children}</div>
      </div>,
      document.body,
    );
  },
);

Dropdown.displayName = "Dropdown";