"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Video } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

import { errorKey } from "../../services/clip-service";

const HOLD_MS = 2600;
const FADE_MS = 400;

interface ClipManifest {
  path: string;
  duration_seconds: number;
  size_bytes: number;
  width: number;
  height: number;
}

interface CaptureError {
  code: string;
  message: string;
  recoverable: boolean;
}

type Shown =
  | { kind: "saved"; clip: ClipManifest }
  | { kind: "error"; error: CaptureError };

export function ClipOverlay() {
  const { t } = useTranslation();
  const [shown, setShown] = useState<Shown | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const present = useCallback(
    (next: Shown) => {
      clearTimers();
      setShown(next);
      setLeaving(false);

      playChime(next.kind === "error");

      requestAnimationFrame(() => {
        invoke("capture_show_overlay").catch(() => {});
      });

      timers.current.push(
        window.setTimeout(() => setLeaving(true), HOLD_MS),
        window.setTimeout(() => {
          invoke("capture_hide_overlay").catch(() => {});
          setShown(null);
        }, HOLD_MS + FADE_MS),
      );
    },
    [clearTimers],
  );

  useEffect(() => {
    const saved = listen<ClipManifest>("clip_saved", (event) => {
      present({ kind: "saved", clip: event.payload });
    });

    const failed = listen<CaptureError>("clip_error", (event) => {
      if (event.payload.code === "audio_device") return;
      present({ kind: "error", error: event.payload });
    });

    return () => {
      clearTimers();
      saved.then((stop) => stop()).catch(() => {});
      failed.then((stop) => stop()).catch(() => {});
    };
  }, [clearTimers, present]);

  if (!shown) return null;

  if (shown.kind === "error") {
    return (
      <OverlayPanel leaving={leaving}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warn/10 text-warn">
          <AlertTriangle size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-[600] text-fg">
            {t(`overlay.clip.error.${errorKey(shown.error.code)}`, {
              defaultValue: t("overlay.clip.error.generic"),
            })}
          </p>
          <p className="mt-0.5 truncate text-xs text-fg-3">
            {t(`overlay.clip.error.${errorKey(shown.error.code)}.hint`, { defaultValue: "" })}
          </p>
        </div>
      </OverlayPanel>
    );
  }

  const clip = shown.clip;

  const seconds = Math.round(clip.duration_seconds);
  const megabytes = Math.round(clip.size_bytes / 1_000_000);

  return (
    <OverlayPanel leaving={leaving}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-s3 text-fg">
        <Video size={16} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-[600] text-fg">
          {t("overlay.clip.saved")}
          <Check size={14} strokeWidth={2} className="shrink-0 text-ok" />
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-fg-3">
          {t("overlay.clip.details", { seconds, megabytes })}
        </p>
      </div>
    </OverlayPanel>
  );
}

/** The whole overlay window: one flat, opaque panel so it stays readable over any game picture. */
function OverlayPanel({
  leaving,
  children,
}: {
  leaving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateY(6px)" : "translateY(0)",
        transition: `opacity ${FADE_MS}ms var(--ease), transform ${FADE_MS}ms var(--ease)`,
      }}
    >
      <div className="flex h-full w-full items-center gap-3 rounded-xl border border-line-2 bg-s1 px-3.5">
        {children}
      </div>
    </div>
  );
}

function playChime(failed = false) {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const now = context.currentTime;

    const notes = failed
      ? ([
          [740, 0],
          [554, 0.09],
        ] as const)
      : ([
          [880, 0],
          [1318.5, 0.09],
        ] as const);

    for (const [frequency, start] of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.16, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.22);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + 0.24);
    }

    window.setTimeout(() => context.close().catch(() => {}), 800);
  } catch {}
}
