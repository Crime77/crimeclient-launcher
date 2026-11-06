"use client";

import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AlertTriangle, Check, Download, Info, Loader2, Package, X } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { useFontStore } from "../../store/font-store";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useTranslation } from "react-i18next";
import { useEntranceAnimation } from "../../hooks/useEntranceAnimation";
import { getAppVersion } from "../../services/launcher-config-service";
import { Button } from "../ui/buttons/Button";

interface UpdaterStatusPayload {
  message: string;
  status:
    | "checking"
    | "downloading"
    | "installing"
    | "uptodate"
    | "pending"
    | "error"
    | "finished"
    | "close";
  progress?: number;
  total?: number;
  chunk?: number;
}

/** Small window shown while the launcher updates itself at start (only opens when an update was found). */
export default function Updater() {
  const { t } = useTranslation();
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] =
    useState<UpdaterStatusPayload["status"]>("checking");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appWindow = getCurrentWindow();
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const accentColor = useThemeStore((state) => state.accentColor);

  useEffect(() => {
    const checkThemeLoaded = () => {
      if (accentColor && accentColor.value) {
        setIsThemeLoaded(true);
        return;
      }
      setTimeout(checkThemeLoaded, 50);
    };
    checkThemeLoaded();
  }, [accentColor]);

  useEffect(() => {
    useFontStore.getState().applyFontToDOM();
  }, []);

  // the installed version, shown in mono in the footer
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => setVersion(null));
  }, []);

  useEntranceAnimation(
    containerRef,
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" },
  );

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const unlistenPromise = listen<UpdaterStatusPayload>(
      "updater_status",
      (event) => {
        const {
          message,
          status: newStatus,
          progress: eventProgress,
        } = event.payload;

        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }

        // the backend's English texts only show for errors; every other step has its own translated line
        const stepText: Partial<Record<UpdaterStatusPayload["status"], string>> = {
          checking: t("updater.checking"),
          pending: t("updater.found"),
          installing: t("updater.installing"),
        };
        setStatusMessage(stepText[newStatus] ?? message);
        setStatus(newStatus);

        if (
          newStatus === "downloading" &&
          typeof eventProgress === "number" &&
          eventProgress >= 0 &&
          eventProgress <= 100
        ) {
          setProgress(eventProgress);
          setStatusMessage(t('updater.downloading', { progress: eventProgress }));

          if (progressRef.current) {
            gsap.to(progressRef.current, {
              width: `${eventProgress}%`,
              duration: 0.3,
              ease: "power1.out",
            });
          }
        } else {
          setProgress(null);
        }

        switch (newStatus) {
          case "uptodate":
          case "finished":
            appWindow
              .close()
              .catch((err: Error) =>
                console.error(
                  "Failed to close updater window on completion:",
                  err,
                ),
              );
            break;
          case "error":
            break;
          case "close":
            appWindow
              .close()
              .catch((err: Error) =>
                console.error(
                  "Failed to close updater window on 'close' event:",
                  err,
                ),
              );
            break;
        }
      },
    );

    return () => {
      unlistenPromise
        .then((f) => f())
        .catch((err: Error) =>
          console.error("Failed to unlisten updater events:", err),
        );
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [appWindow]);

  const getStatusIcon = () => {
    switch (status) {
      case "checking":
        return <Loader2 size={14} strokeWidth={1.75} className="animate-spin text-fg-3" />;
      case "downloading":
        return <Download size={14} strokeWidth={1.75} className="text-fg-3" />;
      case "installing":
        return <Package size={14} strokeWidth={1.75} className="text-fg-3" />;
      case "uptodate":
      case "finished":
        return <Check size={14} strokeWidth={2} className="text-ok" />;
      case "error":
        return <AlertTriangle size={14} strokeWidth={1.75} className="text-err" />;
      default:
        return <Info size={14} strokeWidth={1.75} className="text-fg-3" />;
    }
  };

  const handleManualClose = () => {
    appWindow
      .close()
      .catch((err: Error) =>
        console.error("Failed to close updater window:", err),
      );
  };

  if (!isThemeLoaded || !accentColor || !accentColor.value) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <div className="text-xs text-fg-3">
          {t('updater.loading_theme')}
        </div>
      </div>
    );
  }

  const done = status === "uptodate" || status === "finished";
  const isError = status === "error";
  // the step line; while downloading the percentage stands on its own in mono
  const stepText = done
    ? t('updater.complete')
    : status === "downloading" && progress !== null
      ? t('updater.downloading_step')
      : statusMessage || t('updater.initializing');
  const barWidth = done ? 100 : progress ?? 0;

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden border border-line bg-bg text-fg">
      {/* drag strip: the window has no frame */}
      <div className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-line pl-3" data-tauri-drag-region>
        <img src="/logo.png" alt="" draggable={false} className="pointer-events-none h-3.5 w-3.5 object-contain" />
        <span className="pointer-events-none text-xs font-[600] text-fg-2">CrimeClient</span>
        <span className="flex-1 self-stretch" data-tauri-drag-region />
        {version && (
          <span className="pointer-events-none pr-3 font-mono text-[11px] text-fg-4">v{version}</span>
        )}
        {isError && (
          <button type="button" className="cc-window-btn is-close h-full" title={t('common.close')} onClick={handleManualClose}>
            <X size={15} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" data-tauri-drag-region>
          <img
            src="/logo.png"
            alt="CrimeClient"
            className="pointer-events-none h-14 w-14 object-contain"
            draggable={false}
          />
          <h1 className="pointer-events-none mt-4 font-display text-[20px] font-[650] leading-tight text-fg">CrimeClient</h1>
          <p className="pointer-events-none mt-1 text-xs text-fg-3">{t('updater.title')}</p>
        </div>

        <div className="px-6 pb-6">
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="flex-shrink-0">{getStatusIcon()}</span>
            <span className={cn("min-w-0 flex-1 text-left", isError ? "line-clamp-2 text-err" : "truncate text-fg-2")}>
              {stepText}
            </span>
            {progress !== null && !done && (
              <span className="flex-shrink-0 font-mono text-[11px] text-fg-2">{progress}%</span>
            )}
          </div>

          <div className="h-[2px] w-full overflow-hidden bg-s3">
            <div
              ref={progressRef}
              className={cn("h-full", isError ? "bg-err/60" : "bg-accent")}
              style={{ width: `${barWidth}%` }}
            />
          </div>

          {isError && (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="xs" onClick={handleManualClose}>
                {t('common.close')}
              </Button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
