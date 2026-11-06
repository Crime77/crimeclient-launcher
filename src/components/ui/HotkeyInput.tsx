"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isMacOS } from "../../utils/platform";
import { cn } from "../../lib/utils";

interface HotkeyInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  conflictsWith?: string;
  onRecordingChange?: (recording: boolean) => void;
  className?: string;
}

const MOUSE_CODES: Record<number, string | undefined> = {
  1: "MouseMiddle",
  3: "MouseX1",
  4: "MouseX2",
};

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

export function HotkeyInput({
  value,
  onChange,
  disabled,
  conflictsWith,
  onRecordingChange,
  className,
}: HotkeyInputProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const stop = useCallback(() => {
    setRecording(false);
    setPreview([]);
    onRecordingChange?.(false);
  }, [onRecordingChange]);

  const start = useCallback(() => {
    if (disabled) return;
    setRecording(true);
    setPreview([]);
    onRecordingChange?.(true);
  }, [disabled, onRecordingChange]);

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.code === "Escape") {
        stop();
        return;
      }
      if (event.code === "Backspace") {
        onChange("");
        stop();
        return;
      }

      const modifiers = collectModifiers(event);

      if (MODIFIER_CODES.has(event.code)) {
        setPreview(modifiers);
        return;
      }

      onChange([...modifiers, event.code].join("+"));
      stop();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (MODIFIER_CODES.has(event.code)) {
        setPreview(collectModifiers(event));
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [recording, onChange, stop]);

  useEffect(() => {
    if (!recording) return;
    const onPointerDown = (event: PointerEvent) => {
      const button = MOUSE_CODES[event.button];
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        onChange([...collectModifiers(event), button].join("+"));
        stop();
        return;
      }
      if (!buttonRef.current?.contains(event.target as Node)) stop();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [recording, stop, onChange]);

  const conflict =
    !!value && !!conflictsWith && value.toLowerCase() === conflictsWith.toLowerCase();

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled}
        className={cn(
          "flex h-8 min-w-[11rem] items-center justify-center gap-2 rounded-md border px-3 text-xs transition-colors duration-fast",
          recording
            ? "border-line-3 bg-s3 text-fg"
            : "border-line bg-s2 text-fg hover:border-line-2 hover:bg-s3",
          conflict && !recording && "border-err/50 text-err hover:border-err/60",
          disabled && "cursor-not-allowed opacity-40 hover:border-line hover:bg-s2",
        )}
      >
        {recording ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="cc-num">
              {preview.length > 0
                ? `${preview.map(labelFor).join(" + ")} + …`
                : t("hotkey.press")}
            </span>
          </>
        ) : value ? (
          <span className="cc-num">{formatShortcut(value)}</span>
        ) : (
          <span className="text-fg-4">{t("hotkey.none")}</span>
        )}
      </button>

      <p className="text-right text-[11px] text-fg-3">
        {recording
          ? t("hotkey.hint_recording")
          : conflict
            ? <span className="text-err">{t("hotkey.conflict")}</span>
            : t("hotkey.hint_idle")}
      </p>
    </div>
  );
}

function collectModifiers(event: KeyboardEvent | PointerEvent): string[] {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Super");
  return modifiers;
}

export function formatShortcut(shortcut: string): string {
  if (!shortcut) return "";
  return shortcut.split("+").map(labelFor).join(" + ");
}

const NUMPAD_LABELS: Record<string, string> = {
  Add: "+",
  Subtract: "-",
  Multiply: "*",
  Divide: "/",
  Decimal: ".",
  Enter: "Enter",
};

function labelFor(token: string): string {
  if (token.startsWith("Key")) return token.slice(3);
  if (token.startsWith("Digit")) return token.slice(5);
  if (token.startsWith("Arrow")) return token.slice(5);
  if (token === "MouseMiddle") return "Middle Mouse";
  if (token.startsWith("MouseX")) return `Mouse ${Number(token.slice(6)) + 3}`;
  if (token.startsWith("Numpad")) return `Num ${NUMPAD_LABELS[token.slice(6)] ?? token.slice(6)}`;

  const named: Record<string, string> = {
    Ctrl: "Ctrl",
    Alt: isMacOS() ? "Option" : "Alt",
    Shift: "Shift",
    Super: isMacOS() ? "Cmd" : "Win",
    Space: "Space",
    Enter: "Enter",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    CapsLock: "Caps",
    PageUp: "Page Up",
    PageDown: "Page Down",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    Delete: "Delete",
    Tab: "Tab",
    Backspace: "Backspace",
    Pause: "Pause",
    ScrollLock: "Scroll Lock",
    PrintScreen: "Print",
    NumLock: "Num Lock",
    IntlBackslash: "\\",
  };

  return named[token] ?? token;
}
