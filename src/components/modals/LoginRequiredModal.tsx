"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { Loader2, LogIn, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useAddMinecraftAccount } from "../../hooks/useAddMinecraftAccount";

interface LoginRequiredModalProps {
  onClose: () => void;
  /** Name of the profile the user tried to launch, shown as context. */
  profileName?: string;
  /** Fired once an account is active, so the interrupted launch can resume. */
  onAuthenticated?: () => void;
}

/**
 * Shown when Play is pressed without a signed-in account.
 *
 * The backend would otherwise reject the launch with a bare
 * `NoCredentialsError`, surfacing as a red toast — a poor thing to hand a new
 * user. This takes over before the launch is attempted and turns the dead end
 * into the sign-in step, resuming the launch afterwards.
 *
 * Uses the shared `Modal` rather than its own surface: this appears inside the
 * running app alongside every other dialog, so looking different from them
 * would read as a style break, not as polish. The welcome screen can afford its
 * own look because it stands alone as the front door.
 */
export function LoginRequiredModal({
  onClose,
  profileName,
  onAuthenticated,
}: LoginRequiredModalProps) {
  const { t } = useTranslation();
  const isLoading = useMinecraftAuthStore((s) => s.isLoading);
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const { startLogin } = useAddMinecraftAccount();

  // Resume the launch the moment an account becomes active. Guarded by a ref so
  // a re-render after closing cannot fire it twice.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!activeAccount || resumedRef.current) return;
    resumedRef.current = true;
    onClose();
    onAuthenticated?.();
  }, [activeAccount, onClose, onAuthenticated]);

  return (
    <Modal
      title={t("auth.login_required.headline")}
      titleIcon={<LogIn size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("auth.login_required.later")}
          </Button>
          <Button
            onClick={startLogin}
            disabled={isLoading}
            variant="default"
            size="sm"
            icon={
              isLoading ? (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Icon icon="simple-icons:microsoft" className="w-3.5 h-3.5" />
              )
            }
          >
            {isLoading ? t("auth.login_required.cta_loading") : t("auth.login_required.cta")}
          </Button>
        </div>
      }
    >
      <div className="p-5">
        {profileName && (
          <div className="flex items-center gap-2 mb-3 text-xs text-fg-3 min-w-0">
            <Play size={12} strokeWidth={2} className="flex-shrink-0" />
            <span className="truncate">{t("auth.login_required.for_profile", { profile: profileName })}</span>
          </div>
        )}

        <p className="text-[13px] text-fg-2 leading-relaxed">
          {t("auth.login_required.description")}
        </p>
      </div>
    </Modal>
  );
}
