"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import type { Span } from "../../../services/clip-service";
import { formatTime, type TimeView } from "./shared";

const SETTLE_EVERY_MS = 50;

interface LiveTime {
  get: () => number;
  set: (seconds: number) => void;
  subscribe: (listener: () => void) => () => void;
}

function useLiveTime(live: LiveTime) {
  return useSyncExternalStore(live.subscribe, live.get);
}

export function usePlayhead(video: RefObject<HTMLVideoElement | null>) {
  const [playhead, setPlayhead] = useState(0);
  const settled = useRef(0);

  const live = useMemo<LiveTime>(() => {
    let value = 0;
    const listeners = new Set<() => void>();
    return {
      get: () => value,
      set: (seconds) => {
        value = seconds;
        listeners.forEach((listener) => listener());
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  }, []);

  const moveTo = useCallback(
    (seconds: number) => {
      live.set(seconds);
      settled.current = performance.now();
      setPlayhead(seconds);
    },
    [live],
  );

  const follow = useCallback(
    (seconds: number) => {
      live.set(seconds);
      const now = performance.now();
      if (video.current && !video.current.paused && now - settled.current < SETTLE_EVERY_MS) return;
      settled.current = now;
      setPlayhead(seconds);
    },
    [live, video],
  );

  return { playhead, live, moveTo, follow };
}

export function PlayheadClock({ live, view, color }: { live: LiveTime; view: TimeView; color: string }) {
  const seconds = useLiveTime(live);
  return (
    <span className="min-w-0 truncate font-mono text-[13px] tabular-nums leading-none text-fg">
      {formatTime(view.toView(seconds))}
    </span>
  );
}

export function PlayheadMark({ live, view, color }: { live: LiveTime; view: TimeView; color: string }) {
  const left = `${view.percent(useLiveTime(live))}%`;
  return (
    <>
      <div className="absolute inset-y-0 w-px -translate-x-1/2 bg-fg" style={{ left }} />
      <span
        className="absolute top-0 h-3 w-2.5 -translate-x-1/2 bg-fg"
        style={{
          left,
          clipPath: "polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%)",
        }}
      />
    </>
  );
}

export function BlankCover({ live, blanked }: { live: LiveTime; blanked: Span[] }) {
  const seconds = useLiveTime(live);
  if (!blanked.some((span) => seconds >= span.startSeconds && seconds < span.endSeconds)) return null;
  return <div className="pointer-events-none absolute inset-0 bg-black" />;
}
