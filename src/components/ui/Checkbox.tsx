"use client";

import type React from "react";
import { forwardRef } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentSize,
  type StateVariant
} from "./design-system";

interface CheckboxProps {
  checked: boolean;
  onChange: (event: { target: { checked: boolean }; currentTarget: { checked: boolean } }) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  size?: ComponentSize;
  label?: string;
  description?: string;
  descriptionClassName?: string;
  error?: string;
  state?: StateVariant;
  className?: string;
  required?: boolean;
  id?: string;
  customSize?: string;
  variant?: string;
  onClick?: (e: any) => any;
  title?: string;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({
    checked,
    onChange,
    disabled = false,
    indeterminate = false,
    size = "md",
    label,
    description,
    descriptionClassName,
    error,
    state,
    className,
    required = false,
    id,
    customSize,
    variant,
    onClick,
    title,
    ...props
  }, ref) => {
    const borderRadius = useThemeStore((state) => state.borderRadius);

    const toggle = () => {
      if (!disabled) {
        const event = {
          target: { checked: !checked },
          currentTarget: { checked: !checked }
        };
        onChange(event as any);
      }
    };

    const handleClick = toggle;
    const handleLabelClick = toggle;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        toggle();
      }
    };

    const effectiveSize = (customSize || size) as ComponentSize;
    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      error,
      required,
      disabled
    });

    // box and check sizes (px); checked = the light --fg fill with a dark check
    const dims: Record<ComponentSize, { box: number; icon: number; label: string; desc: string }> = {
      xs: { box: 14, icon: 10, label: "text-xs", desc: "text-[11px]" },
      sm: { box: 16, icon: 11, label: "text-[13px]", desc: "text-xs" },
      md: { box: 16, icon: 11, label: "text-[13px]", desc: "text-xs" },
      lg: { box: 18, icon: 12, label: "text-sm", desc: "text-xs" },
      xl: { box: 20, icon: 14, label: "text-sm", desc: "text-[13px]" },
    };
    const d = dims[effectiveSize] ?? dims.md;
    const on = checked || indeterminate;

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className={cn("flex gap-2.5", description ? "items-start" : "items-center")}>
          <button
            ref={ref}
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? "mixed" : checked}
            aria-disabled={disabled}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `checkbox-error-${id || ""}` : undefined}
            {...accessibilityProps}
            disabled={disabled}
            onClick={onClick || handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative flex-shrink-0 flex items-center justify-center border",
              "transition-colors duration-fast ease-out",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-line-3 focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
              on
                ? "bg-fg border-fg text-bg"
                : cn("bg-s2", error ? "border-err/60" : "border-line-3", !disabled && "hover:border-fg-3 hover:bg-s3"),
              disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
              description && "mt-px",
            )}
            style={{
              width: d.box,
              height: d.box,
              borderRadius: borderRadius === 0 ? 0 : "var(--r-sm)",
            }}
          >
            {on && (indeterminate ? (
              <Minus size={d.icon} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Check size={d.icon} strokeWidth={3} aria-hidden="true" />
            ))}
          </button>

          {(label || description) && (
            <div className="flex flex-col gap-0.5 min-w-0">
              {label && (
                <label
                  className={cn(
                    "text-fg font-[450] cursor-pointer select-none leading-snug",
                    d.label,
                    disabled && "opacity-45 cursor-not-allowed"
                  )}
                  onClick={!disabled ? handleLabelClick : undefined}
                >
                  {label}
                  {required && <span className="text-err ml-1">*</span>}
                </label>
              )}
              {description && (
                <span className={cn(
                  "text-fg-3 leading-snug",
                  d.desc,
                  descriptionClassName
                )}>
                  {description}
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            id={`checkbox-error-${id || ""}`}
            className="text-err text-xs"
            style={{ marginLeft: d.box + 10 }}
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
