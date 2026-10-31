"use client";

import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";
import { useFontStore } from "../../store/font-store";
import { cn } from "../../lib/utils";
import { gsap } from "gsap";
import { useTranslation } from "react-i18next";
import { useEntranceAnimation } from "../../hooks/useEntranceAnimation";

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

  useEntranceAnimation(
    containerRef,
    { opacity: 0, y: 20, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.2)" },
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
        return (
          <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />
        );
      case "downloading":
        return <Icon icon="solar:download-bold" className="w-4 h-4" />;
      case "installing":
        return <Icon icon="solar:box-bold" className="w-4 h-4" />;
      case "uptodate":
      case "finished":
        return <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-300" />;
      case "error":
        return <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 text-red-300" />;
      default:
        return <Icon icon="solar:info-circle-bold" className="w-4 h-4" />;
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
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0b10]">
        <div className="animate-pulse text-white/60 text-xs">
          {t('updater.loading_theme')}
        </div>
      </div>
    );
  }

  const accent = accentColor.value || "#E8314A";
  const accentHover = accentColor.hoverValue || accent;
  const done = status === "uptodate" || status === "finished";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0b10]">
      {/* soft accent light behind the logo, like the start page */}
      <div
        className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full blur-[80px] opacity-35 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 65%)` }}
      />

      <div
        ref={containerRef}
        className="relative h-full w-full flex flex-col items-center text-center border border-white/[0.08]"
      >
        <div className="flex-1 w-full flex flex-col items-center justify-center px-6 gap-6">
          <div className="flex flex-col items-center">
            <img
              src="/logo.png"
              alt="CrimeClient"
              className="w-24 h-24 object-contain mb-3"
              style={{ filter: `drop-shadow(0 6px 18px ${accent}66)` }}
              draggable={false}
            />
            <h1 className="font-display text-xl font-bold text-white leading-tight">CrimeClient Launcher</h1>
            <p className="text-xs text-white/45 mt-1">{t('updater.title')}</p>
          </div>

          <div
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-4 rounded-full max-w-full",
              status === "error" ? "bg-red-500/15 border border-red-400/30" : "cc-glass",
            )}
          >
            {getStatusIcon()}
            <span className="text-xs text-white/85 truncate">
              {done ? t('updater.complete') : statusMessage || t('updater.initializing')}
            </span>
          </div>

          {progress !== null && (
            <div className="w-3/4 h-2 rounded-full overflow-hidden bg-white/[0.08]">
              <div
                ref={progressRef}
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accentHover})`,
                }}
              />
            </div>
          )}
        </div>

        <div className="w-full p-6 flex justify-center min-h-[84px]">
          {status === "error" && (
            <button
              onClick={handleManualClose}
              className="h-9 px-4 flex items-center gap-2 rounded-xl text-sm font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] transition-colors"
            >
              <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
