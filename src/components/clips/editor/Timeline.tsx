"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@iconify/react";
import { RotateCcw } from "lucide-react";

import type { ClipAudioTrack, ClipOverlay, Span } from "../../../services/clip-service";
import { Waveform } from "../ClipTimeline";
import { ClipIconButton } from "../ClipIconButton";
import { Tooltip } from "../../ui/Tooltip";
import { cn } from "../../../lib/utils";
import {
  NUDGE,
  OVERLAY_ICON,
  type TimeView,
  type Translate,
  overlayTint,
  formatTime,
  formatTick,
  rulerTicks,
} from "./shared";
import { holdPointer } from "./useWindowDrag";
import type { MarkEdge } from "./useCuts";

const LINK_MODES: { separate: boolean; icon: string; label: string }[] = [
  { separate: false, icon: "solar:link-bold", label: "clips.editor.link.linked" },
  { separate: true, icon: "solar:link-broken-bold", label: "clips.editor.link.separate" },
];

const LABEL_GAP = 6;

export function Ruler({
  scale,
  duration,
  onScrub,
}: {
  scale: RefObject<HTMLDivElement>;
  duration: number;
  onScrub: (clientX: number) => void;
}) {
  const percent = useCallback((at: number) => (duration > 0 ? (at / duration) * 100 : 0), [duration]);
  const probe = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const [room, setRoom] = useState(0);
  const ticks = useMemo(() => rulerTicks(duration), [duration]);
  const labels = useMemo(
    () => ticks.majors.map((at) => formatTick(at, ticks.step)),
    [ticks],
  );
  const widest = labels.reduce((longest, label) => (label.length > longest.length ? label : longest), "");

  useEffect(() => {
    const track = scale.current;
    const sample = probe.current;
    if (!track || !sample) return;
    const observer = new ResizeObserver(() => {
      setWidth(track.clientWidth);
      setRoom(sample.offsetWidth);
    });
    observer.observe(track);
    observer.observe(sample);
    return () => observer.disconnect();
  }, [scale]);

  const marks = useMemo(() => {
    let edge = -Infinity;
    return ticks.majors.map((at) => {
      const x = (percent(at) / 100) * width;
      const measured = room > 0 && width > 0;
      if (measured && x >= edge && x + room <= width) {
        edge = x + room + LABEL_GAP;
        return { end: false, shown: true };
      }
      if (measured && x - room >= edge) {
        edge = x + LABEL_GAP;
        return { end: true, shown: true };
      }
      return { end: x + 1 > width, shown: false };
    });
  }, [percent, room, ticks, width]);

  return (
    <div
      ref={scale}
      role="presentation"
      onPointerDown={(event) => {
        holdPointer(event);
        onScrub(event.clientX);
      }}
      className="relative h-6 min-w-0 flex-1 cursor-ew-resize overflow-hidden border-b border-line"
    >
      <span
        ref={probe}
        aria-hidden="true"
        className="invisible absolute left-0 top-0 whitespace-nowrap border-l pl-1 font-mono text-[10px]"
      >
        {widest}
      </span>
      {ticks.minors.map((at) => (
        <span
          key={`minor-${at}`}
          className="absolute bottom-0 h-1.5 w-px bg-line-2"
          style={{ left: `${percent(at)}%` }}
        />
      ))}
      {ticks.majors.map((at, index) => (
        <span
          key={`major-${at}`}
          className={cn(
            "absolute bottom-0 top-0 whitespace-nowrap border-line-3 font-mono text-[10px] leading-4 text-fg-3",
            marks[index].end ? "border-r pr-1 text-right" : "border-l pl-1",
          )}
          style={marks[index].end ? { right: `${100 - percent(at)}%` } : { left: `${percent(at)}%` }}
        >
          {marks[index].shown && labels[index]}
        </span>
      ))}
    </div>
  );
}

