"use client";

/**
 * ThemedDropdown — the popover panel of the V3 views (filter, sort, pack, version, row menus).
 *
 * The trigger stays with the caller. This primitive renders the click-outside layer and the flat
 * "Werkzeug" popover (s2, line-2, r-md, pop shadow), plus items, divider and header.
 *
 * Usage:
 *   <div className="relative">
 *     <button onClick={() => setOpen(v => !v)}>Sort: {activeLabel}</button>
 *     <ThemedDropdown open={open} onClose={() => setOpen(false)} width="w-40" align="right">
 *       {options.map(o => (
 *         <ThemedDropdownItem key={o.value} icon={o.icon} selected={o.value === active} onClick={...}>
 *           {o.label}
 *         </ThemedDropdownItem>
 *       ))}
 *     </ThemedDropdown>
 *   </div>
 */

import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { Check, type LucideIcon } from "lucide-react";

interface ThemedDropdownProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Tailwind **min-width** class, e.g. "w-40", "w-60", "w-72". The panel grows with its content
   * beyond it (up to `maxWidth`) so translated labels are not cut. Default: "w-48".
   */
  width?: string;
  /** "left" | "right" — alignment relative to the trigger. Default: "right". */
  align?: "left" | "right";
  /** Max height + scroll for long lists. Default: false. */
  scrollable?: boolean;
  /** Upper bound for the width. Default: "max-w-xs" (320px). */
  maxWidth?: string;
  /** Extra classes for the panel. */
  className?: string;
  /**
   * When provided, the panel is portaled into `document.body` and positioned with fixed
   * coordinates relative to this element, so a parent `opacity` or `overflow:hidden` can't fade
   * or clip it. Without it the panel is positioned absolutely (needs a relative parent).
   */
  triggerRef?: React.RefObject<HTMLElement | null>;
  matchTriggerWidth?: boolean;
}

export function ThemedDropdown({
  open, onClose, children,
  width = "w-48", align = "right", scrollable = false,
  maxWidth = "max-w-xs", className = "",
  triggerRef, matchTriggerWidth = false,
}: ThemedDropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useLayoutEffect(() => {
    if (!open || !triggerRef?.current) {
      setPos(null);
      setFlipped(false);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    const minW = matchTriggerWidth ? r.width : (WIDTH_TO_PX[width] ?? 192);
    setPos({
      top: r.bottom + 4,
      left: align === "right" ? r.right - minW : r.left,
      ...(matchTriggerWidth ? { width: r.width } : {}),
    });
    setFlipped(false);
  }, [open, triggerRef, width, align, matchTriggerWidth]);

  useLayoutEffect(() => {
    if (flipped || !pos || !panelRef.current || !triggerRef?.current) return;
    const panel = panelRef.current.getBoundingClientRect();
    const trigger = triggerRef.current.getBoundingClientRect();
    const overflowsBelow = panel.bottom > window.innerHeight - 8;
    const fitsAbove = trigger.top - panel.height - 4 >= 8;
    if (overflowsBelow && fitsAbove) {
      setFlipped(true);
      setPos({ top: trigger.top - panel.height - 4, left: pos.left, width: pos.width });
    }
  }, [pos, flipped, triggerRef]);

  if (!open) return null;

  const scrollClass = scrollable ? "max-h-80 overflow-y-auto custom-scrollbar" : "overflow-hidden";
  // `w-XX` is the lower bound; the panel grows with its content (`w-max`) up to `max-w-*`.
  // min-width goes inline so callers can pass any of the mapped classes.
  const minWidthPx = WIDTH_TO_PX[width] ?? 192;
  const panelStyle: React.CSSProperties = { minWidth: `${minWidthPx}px` };
  const panelClass = `cc-popover cc-pop p-1 ${scrollClass} ${className}`;

  if (triggerRef) {
    if (!pos) return null;
    return createPortal(
      <>
        <div className="fixed inset-0 z-[1000]" onClick={onClose} />
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            position: "fixed",
            top: pos.top,
            left: pos.left,
            ...(pos.width ? { minWidth: pos.width, width: pos.width } : {}),
          }}
          className={`${pos.width ? "" : `w-max ${maxWidth}`} z-[1001] ${panelClass}`}
        >
          {children}
        </div>
      </>,
      document.body,
    );
  }

  const alignClass = align === "right" ? "right-0" : "left-0";
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        style={panelStyle}
        className={`absolute top-full ${alignClass} mt-1 w-max ${maxWidth} z-20 ${panelClass}`}
      >
        {children}
      </div>
    </>
  );
}

// Tailwind `w-*` -> pixels for the inline min-width.
const WIDTH_TO_PX: Record<string, number> = {
  "w-40": 160,
  "w-44": 176,
  "w-48": 192,
  "w-52": 208,
  "w-56": 224,
  "w-60": 240,
  "w-64": 256,
  "w-72": 288,
};

// ────────────────────────────────────────────────────────────────────────────

interface ThemedDropdownItemProps {
  onClick: () => void;
  children: React.ReactNode;
  /** An iconify name (older callers) or a lucide icon. */
  icon?: string | LucideIcon;
  /** The active option: raised row with a check. */
  selected?: boolean;
  disabled?: boolean;
  /** Danger variant for destructive actions (e.g. Delete). */
  tone?: "default" | "danger";
}

export function ThemedDropdownItem({
  onClick, children, icon, selected, disabled, tone = "default",
}: ThemedDropdownItemProps) {
  const toneClass =
    tone === "danger"
      ? "text-err hover:bg-err/10"
      : selected
        ? "bg-s3 text-fg"
        : "text-fg-2 hover:bg-s3 hover:text-fg";
  const iconTone = tone === "danger" ? "" : "text-fg-3 group-hover/item:text-fg-2";
  const LucideGlyph = typeof icon === "string" ? null : icon;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={`group/item w-full h-8 flex items-center gap-2.5 px-2 text-[13px] text-left whitespace-nowrap transition-colors duration-fast disabled:opacity-45 disabled:cursor-not-allowed ${toneClass}`}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      {typeof icon === "string" && <Icon icon={icon} className={`w-3.5 h-3.5 flex-shrink-0 ${iconTone}`} />}
      {LucideGlyph && <LucideGlyph size={14} strokeWidth={1.75} className={`flex-shrink-0 ${iconTone}`} />}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      {selected && <Check size={14} strokeWidth={2} className="flex-shrink-0 text-fg-2" />}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export const ThemedDropdownDivider: React.FC = () => <div className="h-px bg-line my-1 -mx-1" />;

export const ThemedDropdownHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="cc-eyebrow px-2 pt-1.5 pb-1">{children}</div>
);
