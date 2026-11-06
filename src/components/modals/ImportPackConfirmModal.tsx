"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { SearchStyleInput } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { GroupPicker } from "../ui/GroupPicker";
import { ImportPreviewChips } from "../profiles/import/ImportPreviewChips";
import {
  ImportSecurityPanel,
  ImportTrustWarning,
} from "../profiles/import/ImportSecurityPanel";
import { ImportRemovedList } from "../profiles/import/ImportRemovedList";
import { useImportConfirmStore } from "../../store/import-confirm-store";
import { useKnownProfileGroups } from "../../hooks/useKnownProfileGroups";
import { runPackImport } from "../../utils/pack-import";
import { FieldLabel } from "../profiles/wizard-v2/WizardParts";

export function ImportPackConfirmModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, isLoading, preview, filePath, close } = useImportConfirmStore();
  const [isImporting, setIsImporting] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [useNoriskPack, setUseNoriskPack] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setGroup("");
      return;
    }
    if (preview) {
      setName(preview.profileName ?? "");
      setGroup(preview.group ?? "");
      setUseNoriskPack(preview.noriskPack.preselected);
    }
  }, [isOpen, preview]);

  const knownGroups = useKnownProfileGroups([preview?.group]);

  if (!isOpen) return null;

  const trimmedName = name.trim();

  const handleConfirm = async () => {
    const target = preview?.filePath ?? filePath;
    if (!target || !trimmedName) return;

    setIsImporting(true);
    close();
    const newProfileId = await runPackImport(target, {
      name: trimmedName,
      group: group.trim(),
      noriskPackId: useNoriskPack ? preview?.noriskPack.packId : undefined,
      clearNoriskPack: !useNoriskPack,
    });
    setIsImporting(false);
    if (newProfileId) {
      navigate(`/profilesv2/${newProfileId}`);
    }
  };

  const renderFooter = () => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={close} size="sm" disabled={isImporting}>
        {t("common.cancel")}
      </Button>
      <Button
        variant="default"
        onClick={handleConfirm}
        size="sm"
        className="min-w-[112px]"
        disabled={isLoading || isImporting || !trimmedName}
        icon={<Download size={15} strokeWidth={1.75} />}
      >
        {t("profiles.import.confirm")}
      </Button>
    </div>
  );

  return (
    <Modal
      title={t("profiles.import.review_title")}
      titleSubtitle={
        preview ? (
          <ImportPreviewChips
            leadLabel={preview.fileName}
            gameVersion={preview.gameVersion}
            loader={preview.loader}
            modCount={preview.modCount}
            sizeBytes={preview.fileSize}
          />
        ) : undefined
      }
      onClose={close}
      width="lg"
      footer={renderFooter()}
    >
      <div className="px-5 py-5 space-y-5">
        {isLoading || !preview ? (
          <div className="flex items-center gap-2 text-[12.5px] text-fg-3">
            <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            <span>{t("profiles.import.reading_pack")}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <FieldLabel>{t("profiles.import.field_name")}</FieldLabel>
                <SearchStyleInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("profiles.import.field_name_placeholder")}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col">
                <FieldLabel>{t("profiles.import.field_group")}</FieldLabel>
                <GroupPicker value={group} onChange={setGroup} options={knownGroups} />
              </div>
            </div>

            <Checkbox
              label={t("profiles.import.norisk_toggle_title")}
              checked={useNoriskPack}
              onChange={(event) => setUseNoriskPack(event.target.checked)}
              size="md"
            />

            <ImportTrustWarning />

            <ImportSecurityPanel
              security={preview.security}
              provenance={preview.provenance}
              executableContent={preview.executableContent}
            />

            <ImportRemovedList security={preview.security} />
          </>
        )}
      </div>
    </Modal>
  );
}
