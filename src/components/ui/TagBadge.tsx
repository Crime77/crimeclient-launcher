"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { cn } from "../../lib/utils";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant
} from "./design-system";

export interface TagBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  iconElement?: React.ReactNode;
  variant?: ComponentVariant | "inactive" | "flat" | "filter";
  size?: ComponentSize;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

// "Werkzeug" label: flat s3, fg-2 text, r-sm, 11 px. State variants colour the text and the hairline only.
const SIZES: Record<ComponentSize, { box: string; text: string; icon: string }> = {
  xs: { box: "h-4 px-1", text: "text-[10.5px]", icon: "w-2.5 h-2.5" },
  sm: { box: "h-[18px] px-1.5", text: "text-[11px]", icon: "w-2.5 h-2.5" },
  md: { box: "h-[18px] px-1.5", text: "text-[11px]", icon: "w-3 h-3" },
  lg: { box: "h-[22px] px-2", text: "text-xs", icon: "w-3 h-3" },
  xl: { box: "h-6 px-2.5", text: "text-xs", icon: "w-3.5 h-3.5" },
};

function variantClasses(variant: TagBadgeProps["variant"], clickable: boolean): string {
  switch (variant) {
    case "destructive":
      return cn("bg-transparent border-err/35 text-err", clickable && "hover:bg-err/10");
    case "warning":
      return cn("bg-transparent border-warn/35 text-warn", clickable && "hover:bg-warn/10");
    case "success":
      return cn("bg-transparent border-ok/35 text-ok", clickable && "hover:bg-ok/10");
    case "info":
      return cn("bg-transparent border-info/35 text-info", clickable && "hover:bg-info/10");
    case "inactive":
      return cn("bg-s2 border-transparent text-fg-3", clickable && "hover:text-fg-2 hover:bg-s3");
    case "ghost":
      return cn("bg-transparent border-transparent text-fg-3", clickable && "hover:text-fg-2 hover:bg-s3");
    case "flat":
      return cn("bg-transparent border-line-2 text-fg-2", clickable && "hover:text-fg hover:border-line-3");
    case "filter":
      // an applied filter: one step brighter than a plain label
      return cn("bg-s3 border-line-3 text-fg", clickable && "hover:bg-s4");
    default:
      return cn("bg-s3 border-transparent text-fg-2", clickable && "hover:text-fg hover:bg-s4");
  }
}

export const TagBadge = forwardRef<HTMLElement, TagBadgeProps>(
  (
    {
      children,
      className,
      iconElement,
      variant = "default",
      size = "md",
      onClick,
      disabled = false,
      label,
      description,
      ...props
    },
    ref,
  ) => {
    const badgeRef = useRef<HTMLElement>(null);
    const isClickable = !!onClick && !disabled;

    const mergedRef = (node: HTMLElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      badgeRef.current = node;
    };

    const dims = SIZES[size] ?? SIZES.md;
    const accessibilityProps = getAccessibilityProps({
      label: label || (typeof children === "string" ? children : undefined),
      description,
      disabled
    });

    const {
      onCopy,
      onCut,
      onPaste,
      onCompositionEnd,
      onCompositionStart,
      onCompositionUpdate,
      ...cleanProps
    } = props;

    const baseProps = {
      ref: mergedRef,
      className: cn(
        "inline-flex items-center justify-center relative w-fit whitespace-nowrap border rounded-sm",
        "font-[520] leading-none transition-colors duration-fast ease-out",
        dims.box,
        variantClasses(variant, isClickable),
        isClickable ? "cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ),
      ...accessibilityProps
    };

    const content = (
      <>
        <span
          className={cn(
            "relative flex items-center",
            iconElement ? "gap-x-1" : "",
            dims.text,
          )}
          style={{
            letterSpacing: "0.01em",
            textTransform: "capitalize",
          }}
        >
          {iconElement && (
            <span className={cn("flex-shrink-0 flex items-center justify-center", dims.icon)} aria-hidden="true">
              {iconElement}
            </span>
          )}
          {children}
        </span>
        {description && (
          <span
            id={accessibilityProps["aria-describedby"]}
            className="sr-only"
          >
            {description}
          </span>
        )}
      </>
    );

    if (isClickable) {
      return (
        <button
          {...baseProps}
          type="button"
          onClick={onClick}
        >
          {content}
        </button>
      );
    }

    return (
      <span {...baseProps} {...cleanProps}>
        {content}
      </span>
    );
  },
);

TagBadge.displayName = "TagBadge";
