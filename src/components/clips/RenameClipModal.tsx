"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { SearchStyleInput } from "../ui/Input";

interface Props {
  currentName: string;
  onClose: () => void;
  onConfirm: (name: string) => Promise<boolean>;
}

export function RenameClipModal({ currentName, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  const wanted = name.trim();
  const unchanged = !wanted || wanted === currentName;

  const submit = async () => {
    if (unchanged || saving) return;
    setSaving(true);
    const done = await onConfirm(wanted);
    setSaving(false);
    if (done) onClose();
  };

  return (
    <Modal
      title={t("clips.gallery.rename")}
      titleIcon={<Pencil size={16} strokeWidth={1.75} />}
      onClose={onClose}
      width="md"
      closeOnClickOutside={!saving}
      footer={
        <div className="flex justify-between">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => void submit()}
            disabled={saving || unchanged}
            icon={
              saving ? (
                <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
              ) : (
                <Pencil size={15} strokeWidth={1.75} />
              )
            }
          >
            {t("clips.gallery.rename")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <p className="truncate font-mono text-xs text-fg-3">
          {currentName}
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-[520] text-fg-2">
            {t("clips.gallery.rename_label")}
          </label>
          <SearchStyleInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={currentName}
            disabled={saving}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
