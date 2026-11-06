"use client";

import { useRef, useState, type RefObject } from "react";
import { Separator, type LayoutStorage, type PanelImperativeHandle } from "react-resizable-panels";

import { cn } from "../../../lib/utils";

const LAYOUT_PREFIX = "react-resizable-panels:clip-editor";

export const COLUMNS_ID = "clip-editor-columns";
export const ROWS_ID = "clip-editor-rows";

export const SIDE = { default: 256, min: 220, max: 420 };
export const INSPECTOR = { default: 288, min: 240, max: 460 };
export const TIMELINE = { default: 256, min: 192, max: "60%", collapsed: 46 };
export const STAGE_MIN = 240;
export const MAIN_MIN = "30%";

export const HIT_AREA = { fine: 12, coarse: 28 };

// flat panels; the 1 px resize bars between them are the only dividers
export const CARD = "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-s1";

export const PANEL_HEAD =
  "relative flex h-10 shrink-0 items-center gap-2 border-b border-line px-3";

export const layoutStorage: LayoutStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  },
};

export function clearSavedLayout() {
  try {
    const storage = window.localStorage;
    const saved: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(LAYOUT_PREFIX)) saved.push(key);
    }
    saved.forEach((key) => storage.removeItem(key));
  } catch {
    return;
  }
}

export function ResizeBar({
  orientation,
  label,
  color,
  disabled = false,
}: {
  orientation: "vertical" | "horizontal";
  label: string;
  color: string;
  disabled?: boolean;
}) {
  const across = orientation === "vertical";
  return (
    <Separator
      aria-label={label}
      disabled={disabled}
      className={cn(
        "group relative z-20 shrink-0 bg-line outline-none transition-colors duration-fast",
        "data-[separator=hover]:bg-line-3 data-[separator=active]:bg-fg-3 data-[separator=focus]:bg-line-3",
        across ? (disabled ? "w-0" : "w-px") : "h-px",
        disabled && "invisible",
      )}
    >
      {/* the grab area is wider than the line (resizeTargetMinimumSize on the group) */}
    </Separator>
  );
}

export function EdgeGrip({
  panel,
  label,
  color,
  onDrag,
}: {
  panel: RefObject<PanelImperativeHandle | null>;
  label: string;
  color: string;
  onDrag: (active: boolean) => void;
}) {
  const start = useRef<{ y: number; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const stop = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    onDrag(false);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      onPointerDown={(event) => {
        const handle = panel.current;
        if (!handle || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { y: event.clientY, size: handle.getSize().inPixels };
        setDragging(true);
        onDrag(true);
      }}
      onPointerMove={(event) => {
        if (!start.current) return;
        panel.current?.resize(start.current.size - (event.clientY - start.current.y));
      }}
      onPointerUp={stop}
      onLostPointerCapture={stop}
      className="group absolute inset-x-0 -bottom-1.5 z-20 h-3 cursor-row-resize"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-3 opacity-0 transition-opacity duration-fast group-hover:opacity-100",
          dragging && "bg-fg-3 opacity-100",
        )}
      />
    </div>
  );
}
