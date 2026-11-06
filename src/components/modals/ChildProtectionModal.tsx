"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type Event as TauriEvent, listen } from "@tauri-apps/api/event";
import {
  type EventPayload as FrontendEventPayload,
  EventType as FrontendEventType,
} from "../../types/events";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { openExternalUrl } from "../../services/tauri-service";

export default function ChildProtectionModal() {
  // The listener lives for the whole session, so it asks the i18n instance (stable) for the texts at the
  // moment the error comes in: a `t` captured at mount would keep the language of the first render.
  const { i18n } = useTranslation();
  const { showModal, hideModal } = useGlobalModal();

  useEffect(() => {
    const unlisten = listen<FrontendEventPayload>("state_event", (event: TauriEvent<FrontendEventPayload>) => {
      try {
        if (event.payload.event_type === FrontendEventType.Error && event.payload.error) {
          const errorText = event.payload.error.toLowerCase();

          // Detect the child-protection / InsufficientPrivileges case conservatively
          if (
            errorText.includes("child protection") ||
            errorText.includes("insufficientprivilegesexception") ||
            errorText.includes("/session/minecraft/join")
          ) {
            // Async flow to check active account and show modal
            (async () => {
              try {
                const t = i18n.t.bind(i18n);
                const gamertag = encodeURIComponent(event.payload.message ?? "");
                showModal(
                  "child-protection-modal",
                  <Modal
                    title={t('child_protection.title')}
                    titleIcon={<ShieldAlert size={16} strokeWidth={1.75} className="text-warn" />}
                    onClose={async () => {
                      hideModal("child-protection-modal");
                    }}
                    width="md"
                    variant="flat"
                    footer={
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => hideModal("child-protection-modal")}
                        >
                          {t('child_protection.button.ignore')}
                        </Button>
                        <Button
                          onClick={() => openExternalUrl(`https://www.xbox.com/user/settings/privacy-and-safety?gamertag=${gamertag}&activetab=main:privilegetab`)}
                          variant="secondary"
                          size="sm"
                          iconPosition="right"
                          icon={<ArrowUpRight size={14} strokeWidth={1.75} />}
                        >
                          {t('child_protection.button.open_settings')}
                        </Button>
                      </div>
                    }
                  >
                    <div className="p-5 space-y-3 text-[13px] text-fg-2 leading-relaxed">
                      <p>{t('child_protection.description')}</p>
                      <p>{t('child_protection.review_settings')}</p>
                      <p
                        className="text-xs text-fg-3 border-l-2 border-line-2 pl-3"
                      >
                        {t('child_protection.setting_location')}
                      </p>
                    </div>
                  </Modal>,
                );
              } catch (e) {
                console.error("Failed to handle child-protection modal logic:", e);
              }
            })();
          }
        }
      } catch (e) {
        console.error("Error handling state_event in ChildProtectionModal:", e);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
    // showModal/hideModal are stable from the hook, i18n is one instance for the app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