export function Lane({
  icon,
  name,
  tint,
  height,
  active,
  control,
  tone,
  onPick,
  onScrub,
  children,
}: {
  icon: string;
  name: string;
  tint: string;
  height: string;
  active?: boolean;
  control?: ReactNode;
  tone?: string;
  onPick?: () => void;
  onScrub?: (clientX: number) => void;
  children?: ReactNode;
}) {
  const head = (
    <>
      <Icon icon={icon} className={cn("h-3.5 w-3.5 shrink-0", active ? "text-fg" : "text-fg-3")} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[11px] font-[520] uppercase tracking-[0.06em]",
          active ? "text-fg" : "text-fg-3",
        )}
      >
        {name}
      </span>
    </>
  );

  return (
    <div className="flex">
      <div
        className={cn(
          "flex w-[9.5rem] shrink-0 flex-col justify-center gap-1 rounded-l-sm border-y border-l px-2.5 transition-colors duration-fast",
          active ? "border-line-3 bg-s3" : "border-line bg-s2",
          height,
        )}
      >
        {onPick ? (
          <button
            type="button"
            onClick={onPick}
            aria-pressed={active}
            className="flex w-full min-w-0 items-center gap-2 focus:outline-none"
          >
            {head}
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">{head}</div>
        )}
        {control}
      </div>
      <div
        role="presentation"
        onPointerDown={
          onScrub
            ? (event) => {
                holdPointer(event);
                onScrub(event.clientX);
              }
            : undefined
        }
        className={cn(
          "relative min-w-0 flex-1 overflow-hidden rounded-r-sm border bg-s2 text-fg-3",
          active ? "border-line-3" : "border-line",
          height,
          onScrub && "cursor-ew-resize",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function TrackLink({
  separate,
  color,
  disabled,
  onChange,
  t,
}: {
  separate: boolean;
  color: string;
  disabled: boolean;
  onChange: (separate: boolean) => void;
  t: Translate;
}) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-px rounded-md border border-line bg-s2 p-0.5">
      {LINK_MODES.map((mode) => {
        const on = separate === mode.separate;
        return (
          <button
            key={mode.label}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(mode.separate)}
            className={cn(
              "flex h-full items-center gap-1.5 rounded-sm px-2 text-xs transition-colors duration-fast",
              on ? "bg-s3 text-fg" : "text-fg-3",
              disabled
                ? "cursor-not-allowed opacity-40"
                : !on && "hover:text-fg",
            )}
          >
            <Icon icon={mode.icon} className="h-3.5 w-3.5 shrink-0" />
            {t(mode.label)}
          </button>
        );
      })}
    </div>
  );
}

