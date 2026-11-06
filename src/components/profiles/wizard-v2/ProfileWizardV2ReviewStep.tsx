"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/buttons/Button";
import { SearchStyleInput } from "../../ui/Input";
import { Checkbox } from "../../ui/Checkbox";
import { GroupPicker } from "../../ui/GroupPicker";
import { ImportPreviewChips } from "../import/ImportPreviewChips";
import { ImportSecurityPanel, ImportTrustWarning } from "../import/ImportSecurityPanel";
import { ImportRemovedList } from "../import/ImportRemovedList";
import { CopyContentsPicker } from "../import/CopyContentsPicker";
import * as LauncherImportService from "../../../services/launcher-import-service";
import { useKnownProfileGroups } from "../../../hooks/useKnownProfileGroups";
import { formatRelativeTime } from "../../../utils/format-relative-time";
import { parseErrorMessage } from "../../../utils/error-utils";
import { logError } from "../../../utils/logging-utils";
import {
  DEFAULT_IMPORT_SELECTION,
  selectionFromBuckets,
  type ExternalInstancePreview,
  type ExternalInstanceRef,
  type ImportSelection,
} from "../../../types/launcherImport";
import type { LauncherImportOverrides } from "../../../utils/launcher-instance-import";
import { FieldLabel } from "./WizardParts";

interface ProfileWizardV2ReviewStepProps {
  target: ExternalInstanceRef;
  onClose: () => void;
  onBack: () => void;
  onImport: (overrides: LauncherImportOverrides) => void;
  busy?: boolean;
}

function describeWarning(
  warning: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const [code, ...rest] = warning.split(":");
  const detail = rest.join(":");

  switch (code) {
    case "unknown_loader":
      return t("profiles.launcherImport.confirm.warning_unknown_loader", { loader: detail });
    case "skipped_symlink":
      return t("profiles.launcherImport.confirm.warning_skipped_symlink", { path: detail });
    case "copy_plan_truncated":
      return t("profiles.launcherImport.confirm.warning_copy_plan_truncated");
    default:
      return warning;
  }
}

export function ProfileWizardV2ReviewStep({
  target,
  onClose,
  onBack,
  onImport,
  busy = false,
}: ProfileWizardV2ReviewStepProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ExternalInstancePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(target.name);
  const [group, setGroup] = useState("");
  const [useNoriskPack, setUseNoriskPack] = useState(false);
  const [selection, setSelection] = useState<ImportSelection>(DEFAULT_IMPORT_SELECTION);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError(null);

    LauncherImportService.previewExternalInstance(
      target.launcher,
      target.root,
      target.instanceDir,
      { resolveMods: true },
    )
      .then((loaded) => {
        if (cancelled) return;
        setPreview(loaded);
        setName(loaded.suggestedName);
        setGroup(loaded.suggestedGroup ?? "");
        setSelection(selectionFromBuckets(loaded.buckets));
        setUseNoriskPack(loaded.noriskPack.preselected);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = parseErrorMessage(err);
        logError(`[LauncherImport] Preview of '${target.instanceDir}' failed: ${message}`);
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [target.launcher, target.root, target.instanceDir]);

  const knownGroups = useKnownProfileGroups([preview?.suggestedGroup]);
  const trimmedName = name.trim();

  const renderFooter = () => (
    <div className="flex justify-between items-center">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={busy}
        size="sm"
        icon={<ArrowLeft size={15} strokeWidth={1.75} />}
        iconPosition="left"
      >
        {t("profiles.wizard.back")}
      </Button>
      <Button
        variant="default"
        onClick={() =>
          onImport({
            name: trimmedName,
            group: group.trim(),
            selection,
            noriskPackId: useNoriskPack ? preview?.noriskPack.packId : undefined,
            clearNoriskPack: !useNoriskPack,
          })
        }
        disabled={busy || !preview || !trimmedName}
        size="sm"
        className="min-w-[128px]"
        icon={<Download size={15} strokeWidth={1.75} />}
        iconPosition="left"
      >
        {t("profiles.import.confirm")}
      </Button>
    </div>
  );

  return (
    <Modal
      title={t("profiles.launcherImport.confirm.title")}
      titleSubtitle={
        preview ? (
          <ImportPreviewChips
            leadLabel={preview.launcherDisplayName}
            gameVersion={preview.gameVersion}
            loader={preview.loader}
            modCount={preview.modCount}
            sizeBytes={preview.totalBytes}
          />
        ) : undefined
      }
      onClose={onClose}
      width="lg"
      footer={renderFooter()}
    >
      <div className="min-h-[460px] max-h-[65vh] overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
        {error && (
          <div
            className="flex items-start gap-2 border border-warn/30 bg-warn/[0.06] px-3 py-2 text-[12px] text-fg-2"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <TriangleAlert size={14} strokeWidth={1.75} className="mt-px flex-shrink-0 text-warn" />
            {t("profiles.launcherImport.confirm.preview_failed", { error })}
          </div>
        )}

        {!preview && !error && (
          <div className="flex items-center gap-2 text-[12.5px] text-fg-3">
            <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            <span>{t("profiles.launcherImport.confirm.reading")}</span>
          </div>
        )}

        {preview && (
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

            <CopyContentsPicker
              buckets={preview.buckets}
              selection={selection}
              onChange={setSelection}
            />

            <Checkbox
              label={t("profiles.import.norisk_toggle_title")}
              checked={useNoriskPack}
              onChange={(event) => setUseNoriskPack(event.target.checked)}
              size="md"
            />

            {(preview.warnings.length > 0 || preview.alreadyImportedAt) && (
              <div
                className="space-y-1 border border-warn/30 bg-warn/[0.06] px-3 py-2"
                style={{ borderRadius: "var(--r-md)" }}
              >
                {preview.alreadyImportedAt && (
                  <div className="flex items-center gap-2 text-[12px] text-warn">
                    <TriangleAlert size={13} strokeWidth={1.75} className="flex-shrink-0" />
                    {t("profiles.launcherImport.confirm.already_imported", {
                      time: formatRelativeTime(preview.alreadyImportedAt),
                    })}
                  </div>
                )}
                {preview.warnings.map((warning, index) => (
                  <div
                    key={`${warning}-${index}`}
                    className="cc-num text-[11.5px] text-fg-3 break-all"
                  >
                    {describeWarning(warning, t)}
                  </div>
                ))}
              </div>
            )}

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
