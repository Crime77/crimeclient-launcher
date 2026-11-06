"use client";

import { useTranslation } from "react-i18next";

import { CheckboxV2 } from "../../ui/CheckboxV2";
import { Tooltip } from "../../ui/Tooltip";
import { cn } from "../../../lib/utils";
import { formatBytes } from "../../../utils/format-relative-time";
import type {
  ContentBucket,
  ContentBucketKey,
  ImportSelection,
} from "../../../types/launcherImport";

interface CopyContentsPickerProps {
  buckets: ContentBucket[];
  selection: ImportSelection;
  onChange: (next: ImportSelection) => void;
}

const HINTED: ContentBucketKey[] = ["saves"];

export function CopyContentsPicker({
  buckets,
  selection,
  onChange,
}: CopyContentsPickerProps) {
  const { t } = useTranslation();

  const total = buckets.reduce(
    (sum, bucket) => (selection[bucket.key] ? sum + bucket.bytes : sum),
    0,
  );

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="cc-eyebrow">
          {t("profiles.launcherImport.confirm.copy_heading")}
        </label>
        <span className="cc-num text-[11.5px] text-fg-3">
          {t("profiles.launcherImport.confirm.copy_total", { size: formatBytes(total) })}
        </span>
      </div>

      <div
        className="overflow-hidden border border-line divide-y divide-line bg-s2"
        style={{ borderRadius: "var(--r-md)" }}
      >
        {buckets.map((bucket) => {
          const empty = bucket.entryCount === 0;
          const active = !empty && selection[bucket.key];
          const count = t(
            bucket.key === "saves"
              ? "profiles.launcherImport.confirm.kind_worlds_count"
              : "profiles.launcherImport.confirm.kind_files",
            { count: bucket.entryCount },
          );

          const row = (
            <div
              onClick={() =>
                !empty && onChange({ ...selection, [bucket.key]: !selection[bucket.key] })
              }
              className={cn(
                "flex w-full items-center gap-3 h-10 px-3 transition-colors duration-fast",
                empty ? "opacity-50" : "cursor-pointer hover:bg-s3",
              )}
            >
              <CheckboxV2
                size="sm"
                checked={active}
                disabled={empty}
                onChange={(next) => onChange({ ...selection, [bucket.key]: next })}
              />
              <span className={cn("min-w-0 flex-1 truncate text-[13px]", active ? "text-fg" : "text-fg-2")}>
                {t(`profiles.launcherImport.confirm.kind_${bucket.key}`)}
              </span>
              <span className="flex-shrink-0 cc-num text-[11.5px] text-fg-3">
                {empty
                  ? t("profiles.launcherImport.confirm.kind_empty")
                  : `${count}  ·  ${formatBytes(bucket.bytes)}`}
              </span>
            </div>
          );

          return HINTED.includes(bucket.key) && !empty ? (
            <Tooltip
              key={bucket.key}
              content={t("profiles.launcherImport.confirm.worlds_hint")}
              position="top"
              wrapperClassName="w-full"
            >
              {row}
            </Tooltip>
          ) : (
            <div key={bucket.key}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}
