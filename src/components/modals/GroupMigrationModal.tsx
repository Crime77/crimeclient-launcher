"use client";

import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";

interface GroupMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
  onMigrate?: () => void;
  profileId?: string;
}

export function GroupMigrationModal({
  isOpen,
  onClose,
  onLaunch,
  onMigrate,
  profileId
}: GroupMigrationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleLaunch = () => {
    onLaunch();
  };

  const handleMigrate = () => {
    if (onMigrate) {
      onMigrate();
    }
  };

  return (
    <Modal
      title={t('group_migration.title')}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleLaunch}
            variant="secondary"
            size="sm"
          >
            {t('group_migration.button.skip_launch')}
          </Button>
          {onMigrate && (
            <Button
              onClick={handleMigrate}
              variant="default"
              size="sm"
            >
              {t('group_migration.button.copy_files')}
            </Button>
          )}
        </div>
      }
    >
      <div className="px-5 py-5">
        <p className="text-[13px] leading-relaxed text-fg-2">
          {t('group_migration.description')}
        </p>
      </div>
    </Modal>
  );
}