export function AudioLane({
  track,
  name,
  movable,
  volume,
  view,
  tone,
  disabled,
  clipFrom,
  clipTo,
  from,
  to,
  trimmed,
  trimming,
  onChange,
  active,
  onSelect,
  onPick,
  onTrim,
  onTrimNudge,
  onTrimReset,
  marks,
  t,
}: {
  track: ClipAudioTrack;
  name: string;
  movable: boolean;
  volume: number;
  view: TimeView;
  tone: string;
  disabled: boolean;
  clipFrom: number;
  clipTo: number;
  from: number;
  to: number;
  trimmed: boolean;
  trimming: "start" | "end" | null;
  onChange: (volume: number) => void;
  active: boolean;
  onSelect: () => void;
  onPick: (clientX: number) => void;
  onTrim: (edge: "start" | "end") => void;
  onTrimNudge: (edge: "start" | "end", by: number) => void;
  onTrimReset: () => void;
  marks: ReactNode;
  t: Translate;
}) {
  const muted = volume === 0;
  const trimmable = movable && !disabled;
  const at = view.percent;

  return (
    <Lane
      icon={track.label === "Microphone" ? "solar:microphone-bold" : "solar:soundwave-bold"}
      name={name}
      tint={tone}
      tone={tone}
      height="h-14"
      active={active}
      onPick={onSelect}
      onScrub={onPick}
      control={
        track.adjustable ? (
          <div className="flex items-center justify-end gap-1">
            <span
              className={cn(
                "w-9 text-right font-mono text-[11px] tabular-nums",
                volume === 100 ? "text-fg-3" : "text-fg",
              )}
            >
              {volume}%
            </span>
            <ClipIconButton
              icon={muted ? "solar:volume-cross-bold" : "solar:volume-loud-bold"}
              label={muted ? t("clips.trim.unmute") : t("clips.trim.mute")}
              tooltipPosition="top"
              aria-pressed={muted}
              disabled={disabled}
              onClick={() => onChange(muted ? 100 : 0)}
              className={cn("h-6 w-6", muted && "text-fg-4 enabled:hover:text-fg-2")}
            />
          </div>
        ) : undefined
      }
    >
      <Pieces view={view}>
        <Waveform peaks={track.peaks} gain={volume / 100} muted={muted} />
      </Pieces>

      {marks}

      {trimmable && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            className="absolute inset-y-0 bg-bg/75"
            style={{
              left: `${at(clipFrom)}%`,
              width: `${Math.max(0, at(from) - at(clipFrom))}%`,
            }}
          />
          <div
            className="absolute inset-y-0 bg-bg/75"
            style={{ left: `${at(to)}%`, width: `${Math.max(0, at(clipTo) - at(to))}%` }}
          />
          <Handle
            left={at(from)}
            active={trimming === "start"}
            time={formatTime(view.toView(from))}
            label={t("clips.editor.audio.trim_start", { name })}
            color={tone}
            onGrab={() => onTrim("start")}
            onNudge={(by) => onTrimNudge("start", by)}
          />
          <Handle
            left={at(to)}
            active={trimming === "end"}
            time={formatTime(view.toView(to))}
            label={t("clips.editor.audio.trim_end", { name })}
            color={tone}
            onGrab={() => onTrim("end")}
            onNudge={(by) => onTrimNudge("end", by)}
          />
        </div>
      )}

      {trimmable && trimmed && (
        <Tooltip
          content={t("clips.editor.audio.trim_reset")}
          position="top"
          wrapperClassName="absolute left-1/2 top-1 z-20 -translate-x-1/2"
        >
          <button
            type="button"
            aria-label={t("clips.editor.audio.trim_reset")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onTrimReset}
            className="rounded-sm border border-line-2 bg-bg/90 px-1.5 py-px font-mono text-[11px] tabular-nums text-fg transition-colors duration-fast hover:border-line-3"
          >
            {`${(to - from).toFixed(1)} s`}
          </button>
        </Tooltip>
      )}
    </Lane>
  );
}

export function OverlayLane({
  overlay,
  view,
  active,
  accent,
  name,
  disabled,
  onPick,
  onGrab,
}: {
  overlay: ClipOverlay;
  view: TimeView;
  active: boolean;
  accent: string;
  name: string;
  disabled: boolean;
  onPick: () => void;
  onGrab: (mode: "move" | "start" | "end", event: { clientX: number }) => void;
}) {
  const tint = overlayTint(overlay, accent);
  const left = view.percent(overlay.startSeconds);
  const width = view.percent(overlay.endSeconds) - left;

  return (
    <Lane
      icon={OVERLAY_ICON[overlay.kind]}
      name={name}
      tint={tint}
      height="h-9"
      active={active}
      onPick={onPick}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={name}
        aria-pressed={active}
        onPointerDown={(event) => {
          event.preventDefault();
          if (disabled) return;
          holdPointer(event);
          onGrab("move", event);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onPick();
        }}
        className={cn(
          "absolute inset-y-1 flex items-center justify-center gap-1.5 rounded-sm border focus:outline-none",
          active ? "border-fg/70 bg-s4" : "border-line-3 bg-s3",
          disabled ? "cursor-not-allowed" : "cursor-grab",
        )}
        style={{
          left: `${left}%`,
          width: `${width}%`,
        }}
      >
        <span className="pointer-events-none h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: tint }} />
        <span className="pointer-events-none truncate pr-2 text-xs text-fg">
          {name}
        </span>
        <span
          role="presentation"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (disabled) return;
            holdPointer(event);
            onGrab("start", event);
          }}
          className={cn("absolute inset-y-0 left-0 w-1.5 rounded-l-sm bg-fg/25", !disabled && "cursor-ew-resize hover:bg-fg/60")}
        />
        <span
          role="presentation"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (disabled) return;
            holdPointer(event);
            onGrab("end", event);
          }}
          className={cn("absolute inset-y-0 right-0 w-1.5 rounded-r-sm bg-fg/25", !disabled && "cursor-ew-resize hover:bg-fg/60")}
        />
      </div>
    </Lane>
  );
}

