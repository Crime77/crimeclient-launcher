"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant
} from "./design-system";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  error?: string;
  size?: ComponentSize;
  variant?: ComponentVariant;
  label?: string;
  description?: string;
}

// "Werkzeug" field: s2 with a hairline, the line brightens on focus; heights 28 / 32 / 36 / 40 / 44 px
const FIELD_BASE = "bg-s2 border transition-colors duration-fast ease-out";
const FIELD_OK = "border-line [&:hover:not(:focus-within)]:border-line-2 focus-within:border-line-3";
const FIELD_ERROR = "border-err/50 focus-within:border-err/70";

const FIELD_HEIGHT: Record<ComponentSize, string> = {
  xs: "h-7 text-xs",
  sm: "h-8 text-[13px]",
  md: "h-9 text-[13px]",
  lg: "h-10 text-[13px]",
  xl: "h-11 text-sm",
};

// Neue SearchWithFilters-Style Input Komponente
export interface SearchStyleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  placeholder?: string;
  icon?: string;
  error?: string;
}

export const SearchStyleInput = forwardRef<HTMLInputElement, SearchStyleInputProps>(
  ({ className, placeholder = "Enter name for new profile", icon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 h-9 px-3 rounded-md",
            FIELD_BASE,
            error ? FIELD_ERROR : FIELD_OK,
          )}
        >
          {icon && (
            <Icon icon={icon} className="w-4 h-4 text-fg-3 flex-shrink-0" />
          )}
          <input
            ref={ref}
            type="text"
            placeholder={placeholder}
            className={cn(
              "bg-transparent text-fg placeholder:text-fg-4 text-[13px] flex-1 min-w-0 h-full outline-none",
              className
            )}
            spellCheck={false}
            autoComplete="off"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-err">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SearchStyleInput.displayName = "SearchStyleInput";

// SearchStyleTextArea - für mehrzeilige Eingaben im SearchStyle Design
export interface SearchStyleTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  placeholder?: string;
  icon?: string;
  error?: string;
  minHeight?: string;
}

export const SearchStyleTextArea = forwardRef<HTMLTextAreaElement, SearchStyleTextAreaProps>(
  ({ className, placeholder = "Enter text...", icon, error, minHeight = "100px", ...props }, ref) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            "flex items-start gap-2 px-3 py-2 rounded-md",
            FIELD_BASE,
            error ? FIELD_ERROR : FIELD_OK,
          )}
        >
          {icon && (
            <Icon icon={icon} className="w-4 h-4 text-fg-3 flex-shrink-0 mt-0.5" />
          )}
          <textarea
            ref={ref}
            placeholder={placeholder}
            className={cn(
              "bg-transparent text-fg placeholder:text-fg-4 text-[13px] leading-[1.5] flex-1 min-w-0 outline-none resize-none",
              className
            )}
            style={{ minHeight }}
            spellCheck={false}
            autoComplete="off"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-err">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SearchStyleTextArea.displayName = "SearchStyleTextArea";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      icon,
      clearable = false,
      onClear,
      error,
      size = "md",
      variant = "default",
      label,
      description,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const borderRadius = useThemeStore((state) => state.borderRadius);

    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      error,
      disabled: props.disabled
    });

    const hasClearableValue =
      !!clearable &&
      typeof props.value === "string" &&
      props.value.length > 0;

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (props.onChange) {
        const event = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };

    return (
      <div className="w-full">
        <div
          ref={containerRef}
          data-variant={variant}
          className={cn(
            "relative overflow-hidden",
            FIELD_BASE,
            error ? FIELD_ERROR : FIELD_OK,
            props.disabled && "opacity-50 cursor-not-allowed",
            FIELD_HEIGHT[size] ?? FIELD_HEIGHT.md,
            className,
          )}
          style={{ borderRadius: borderRadius === 0 ? 0 : "var(--r-md)" }}
        >
          <div className="flex items-center h-full w-full">
            {icon && (
              <div className="flex items-center justify-center pl-2.5 h-full text-fg-3 flex-shrink-0">
                {icon}
              </div>
            )}
            <input
              ref={ref}
              className={cn(
                "flex-1 min-w-0 h-full bg-transparent border-none outline-none text-fg placeholder:text-fg-4",
                icon ? "pl-2 pr-3" : "px-3",
                hasClearableValue && "pr-1",
                props.disabled && "cursor-not-allowed",
              )}
              style={{
                lineHeight: "1.1",
                paddingTop: "0",
                paddingBottom: "0",
              }}
              spellCheck={false}
              autoComplete="off"
              {...accessibilityProps}
              {...props}
            />

            {hasClearableValue && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center w-6 h-6 mr-1.5 flex-shrink-0 rounded-sm text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast"
                aria-label="Clear input"
                tabIndex={-1}
              >
                <Icon icon="lucide:x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-err">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
