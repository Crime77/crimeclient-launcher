"use client";

import { useRef, useState } from "react";
import { FileArchive, Loader2, Upload } from "lucide-react";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { toast } from "react-hot-toast";
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useImportConfirmStore } from "../../store/import-confirm-store";
import { logInfo, logWarn } from "../../utils/logging-utils";
import { useTranslation } from "react-i18next";

interface ProfileImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export function ProfileImport({
  onClose,
  onImportComplete,
}: ProfileImportProps) {
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const formatItemsRef = useRef<HTMLUListElement>(null);
  const requestImport = useImportConfirmStore((state) => state.requestImport);

  const handleImport = async () => {
    try {
      const selectedPath = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: t('profiles.import.modpack_files'),
            extensions: ["noriskpack", "mrpack", "zip"],
          },
        ],
        title: t('profiles.import.select_modpack'),
      });

      if (selectedPath && typeof selectedPath === "string") {
        setIsImporting(true);
        onClose();
        onImportComplete();
        await requestImport(selectedPath);
      } else if (selectedPath === null) {
        logInfo("[PackImport] Profile import dialog cancelled by user.");
      } else {
        logWarn(`[PackImport] File dialog returned no usable path: ${JSON.stringify(selectedPath)}`);
        toast.error(t('profiles.errors.file_path_failed'));
      }
    } finally {
      setIsImporting(false);
    }
  };

  const renderFooter = () => (
    <div className="flex justify-end">
      <Button
        variant="default"
        onClick={handleImport}
        disabled={isImporting}
        icon={isImporting ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" /> : <Upload size={15} strokeWidth={1.75} />}
        size="sm"
      >
        {isImporting ? t('profiles.importing') : t('profiles.select_file_to_import')}
      </Button>
    </div>
  );

  return (
    <Modal
      title={t('profiles.importProfile')}
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <div className="px-5 py-5" ref={contentRef}>
        <p className="text-[13px] leading-relaxed text-fg-2 mb-5 select-none">
          {t('profiles.import_description')}
        </p>

        <h3 className="cc-eyebrow mb-2 select-none">
          {t('profiles.supported_formats')}
        </h3>
        <ul
          className="select-none overflow-hidden border border-line divide-y divide-line bg-s2"
          style={{ borderRadius: "var(--r-md)" }}
          ref={formatItemsRef}
        >
          {[
            { ext: ".mrpack", label: t('profiles.format_mrpack') },
            { ext: ".noriskpack", label: t('profiles.format_noriskpack') },
            { ext: ".zip", label: t('profiles.format_zip') },
          ].map((format) => (
            <li key={format.ext} className="flex items-center gap-3 h-10 px-3">
              <FileArchive size={15} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
              <span className="text-[13px] text-fg">{format.label}</span>
              <span className="ml-auto cc-num text-[11.5px] text-fg-4">{format.ext}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
