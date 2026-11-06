"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { MENU_PANEL_CLASSES, menuItemClasses, menuSeparatorClasses } from "./design-system";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  separator?: boolean;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  variant?: 'default' | 'search';
  size?: 'sm' | 'md';
}

export function CustomDropdown({
  label,
  value,
  options,
  onChange,
  className = "",
  variant = 'default',
  size = 'md',
}: CustomDropdownProps) {
  const isSm = size === 'sm';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  // With a label (or the search variant) the trigger is a full field; without, a quiet toolbar trigger
  const isField = variant === 'search' || !!label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label above (only if provided) */}
      {label && (
        <label className="block text-xs font-[520] text-fg-2 mb-1.5">
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 focus:outline-none transition-colors duration-fast ease-out",
          isField
            ? cn(
                "w-full justify-between px-3 bg-s2 border text-fg",
                isSm ? "h-8 text-xs" : "h-9 text-[13px]",
                isOpen ? "border-line-3" : "border-line hover:border-line-2",
              )
            : cn(
                "px-2 text-fg-2 hover:text-fg hover:bg-s3",
                isSm ? "h-7 text-xs" : "h-8 text-[13px]",
                isOpen && "bg-s3 text-fg",
              ),
        )}
        style={{ borderRadius: isField ? "var(--r-md)" : "var(--r-sm)" }}
        title={selectedOption?.label}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && isField && (
            <Icon icon={selectedOption.icon} className="w-4 h-4 text-fg-3 flex-shrink-0" />
          )}
          <span className={cn("truncate font-[520]", !isField && "max-w-[160px]")}>{selectedOption?.label}</span>
        </span>
        <ChevronDown
          size={isSm ? 13 : 14}
          strokeWidth={1.75}
          className={cn(
            "flex-shrink-0 text-fg-3 transition-transform duration-med ease-out",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "cc-pop absolute top-full mt-1.5 min-w-[180px]",
          MENU_PANEL_CLASSES,
          isField ? 'left-0 right-0' : 'right-0 w-56',
        )}>
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <div key={option.value}>
                {option.separator && index > 0 && (
                  <div className={menuSeparatorClasses(isSm)} />
                )}
                <button
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  className={cn(menuItemClasses(isSm), selected && 'bg-s3 text-fg')}
                >
                  {option.icon && (
                    <Icon icon={option.icon} className={cn("w-4 h-4 flex-shrink-0", selected ? "text-fg-2" : "text-fg-3")} />
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {selected && <Check size={14} strokeWidth={2} className="text-fg" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
