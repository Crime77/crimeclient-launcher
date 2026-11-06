"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Globe, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen, type Event as TauriEvent } from "@tauri-apps/api/event";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { EventType, type EventPayload } from "../../types/events";

interface BrowserLoginModalProps {
  onCancel: () => Promise<void>;
}

/**
 * Progress surface for the browser-based sign-in flow. Lives in its own file
 * because both the account manager and the launch-time login prompt open it.
 */
export function BrowserLoginModal({ onCancel }: BrowserLoginModalProps) {
  const { t } = useTranslation();
  const [loginStatus, setLoginStatus] = useState<string>(t('auth.startingLoginProcess'));
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen<EventPayload>("state_event", (event: TauriEvent<EventPayload>) => {
      const payload = event.payload;

      // Handle error events
      if (payload.event_type === EventType.Error && payload.error) {
        setError(payload.error);
        setLoginStatus(payload.message);
        return;
      }

      // Only handle account login events
      if (
        payload.event_type === EventType.AccountLoginStarted ||
        payload.event_type === EventType.AccountLoginWaitingForBrowser ||
        payload.event_type === EventType.AccountLoginExchangingToken ||
        payload.event_type === EventType.AccountLoginExchangingXboxToken ||
        payload.event_type === EventType.AccountLoginExchangingXstsToken ||
        payload.event_type === EventType.AccountLoginGettingMinecraftToken ||
        payload.event_type === EventType.AccountLoginCheckingEntitlements ||
        payload.event_type === EventType.AccountLoginFetchingProfile ||
        payload.event_type === EventType.AccountLoginCompleted
      ) {
        setError(null); // Clear error on successful progress
        setLoginStatus(payload.message);
        if (payload.progress !== null) {
          setProgress(payload.progress);
        }
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <Modal
      title={t('auth.browserLogin')}
      titleIcon={<Globe size={16} strokeWidth={1.75} />}
      onClose={async () => {
        await onCancel();
      }}
      width="sm"
      footer={
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            icon={<X size={14} strokeWidth={1.75} />}
            size="sm"
          >
            {t('auth.cancelLogin')}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-5">
        <div>
          <h3 className="text-[13px] font-[560] text-fg">{t('auth.signInViaBrowser')}</h3>
          <p className="text-[13px] text-fg-3 mt-1 leading-relaxed">{t('auth.browserLoginDescription')}</p>
        </div>

        {error && (
          <div
            className="flex items-start gap-2.5 border border-err/30 bg-err/10 px-3 py-2.5"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <AlertTriangle size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs">
              <p className="font-[560] text-fg">{t('auth.loginError')}</p>
              <p className="font-mono text-fg-2 mt-0.5 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* progress of the sign-in steps; the accent marks progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline gap-4 text-xs">
            <span className={error ? "text-err" : "text-fg-2"}>{loginStatus}</span>
            {!error && <span className="cc-num text-fg-3">{Math.round(progress)}%</span>}
          </div>
          {!error && (
            <div className="w-full h-1 bg-s3 overflow-hidden" style={{ borderRadius: 2 }}>
              <div
                className="h-full bg-accent transition-[width] duration-slow ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
