"use client";

import type React from "react";
import { useRef } from "react";
import { toast as hotToast, Toaster as HotToaster } from "react-hot-toast";
import { gsap } from "gsap";
import { useThemeStore } from "../../store/useThemeStore";
import { usePlayerAvatar } from "../../hooks/usePlayerAvatar";
import {
  getToastVariantStyles,
  getToastBaseStyles,
  TOAST_BASE_CLASSES
} from "./design-system";

function PlayerToastContent({ message, uuid }: { message: string; uuid: string }) {
  const avatarUrl = usePlayerAvatar({ uuid, size: 32 });

  return (
    <div className="flex items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-7 h-7 rounded-sm flex-shrink-0"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <div className="w-7 h-7 rounded-sm flex-shrink-0 bg-s3 animate-skeleton-pulse" />
      )}
      <span>{message}</span>
    </div>
  );
}

export const toast = {
  success: (message: string) => {
    const id = hotToast.success(message);
    animateToast(id);
    return id;
  },
  error: (message: string) => {
    const id = hotToast.error(message);
    animateToast(id);
    return id;
  },
  loading: (message: string) => {
    const id = hotToast.loading(message);
    animateToast(id);
    return id;
  },
  info: (message: string) => {
    const id = hotToast(message);
    animateToast(id);
    return id;
  },
  player: (message: string, uuid: string) => {
    const id = hotToast(
      (t) => <PlayerToastContent message={message} uuid={uuid} />,
      { duration: 3000 }
    );
    animateToast(id);
    return id;
  },
  custom: (message: string, icon?: React.ReactNode) => {
    const id = hotToast.custom((t) => (
      <div className="flex items-center gap-2.5">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <span>{message}</span>
      </div>
    ));
    animateToast(id);
    return id;
  },
  dismiss: (id?: string) => {
    hotToast.dismiss(id);
  },
};

function animateToast(id: string) {
  setTimeout(() => {
    const toastElement = document.getElementById(`toast-${id}`);
    if (toastElement) {
      gsap.fromTo(
        toastElement,
        {
          y: 6,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.26,
          ease: "power3.out",
        },
      );
    }
  }, 10);
}

export function GlobalToaster() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const toasterRef = useRef<HTMLDivElement>(null);

  // flat raised toasts; the state shows only as the 2 px stripe on the left and the icon
  const baseStyles = getToastBaseStyles({ accentColor: accentColor.value, borderRadius });

  return (
    <div ref={toasterRef}>
      <HotToaster
        position="bottom-right"
        gutter={8}
        toastOptions={{
          className: TOAST_BASE_CLASSES,
          style: baseStyles,
          success: {
            style: getToastVariantStyles("success", accentColor.value),
            iconTheme: {
              primary: "#5fb98e",
              secondary: "#0e0e0f",
            },
          },
          error: {
            style: getToastVariantStyles("error", accentColor.value),
            iconTheme: {
              primary: "#e5484d",
              secondary: "#edebe8",
            },
          },
          loading: {
            style: getToastVariantStyles("loading", accentColor.value),
            iconTheme: {
              primary: accentColor.value,
              secondary: "rgba(255,255,255,0.12)",
            },
            duration: Infinity,
          },
          duration: 3000,
        }}
      />
    </div>
  );
}
