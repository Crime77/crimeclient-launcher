"use client";

import { cn } from "../../lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// track w x h, knob, travel (px). On = the light --fg track with a dark knob; off = s4. Never the accent.
const SIZES = {
  sm: { w: 28, h: 16, knob: 12, label: "text-xs" },
  md: { w: 32, h: 18, knob: 14, label: "text-[13px]" },
  lg: { w: 40, h: 22, knob: 18, label: "text-sm" },
} as const;

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
  className,
}: ToggleSwitchProps) {
  const dims = SIZES[size] ?? SIZES.md;
  const inset = (dims.h - dims.knob) / 2;
  const travel = dims.w - dims.knob - inset * 2;

  return (
    <label
      className={cn(
        "group inline-flex items-center gap-2.5",
        disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex-shrink-0 rounded-full transition-colors duration-med ease-out",
          checked ? "bg-fg" : "bg-s4 group-hover:bg-[#36363c]",
          !disabled && checked && "group-hover:bg-white",
        )}
        style={{ width: dims.w, height: dims.h }}
        aria-hidden
      >
        <span
          className={cn(
            "absolute rounded-full transition-[transform,background-color] duration-med ease-out",
            checked ? "bg-bg" : "bg-fg-2",
          )}
          style={{
            width: dims.knob,
            height: dims.knob,
            top: inset,
            left: inset,
            transform: `translateX(${checked ? travel : 0}px)`,
          }}
        />
      </span>

      {label && (
        <span className={cn("text-fg-2 font-[450] select-none", dims.label)}>
          {label}
        </span>
      )}

      <input
        type="checkbox"
        role="switch"
        className="sr-only peer"
        checked={checked}
        onChange={() => !disabled && onChange(!checked)}
        disabled={disabled}
      />
    </label>
  );
}