export function Readout({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex shrink-0 items-baseline gap-1.5 leading-none">
      <span className="text-[10.5px] font-[520] uppercase tracking-[0.06em] text-fg-3">
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          strong ? "text-[13px] text-fg" : "text-xs text-fg-2",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function Handle({
  left,
  active,
  time,
  label,
  color,
  disabled = false,
  onGrab,
  onNudge,
}: {
  left: number;
  active: boolean;
  time: string;
  label: string;
  color: string;
  disabled?: boolean;
  onGrab: () => void;
  onNudge: (by: number) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (disabled) return;
        holdPointer(event);
        onGrab();
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        if (disabled) return;
        const step = event.shiftKey ? NUDGE * 10 : NUDGE;
        onNudge(event.key === "ArrowLeft" ? -step : step);
      }}
      className={cn(
        "group pointer-events-auto absolute inset-y-0 w-6 -translate-x-1/2 focus:outline-none",
        disabled ? "cursor-not-allowed" : "cursor-ew-resize",
      )}
      style={{ left: `${left}%` }}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full transition-opacity duration-fast",
          active ? "opacity-100" : "opacity-80 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        style={{ backgroundColor: color }}
      />
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-sm border border-line-2 bg-bg/90 px-1.5 py-px font-mono text-[11px] text-fg transition-opacity duration-fast",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {time}
      </span>
    </button>
  );
}

export function ClipMasks({
  from,
  to,
  color,
  view,
}: {
  from: number;
  to: number;
  color: string;
  view: TimeView;
}) {
  const percent = view.percent;
  return (
    <>
      <div
        className="absolute inset-y-0 left-0 bg-bg/75"
        style={{ width: `${percent(from)}%` }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-bg/75"
        style={{ width: `${100 - percent(to)}%` }}
      />
      <div
        className="absolute inset-y-0 border-x-2"
        style={{
          left: `${percent(from)}%`,
          width: `${Math.max(0, percent(to) - percent(from))}%`,
          borderColor: color,
        }}
      />
    </>
  );
}

export function ClipHandles({
  from,
  to,
  dragging,
  color,
  disabled,
  view,
  onGrab,
  onMove,
  t,
}: {
  from: number;
  to: number;
  dragging: "start" | "end" | null;
  color: string;
  disabled: boolean;
  view: TimeView;
  onGrab: (which: "start" | "end") => void;
  onMove: (which: "start" | "end", seconds: number) => void;
  t: Translate;
}) {
  return (
    <>
      <Handle
        left={view.percent(from)}
        active={dragging === "start"}
        time={formatTime(view.toView(from))}
        label={t("clips.trim.handle_start")}
        color={color}
        disabled={disabled}
        onGrab={() => onGrab("start")}
        onNudge={(by) => onMove("start", view.shift(from, by))}
      />
      <Handle
        left={view.percent(to)}
        active={dragging === "end"}
        time={formatTime(view.toView(to))}
        label={t("clips.trim.handle_end")}
        color={color}
        disabled={disabled}
        onGrab={() => onGrab("end")}
        onNudge={(by) => onMove("end", view.shift(to, by))}
      />
    </>
  );
}

const CUT_COLOR = "rgb(var(--err-ch) / 0.85)";

export function CutRange({
  span,
  color,
  dragging,
  view,
  label,
  startLabel,
  endLabel,
  className,
  onGrab,
  onNudge,
}: {
  span: Span;
  color: string;
  dragging: MarkEdge | null;
  view: TimeView;
  label: string;
  startLabel: string;
  endLabel: string;
  className: string;
  onGrab: (edge: MarkEdge, clientX: number) => void;
  onNudge: (edge: "start" | "end", by: number) => void;
}) {
  const left = view.percent(span.startSeconds);
  const right = view.percent(span.endSeconds);
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 z-20", className)}>
      <div
        role="presentation"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          holdPointer(event);
          onGrab("move", event.clientX);
        }}
        className={cn(
          "pointer-events-auto absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-sm border border-err/70 bg-err/15",
          dragging === "move" ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          left: `${left}%`,
          width: `${right - left}%`,
        }}
      >
        <span className="pointer-events-none truncate rounded-sm bg-bg/80 px-1.5 text-[11px] text-fg">
          {label}
        </span>
      </div>
      <Handle
        left={left}
        active={dragging === "start"}
        time={formatTime(view.toView(span.startSeconds))}
        label={startLabel}
        color={CUT_COLOR}
        onGrab={() => onGrab("start", 0)}
        onNudge={(by) => onNudge("start", by)}
      />
      <Handle
        left={right}
        active={dragging === "end"}
        time={formatTime(view.toView(span.endSeconds))}
        label={endLabel}
        color={CUT_COLOR}
        onGrab={() => onGrab("end", 0)}
        onNudge={(by) => onNudge("end", by)}
      />
    </div>
  );
}

