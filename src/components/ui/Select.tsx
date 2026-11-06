"use client";

import type React from "react";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { Dropdown } from "./dropdown/Dropdown.tsx";
import { DropdownItem } from "./dropdown/DropdownItem.tsx";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "themed-surface" | "flat" | "3d";
}

// trigger heights 32 / 36 / 40 px
const SIZES = {
  sm: "h-8 pl-2.5 pr-2 text-xs",
  md: "h-9 pl-3 pr-2.5 text-[13px]",
  lg: "h-10 pl-3 pr-2.5 text-[13px]",
} as const;

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className,
  disabled = false,
  size = "md",
  variant = "default",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const borderRadius = useThemeStore((state) => state.borderRadius);

  const selectedOption = options.find((option) => option.value === value);

  const handleClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} data-variant={variant}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-between gap-2 w-full overflow-hidden",
          "bg-s2 border text-fg font-[450] transition-colors duration-fast ease-out",
          "focus:outline-none focus-visible:border-line-3",
          isOpen ? "border-line-3" : "border-line",
          !disabled && !isOpen && "hover:border-line-2",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          SIZES[size] ?? SIZES.md,
          className,
        )}
        style={{ borderRadius: borderRadius === 0 ? 0 : "var(--r-md)" }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 flex items-center text-fg-3">{selectedOption.icon}</span>
          )}
          <span className={cn("truncate", !selectedOption && "text-fg-4")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={cn(
            "flex-shrink-0 text-fg-3 transition-transform duration-med ease-out",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        width={triggerRef.current?.offsetWidth || 300}
        position={options.length > 6 ? "top" : "bottom"}
        offset={4}
      >
        <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
          {options.map((option) => (
            <DropdownItem
              key={option.value}
              isActive={option.value === value}
              icon={option.icon}
              onClick={() => handleOptionSelect(option.value)}
            >
              {option.label}
            </DropdownItem>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
