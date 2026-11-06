"use client";

import { useTranslation } from "react-i18next";
import { Folder, Info } from "lucide-react";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import type { SyncPreviewEntry } from "../../types/syncPacks";

export interface AdoptPreviewModalProps {
  profileName: string;
  packName: string;
  entries: SyncPreviewEntry[];
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdoptPreviewModal({
  profileName,
  packName,
  entries,
  busy,
  onCancel,
  onConfirm,
}: AdoptPreviewModalProps) {
  const { t } = useTranslation();

  const totalMoves = entries.reduce((sum, entry) => sum + entry.moves, 0);
  const totalCollisions = entries.reduce(
    (sum, entry) => sum + entry.collisions,
    0,
  );

  return (
    <Modal
      title={t("syncPacks.adoptDialog.title")}
      titleSubtitle={
        <span>
          {t("syncPacks.adoptDialog.intro", {
            profile: profileName,
            pack: packName,
          })}
        </span>
      }
      onClose={onCancel}
      width="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="warning" size="sm" onClick={onConfirm} disabled={busy}>
            {t("syncPacks.adoptDialog.confirm")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-5 py-5">
        <div className="overflow-hidden border border-line bg-s2" style={{ borderRadius: "var(--r-md)" }}>
          {entries.map((entry) => (
            <div
              key={`${entry.pack_id}:${entry.target_path}`}
              className="flex items-center gap-3 h-10 border-b border-line px-3 last:border-b-0"
            >
              <Folder size={15} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />

              <span className="min-w-0 flex-1 truncate cc-num text-[12.5px] text-fg">
                {entry.target_path}
              </span>

              <div className="flex flex-shrink-0 items-center gap-4 text-[12px]">
                {entry.moves > 0 && (
                  <span className="text-fg-3">
                    {t("syncPacks.adoptDialog.moves", { count: entry.moves })}
                  </span>
                )}
                {entry.collisions > 0 && (
                  <span className="text-warn">
                    {t("syncPacks.adoptDialog.collisions", {
                      count: entry.collisions,
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2.5 px-1">
          <Info size={14} strokeWidth={1.75} className="mt-[3px] flex-shrink-0 text-fg-4" />
          <div className="text-[12px] leading-relaxed text-fg-3">
            {totalMoves > 0 && (
              <div>{t("syncPacks.adoptDialog.explainMoves")}</div>
            )}
            {totalCollisions > 0 && (
              <div className="mt-1">
                {t("syncPacks.adoptDialog.explainCollisions")}
              </div>
            )}
            <div className="mt-1 text-fg-4">
              {t("syncPacks.adoptDialog.explainSafe")}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default AdoptPreviewModal;
