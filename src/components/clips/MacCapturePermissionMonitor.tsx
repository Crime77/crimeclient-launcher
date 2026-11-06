import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useCapturePermissionsStore } from "../../store/capture-permissions-store";
import { useClipsStore } from "../../store/clips-store";
import { useSettingsModalStore } from "../../store/settings-modal-store";
import { isMacOS, supportsClips } from "../../utils/platform";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";

export function MacCapturePermissionMonitor() {
  const { t } = useTranslation();
  const enabled = useClipsStore((state) => state.enabled);
  const loaded = useClipsStore((state) => state.loaded);
  const { check, notice, dismiss } = useCapturePermissionsStore();
  const supported = isMacOS() && supportsClips();
  useEffect(() => {
    if (!supported || !loaded) return;
    const refresh = () => {
      void check();
    };
    refresh();
    if (!enabled) return;
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [check, enabled, loaded, supported]);

  if (!supported || !notice) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1100]">
      <Modal
        title={t(`settings.clips.permissions.${notice.reason}.title`)}
        onClose={dismiss}
        width="sm"
        footer={
          <Button
            onClick={() => {
              dismiss();
              useSettingsModalStore.getState().open("clips");
            }}
          >
            {t("settings.clips.permissions.setup")}
          </Button>
        }
      >
        <div className="space-y-3 p-5 text-[13px] leading-5 text-fg-2">
          <p>{t(`settings.clips.permissions.${notice.reason}.description`)}</p>
          <ul className="list-disc space-y-1 pl-5 marker:text-fg-4">
            {notice.permissions.map((key) => (
              <li key={key}>{t(`settings.clips.permissions.${key}`)}</li>
            ))}
          </ul>
          <p className="text-fg-3">
            {t("settings.clips.permissions.blocked")}
          </p>
        </div>
      </Modal>
    </div>,
    document.body,
  );
}
