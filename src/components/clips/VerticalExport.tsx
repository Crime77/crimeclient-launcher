"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "../ui/buttons/Button";
import { Modal } from "../ui/Modal";
import { StatusMessage } from "../ui/StatusMessage";
import { exportVertical, samePath } from "../../services/clip-service";
import { useClipEngineEvents, writeFailed } from "./useClipEngineEvents";
import { parseErrorMessage } from "../../utils/error-utils";
import { cn } from "../../lib/utils";

const RATIO = 9 / 16;

interface Props {
  src: string;
  path: string;
  onClose: () => void;
  onDone: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

type Stage =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "failed"; why: string };

export function VerticalExport({ src, path, onClose, onDone, t }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useClipEngineEvents({
    clip_export_progress: (progress) => {
      if (!samePath(progress.source, path)) return;
      setStage({ kind: "running", done: progress.done, total: progress.total });
    },
    clip_exported: (clip) => {
      if (!samePath(clip.source, path)) return;
      onDone();
    },
    clip_error: (error) => {
      if (stage.kind === "running" && writeFailed(error, path)) {
        setStage({ kind: "failed", why: t("clips.trim.failed") });
      }
    },
    clip_engine_stopped: () => {
      if (stage.kind === "running") setStage({ kind: "failed", why: t("clips.trim.failed") });
    },
  });

  const start = async () => {
    setStage({ kind: "running", done: 0, total: 0 });
    try {
      await exportVertical(path);
    } catch (e) {
      console.error("Could not start the vertical export", e);
      setStage({ kind: "failed", why: parseErrorMessage(e) });
    }
  };

  const kept = size
    ? size.width / size.height > RATIO
      ? { width: Math.round(size.height * RATIO) & ~1, height: size.height & ~1 }
      : { width: size.width & ~1, height: Math.round(size.width / RATIO) & ~1 }
    : null;

  const running = stage.kind === "running";
  const percent =
    stage.kind === "running" && stage.total > 0
      ? Math.round((stage.done / stage.total) * 100)
      : null;

  const footer = (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        {running ? (
          <div className="flex flex-col gap-2">
            <div className="h-[2px] overflow-hidden bg-s3">
              <div
                className={cn(
                  "h-full bg-accent transition-[width] duration-med",
                  percent === null && "w-1/3 animate-pulse",
                )}
                style={{
                  width: percent === null ? undefined : `${Math.max(2, percent)}%`,
                }}
              />
            </div>
            <p className="font-mono text-[11px] text-fg-3">
              {percent === null
                ? t("clips.vertical.starting")
                : t("clips.vertical.progress", { percent })}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[11px] text-fg-3">
            {kept
              ? t("clips.vertical.result", { width: kept.width, height: kept.height })
              : t("clips.vertical.measuring")}
          </p>
        )}
      </div>

      {!running && (
        <Button
          variant="default"
          size="sm"
          icon={<Smartphone size={15} strokeWidth={1.75} />}
          onClick={() => void start()}
          disabled={!kept}
        >
          {stage.kind === "failed" ? t("clips.vertical.retry") : t("clips.vertical.create")}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      title={t("clips.vertical.title")}
      titleIcon={<Smartphone size={16} strokeWidth={1.75} />}
      titleSubtitle={
        <span className="text-xs text-fg-3">{t("clips.vertical.subtitle")}</span>
      }
      onClose={onClose}
      width="lg"
      closeOnClickOutside={!running}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4">
        {stage.kind === "failed" && (
          <StatusMessage type="error" message={stage.why} className="mb-0" />
        )}

        <div className="relative overflow-hidden rounded-md border border-line bg-black">
          <video
            src={src}
            muted
            playsInline
            loop
            autoPlay
            onLoadedMetadata={(event) =>
              setSize({
                width: event.currentTarget.videoWidth,
                height: event.currentTarget.videoHeight,
              })
            }
            className="max-h-[52vh] w-full object-contain"
          />

          {kept && size && (
            <div className="pointer-events-none absolute inset-0 flex justify-center">
              <div className="h-full flex-1 bg-black/70" />
              <div
                className="h-full shrink-0 border-x border-fg/80"
                style={{
                  width: `${(kept.width / size.width) * 100}%`,
                }}
              />
              <div className="h-full flex-1 bg-black/70" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