function RestoreButton({ disabled, onRestore, t }: { disabled: boolean; onRestore: () => void; t: Translate }) {
  return (
    <Tooltip
      content={t("clips.editor.remove.restore")}
      position="top"
      wrapperClassName="pointer-events-auto absolute left-1/2 top-0.5 z-10 -translate-x-1/2"
    >
      <button
        type="button"
        aria-label={t("clips.editor.remove.restore")}
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onRestore}
        className="flex h-4 w-4 items-center justify-center rounded-sm border border-line-2 bg-bg text-fg-3 transition-colors duration-fast hover:text-fg"
      >
        <RotateCcw size={10} strokeWidth={2} />
      </button>
    </Tooltip>
  );
}

export function GapBlock({
  span,
  disabled,
  view,
  onRestore,
  t,
}: {
  span: Span;
  disabled: boolean;
  view: TimeView;
  onRestore: () => void;
  t: Translate;
}) {
  const left = view.percent(span.startSeconds);
  return (
    <div
      className="absolute inset-y-0 border-x border-dashed border-line-3 bg-bg/90"
      style={{ left: `${left}%`, width: `${view.percent(span.endSeconds) - left}%` }}
    >
      <RestoreButton disabled={disabled} onRestore={onRestore} t={t} />
    </div>
  );
}

export function JoinMark({
  span,
  color,
  disabled,
  view,
  onRestore,
  t,
}: {
  span: Span;
  color: string;
  disabled: boolean;
  view: TimeView;
  onRestore: () => void;
  t: Translate;
}) {
  return (
    <div
      className="absolute bottom-0 top-[1.875rem] w-0.5 -translate-x-1/2"
      style={{ left: `${view.percent(span.startSeconds)}%`, backgroundColor: "var(--fg-3)" }}
    >
      <RestoreButton disabled={disabled} onRestore={onRestore} t={t} />
    </div>
  );
}

export function Pieces({ view, children }: { view: TimeView; children: ReactNode }) {
  return (
    <>
      {view.pieces.map((piece) => {
        const left = view.percent(piece.startSeconds);
        const length = piece.endSeconds - piece.startSeconds;
        return (
          <div
            key={piece.startSeconds}
            className="pointer-events-none absolute inset-y-0 overflow-hidden"
            style={{ left: `${left}%`, width: `${view.percent(piece.endSeconds) - left}%` }}
          >
            <div
              className="absolute inset-y-0"
              style={{
                left: `${(-piece.startSeconds / length) * 100}%`,
                width: `${(view.whole / length) * 100}%`,
              }}
            >
              {children}
            </div>
          </div>
        );
      })}
    </>
  );
}
