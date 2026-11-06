"use client";

import type React from "react";
import { forwardRef, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import {
  getAccessibilityProps,
  type ComponentSize,
  type ComponentVariant
} from "./design-system";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSearch?: (searchTerm: string) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  variant?: ComponentVariant | "minimal" | "filled" | "themed-surface";
  label?: string;
  description?: string;
  error?: string;
}

// heights 28 / 32 / 36 / 40 / 44 px
const HEIGHT: Record<ComponentSize, { box: string; text: string; icon: number }> = {
  xs: { box: "h-7 pl-2 pr-1", text: "text-xs", icon: 13 },
  sm: { box: "h-8 pl-2.5 pr-1", text: "text-[13px]", icon: 14 },
  md: { box: "h-9 pl-3 pr-1.5", text: "text-[13px]", icon: 15 },
  lg: { box: "h-10 pl-3 pr-1.5", text: "text-[13px]", icon: 15 },
  xl: { box: "h-11 pl-3.5 pr-2", text: "text-sm", icon: 16 },
};

/** A thin spinning ring, the loading state of the search field. */
function Ring({ size }: { size: number }) {
  return (
    <span
      className="block rounded-full border-[1.5px] border-line-3 border-t-fg-2 animate-spin"
      style={{ width: size - 2, height: size - 2 }}
    />
  );
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "search...",
      className,
      onSearch,
      loading = false,
      disabled = false,
      size = "md",
      variant = "default",
      label,
      description,
      error,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const borderRadius = useThemeStore((state) => state.borderRadius);
    const accessibilityProps = getAccessibilityProps({
      label,
      description,
      error,
      disabled
    });
    const dims = HEIGHT[size] ?? HEIGHT.md;

    const mergedRef = (node: HTMLInputElement) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      inputRef.current = node;
    };

    const handleClear = () => {
      if (disabled) return;
      onChange("");
      if (onSearch) {
        onSearch("");
      }
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch(value);
      }
    };

    const variantClasses = (() => {
      if (variant === "minimal") {
        return "bg-transparent border-0 border-b border-line-2 focus-within:border-line-3 rounded-none";
      }
      if (variant === "filled") {
        return "bg-s2 border border-transparent focus-within:border-line-3";
      }
      if (error) {
        return "bg-s2 border border-err/50 focus-within:border-err/70";
      }
      return "bg-s2 border border-line [&:hover:not(:focus-within)]:border-line-2 focus-within:border-line-3";
    })();

    return (
      <div
        ref={containerRef}
        className={cn(
          "group relative flex items-center gap-2 w-full overflow-hidden cursor-text",
          "transition-colors duration-fast ease-out",
          variantClasses,
          disabled && "opacity-50 cursor-not-allowed",
          dims.box,
          className,
        )}
        style={variant === "minimal" ? undefined : { borderRadius: borderRadius === 0 ? 0 : "var(--r-md)" }}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="flex items-center justify-center flex-shrink-0 text-fg-3 group-focus-within:text-fg-2 transition-colors duration-fast">
          {loading ? <Ring size={dims.icon} /> : <Search size={dims.icon} strokeWidth={1.75} />}
        </span>

        <input
          ref={mergedRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 min-w-0 h-full bg-transparent border-none outline-none text-fg placeholder:text-fg-4 truncate",
            dims.text,
            disabled && "cursor-not-allowed",
          )}
          style={{
            lineHeight: "1.1",
            paddingTop: "0",
            paddingBottom: "0",
          }}
          spellCheck={false}
          autoComplete="off"
          {...accessibilityProps}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="flex items-center justify-center w-6 h-6 flex-shrink-0 rounded-sm text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast"
            aria-label={t('common.clear_search')}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
