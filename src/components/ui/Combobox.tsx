"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  maxVisible?: number;
  optionStyle?: (option: string) => React.CSSProperties;
  inputStyle?: React.CSSProperties;
  className?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  allowClear,
  maxVisible = 60,
  optionStyle,
  inputStyle,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = (query ? options.filter((o) => o.toLowerCase().includes(query)) : options).slice(
    0,
    maxVisible,
  );

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-9 rounded-md border border-line bg-s2 pl-3 pr-16 text-[13px] text-fg placeholder:text-fg-4 outline-none transition-colors duration-fast hover:border-line-2 focus:border-line-3 disabled:opacity-40"
        style={inputStyle}
      />

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex items-center justify-center w-6 h-6 rounded-sm text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast"
            tabIndex={-1}
            aria-label="Clear"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          className="flex items-center justify-center w-6 h-6 rounded-sm text-fg-3 hover:text-fg hover:bg-s3 transition-colors duration-fast disabled:opacity-40"
          tabIndex={-1}
          aria-label="Toggle options"
        >
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className={cn("transition-transform duration-med ease-out", open && "rotate-180")}
          />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="cc-pop absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto custom-scrollbar rounded-md border border-line-2 bg-s2 shadow-pop z-50 p-1">
          {filtered.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[13px] rounded-sm transition-colors duration-fast",
                  active ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s3 hover:text-fg",
                )}
                style={optionStyle?.(opt)}
              >
                <span className="truncate">{opt}</span>
                {active && <Check size={14} strokeWidth={2} className="shrink-0 text-fg" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
