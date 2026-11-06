"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Profile } from "../../types/profile";
import { ExportSettingsTab } from "./settings/ExportSettingsTab";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Upload } from "lucide-react";
import { Checkbox } from "../ui/Checkbox";

interface ExportProfileModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportProfileModal({
  profile,
  isOpen,
  onClose,
}: ExportProfileModalProps) {
  const { t } = useTranslation();

  const [exportAction, setExportAction] = useState<{
    handleExport: () => Promise<void>;
    isDisabled: () => boolean;
    exportOpenFolder: boolean;
    setExportOpenFolder: (value: boolean) => void;
    isExporting?: boolean;
  } | null>(null);

  if (!isOpen) {
    return null;
  }

  const footerContent = exportAction ? (
    <div className="flex justify-between items-center w-full">
      <div>
        <Checkbox
          checked={exportAction.exportOpenFolder}
          onChange={(e) => exportAction.setExportOpenFolder(e.target.checked)}
          label={t('export.open_folder_after')}
          customSize="md"
          disabled={exportAction.isDisabled()}
        />
      </div>
      <div>
        <Button
          variant="default"
          onClick={exportAction.handleExport}
          disabled={exportAction.isDisabled()}
          icon={<Upload size={15} strokeWidth={1.75} />}
          size="sm"
        >
          {exportAction.isExporting ? t('export.exporting') : t('export.export_profile')}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <Modal
      title={t('export.modal_title', { name: profile.name })}
      onClose={onClose}
      width="lg"
      footer={footerContent}
    >
      <div className="px-5 py-5">
        <ExportSettingsTab
          profile={profile}
          onClose={onClose}
          onExportActionAvailable={setExportAction}
          isInModalContext={true}
        />
      </div>
    </Modal>
  );
}
