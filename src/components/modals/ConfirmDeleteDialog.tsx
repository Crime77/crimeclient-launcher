"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Loader2, Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title?: string;
  message?: React.ReactNode;
}

export function ConfirmDeleteDialog({
  isOpen,
  itemName,
  onClose,
  onConfirm,
  isDeleting,
  title,
  message,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  const dialogTitle = title || t('confirm_delete.title', { name: itemName });
  const dialogMessage = message || (
    <div className="space-y-1.5">
      <p className="text-[13px] text-fg-2 leading-relaxed">{t('confirm_delete.message', { name: itemName })}</p>
      <p className="text-xs text-fg-3">{t('confirm_delete.cannot_undo')}</p>
    </div>
  );

  const dialogFooter = (
    <div className="flex justify-end items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
        {t('common.cancel')}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={onConfirm}
        disabled={isDeleting}
        icon={
          isDeleting ? (
            <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Trash2 size={14} strokeWidth={1.75} />
          )
        }
      >
        {isDeleting ? t('confirm_delete.button.deleting') : t('confirm_delete.button.delete')}
      </Button>
    </div>
  );

  return (
    <Modal
      title={dialogTitle}
      titleIcon={<Trash2 size={16} strokeWidth={1.75} className="text-err" />}
      onClose={onClose}
      width="sm"
      footer={dialogFooter}
    >
      <div className="p-5">
        {dialogMessage}
      </div>
    </Modal>
  );
} 