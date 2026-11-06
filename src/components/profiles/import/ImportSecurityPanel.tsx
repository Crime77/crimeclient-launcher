"use client";

import type { ReactNode } from "react";
import { CircleHelp, Code, Cpu, Globe, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  ExecutableContentReport,
  ImportSecurityReport,
  ProvenanceReport,
} from "../../../types/importPreview";

export function truncateEntry(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export interface ImportSecurityPanelProps {
  security: ImportSecurityReport;
  provenance: ProvenanceReport;
  executableContent: ExecutableContentReport;
}

export function hasProvenanceFindings({
  security,
  provenance,
  executableContent,
}: ImportSecurityPanelProps): boolean {
  return (
    provenance.unknown.length > 0 ||
    security.thirdPartyDownloadHosts.length > 0 ||
    executableContent.scripts.length > 0 ||
    executableContent.natives.length > 0
  );
}

function FileList({ paths }: { paths: string[] }) {
  return (
    <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
      {paths.map((path, index) => (
        <li
          key={`${path}-${index}`}
          className="cc-num text-[11.5px] text-fg-2 break-all"
        >
          {truncateEntry(path)}
        </li>
      ))}
    </ul>
  );
}

export function ImportTrustWarning() {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-start gap-2.5 border border-warn/30 bg-warn/[0.06] px-3 py-2.5"
      style={{ borderRadius: "var(--r-md)" }}
    >
      <ShieldAlert size={15} strokeWidth={1.75} className="text-warn shrink-0 mt-px" />
      <p className="text-[12.5px] leading-relaxed text-fg-2">
        {t("profiles.import.trust_warning")}
      </p>
    </div>
  );
}

function Finding({
  icon,
  heading,
  explainer,
  children,
}: {
  icon: ReactNode;
  heading: ReactNode;
  explainer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5">
      <span className="text-warn shrink-0 mt-px">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-fg">{heading}</p>
        <p className="text-[12px] leading-relaxed text-fg-3 mt-0.5">{explainer}</p>
        {children}
      </div>
    </div>
  );
}

const FINDING_ICON = { size: 15, strokeWidth: 1.75 } as const;

export function ImportSecurityPanel(props: ImportSecurityPanelProps) {
  const { t } = useTranslation();

  if (!hasProvenanceFindings(props)) return null;

  const { unknown, verifiedCount, incomplete } = props.provenance;
  const hosts = props.security.thirdPartyDownloadHosts;
  const { scripts, natives, scriptCount, nativeCount } = props.executableContent;

  return (
    <div
      className="border border-warn/30 bg-warn/[0.04] divide-y divide-warn/15"
      style={{ borderRadius: "var(--r-md)" }}
    >
      {natives.length > 0 && (
        <Finding
          icon={<Cpu {...FINDING_ICON} />}
          heading={t("profiles.import.natives_heading", { count: nativeCount })}
          explainer={t("profiles.import.natives_explainer")}
        >
          <FileList paths={natives} />
        </Finding>
      )}

      {scripts.length > 0 && (
        <Finding
          icon={<Code {...FINDING_ICON} />}
          heading={t("profiles.import.scripts_heading", { count: scriptCount })}
          explainer={t("profiles.import.scripts_explainer")}
        >
          <FileList paths={scripts} />
        </Finding>
      )}

      {hosts.length > 0 && (
        <Finding
          icon={<Globe {...FINDING_ICON} />}
          heading={t("profiles.import.hosts_heading", { count: hosts.length })}
          explainer={t("profiles.import.hosts_explainer")}
        >
          <FileList paths={hosts} />
        </Finding>
      )}

      {unknown.length > 0 && (
        <Finding
          icon={<CircleHelp {...FINDING_ICON} />}
          heading={t("profiles.import.unknown_heading", { count: unknown.length })}
          explainer={
            incomplete
              ? t("profiles.import.unknown_lookup_failed")
              : t("profiles.import.unknown_explainer", { count: verifiedCount })
          }
        >
          <ul className="mt-2 space-y-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {unknown.map((entry, index) => (
              <li
                key={`${entry.name}-${index}`}
                className="text-[11.5px] text-fg-2 break-all"
              >
                <span className="cc-num">{truncateEntry(entry.name)}</span>
                <span className="text-fg-4">
                  {" - "}
                  {t(`profiles.import.unknown_reason_${entry.reason}`)}
                </span>
              </li>
            ))}
          </ul>
        </Finding>
      )}
    </div>
  );
}
