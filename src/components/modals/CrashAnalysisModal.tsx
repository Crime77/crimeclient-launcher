"use client";

import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bandage,
  Boxes,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  Play,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { openExternalUrl } from "../../services/tauri-service";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import type { CrashAction, CrashCheckResult } from "../../types/crash-analysis";
import { applyCrashFix, revertCrashFix, type AppliedFix } from "../../services/crash-fix-service";
import { useAppDragDropStore } from "../../store/appStore";
import { ContentType } from "../../types/content";
import { logError } from "../../utils/logging-utils";
import { actionColor, actionIcon, actionLabel, actionVariant, look, statusMessageText, summaryText } from "./crash-analysis-presenter";

interface Props {
  result: CrashCheckResult;
  profileId?: string; // present => real apply on this profile; absent (debug preview) => local toggle
  onClose: () => void;
}

export function CrashAnalysisModal({ result, profileId, onClose }: Props) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  // index -> revert token (null = local-only toggle). Presence = applied.
  const [applied, setApplied] = useState<Map<number, AppliedFix | null>>(new Map());
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const l = look(result);

  const setBusyFlag = (i: number, on: boolean) =>
    setBusy((p) => {
      const n = new Set(p);
      if (on) n.add(i);
      else n.delete(i);
      return n;
    });

  // refresh the open mods tab
  const refreshMods = () => {
    try {
      useAppDragDropStore.getState().triggerRefresh(ContentType.Mod);
    } catch {
      /* tab not mounted — nothing to refresh */
    }
  };

  // apply on first click, undo on second. With a profileId -> Rust command; without -> local toggle.
  const onAction = async (a: CrashAction, i: number, direction?: "upgrade" | "downgrade") => {
    if (busy.has(i)) return;

    if (applied.has(i)) {
      const token = applied.get(i);
      setBusyFlag(i, true);
      try {
        if (profileId && token != null) {
          await revertCrashFix(token);
          refreshMods();
        }
        setApplied((p) => {
          const n = new Map(p);
          n.delete(i);
          return n;
        });
        toast(t("crash_analysis.toast.reverted", { target: a.target }), { icon: <Undo2 size={16} strokeWidth={1.75} className="text-fg-2" /> });
      } catch (e) {
        logError(`Crash-fix revert failed: ${e}`);
        toast.error(t("crash_analysis.toast.apply_error"));
      } finally {
        setBusyFlag(i, false);
      }
      return;
    }

    if (!profileId) {
      setApplied((p) => new Map(p).set(i, null));
      toast.success(t("crash_analysis.toast.applied", { target: a.target }));
      return;
    }

    setBusyFlag(i, true);
    try {
      const outcome = await applyCrashFix(profileId, direction ? { ...a, direction } : a);
      if (outcome.status === "skipped") {
        toast(t("crash_analysis.toast.not_found", { target: outcome.reason }), { icon: <AlertTriangle size={16} strokeWidth={1.75} className="text-warn" /> });
      } else {
        setApplied((p) => new Map(p).set(i, outcome.fix));
        refreshMods();
        toast.success(t("crash_analysis.toast.applied", { target: a.target }));
      }
    } catch (e) {
      logError(`Crash-fix apply failed: ${e}`);
      toast.error(t("crash_analysis.toast.apply_error"));
    } finally {
      setBusyFlag(i, false);
    }
  };

  // canonical launch flow (UI launch-state, migration check, event/polling lifecycle)
  const { handleLaunch } = useProfileLaunch({ profileId: profileId ?? "" });
  const launchGame = () => {
    if (!profileId) {
      toast.success(t("crash_analysis.toast.launch")); // no profile -> nothing to launch
      return;
    }
    handleLaunch();
    onClose();
  };

  const hasActions = result.actions.length > 0;
  const summary = summaryText(result, t);
  const statusMsg = statusMessageText(result, t);
  const LookIcon = l.icon;

  const footer = (
    <div className="flex justify-end">
      <Button
        variant="default"
        size="sm"
        icon={<Play size={14} strokeWidth={2} />}
        onClick={launchGame}
      >
        {t("crash_analysis.launch")}
      </Button>
    </div>
  );

  return (
    <Modal
      title={t("crash_analysis.title")}
      titleIcon={<ShieldCheck size={16} strokeWidth={1.75} style={{ color: l.color }} />}
      onClose={onClose}
      width="md"
      footer={footer}
    >
      <div className="p-5 space-y-4">
        {/* the verdict: a state-coloured rule on the left, the text stays neutral */}
        <div className="flex items-start gap-3 border-l-2 pl-3 py-0.5" style={{ borderColor: l.color }}>
          <LookIcon size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: l.color }} />
          <div className="min-w-0">
            <p className="text-[13px] font-[600] text-fg leading-snug">{t(l.headlineKey)}</p>
            {summary && <p className="text-[13px] text-fg-2 mt-1 leading-relaxed">{summary}</p>}
            {result.module && (
              <span
                className="mt-2 inline-flex items-center gap-1.5 border border-line-2 bg-s2 px-2 h-6 text-xs text-fg-2"
                style={{ borderRadius: "var(--r-sm)" }}
              >
                <Boxes size={12} strokeWidth={1.75} className="text-fg-3" />
                {t("crash_analysis.affected_feature")}: <span className="font-mono">{result.module}</span>
              </span>
            )}
          </div>
        </div>

        {/* authored workaround text from the wiki entry */}
        {result.workaround && (
          <div
            className="flex items-start gap-2.5 border border-line bg-s2 px-3 py-2.5"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <Bandage size={14} strokeWidth={1.75} className="shrink-0 mt-0.5 text-warn" />
            <p className="text-[13px] text-fg-2 leading-relaxed">
              <span className="text-fg-3">{t("crash_analysis.workaround_label")}: </span>
              {result.workaround}
            </p>
          </div>
        )}

        {/* fixes checklist (same render for 1 or many) */}
        {hasActions && (
          <div>
            <p className="cc-eyebrow pb-1.5">{t("crash_analysis.fixes_heading")}</p>
            <div className="border border-line divide-y divide-line overflow-hidden" style={{ borderRadius: "var(--r-md)" }}>
              {result.actions.map((a, i) => {
                const isApplied = applied.has(i);
                const isBusy = busy.has(i);
                const isConflict = a.type === "resolve_conflict";
                const badgeColor = isApplied ? "var(--ok)" : actionColor(a, l.color);
                const ActionIcon = isApplied ? Check : actionIcon(a);
                const spin = <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />;
                return (
                  <div key={i} className="group flex items-center gap-3 px-3 py-2 transition-colors duration-fast hover:bg-s2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center bg-s3"
                      style={{ color: badgeColor, borderRadius: "var(--r-sm)" }}
                    >
                      <ActionIcon size={13} strokeWidth={1.75} />
                    </span>
                    <span className={`flex-1 min-w-0 text-[13px] ${isApplied ? "text-fg-3 line-through" : "text-fg"}`}>
                      {actionLabel(a, t)}
                    </span>
                    {isConflict && !isApplied ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="success"
                          size="xs"
                          disabled={isBusy}
                          icon={isBusy ? spin : <ArrowUp size={13} strokeWidth={1.75} />}
                          onClick={() => onAction(a, i, "upgrade")}
                        >
                          {t("crash_analysis.upgrade")}
                        </Button>
                        <Button
                          variant="info"
                          size="xs"
                          disabled={isBusy}
                          icon={<ArrowDown size={13} strokeWidth={1.75} />}
                          onClick={() => onAction(a, i, "downgrade")}
                        >
                          {t("crash_analysis.downgrade")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant={isApplied ? "secondary" : actionVariant(a)}
                        size="xs"
                        iconPosition="right"
                        disabled={isBusy}
                        icon={
                          isBusy ? spin : isApplied ? <Check size={13} strokeWidth={2} /> : <ArrowRight size={13} strokeWidth={1.75} />
                        }
                        onClick={() => onAction(a, i)}
                        title={isApplied ? t("crash_analysis.undo_hint") : undefined}
                      >
                        {isApplied ? t("crash_analysis.applied") : t("crash_analysis.apply")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="pt-1.5 text-xs text-fg-3">{t("crash_analysis.applies_note")}</p>
          </div>
        )}

        {(statusMsg || result.issueUrl) && (
          <p className="text-[13px] text-fg-2 leading-relaxed">
            {statusMsg}
            {result.issueUrl && (
              <>
                {statusMsg ? " " : null}
                <button
                  type="button"
                  onClick={() => openExternalUrl(result.issueUrl!).catch(() => {})}
                  className="inline-flex items-center gap-0.5 text-fg underline decoration-line-3 underline-offset-2 hover:decoration-fg-2 whitespace-nowrap"
                >
                  {t("crash_analysis.view_issue")}
                  <ArrowUpRight size={13} strokeWidth={1.75} />
                </button>
              </>
            )}
          </p>
        )}

        {!hasActions && (
          <div className="flex flex-wrap gap-2">
            <LogLinks logId={result.logId} openTextKey="crash_analysis.open_crash_log" />
          </div>
        )}

        {/* technical details — collapsed by default */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-2 transition-colors duration-fast"
          >
            <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform duration-med ${showDetails ? "rotate-180" : ""}`} />
            {t("crash_analysis.technical_details")}
          </button>

          {showDetails && (
            <div className="mt-2 border border-line divide-y divide-line" style={{ borderRadius: "var(--r-md)" }}>
              <Fact label={t("crash_analysis.fact.feature")} value={result.module ?? null} />
              <Fact label={t("crash_analysis.fact.where")} value={result.blamer} />
              <Fact label={t("crash_analysis.fact.cause")} value={result.rootCause} />
              <Fact label={t("crash_analysis.fact.mod")} value={result.culpritMods.join(", ") || null} />
              <Fact label={t("crash_analysis.fact.type")} value={result.classification} />
              <div className="flex flex-wrap gap-2 p-2.5">
                <LogLinks logId={result.logId} openTextKey="crash_analysis.open_log" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 px-3 py-2">
      <span className="shrink-0 w-20 cc-eyebrow pt-px">{label}</span>
      <span className="font-mono text-xs text-fg-2 break-all">{value}</span>
    </div>
  );
}

function LogLinks({ logId, openTextKey }: { logId: string; openTextKey: string }) {
  const { t } = useTranslation();
  const url = `https://mclo.gs/${logId}`;
  const copy = () =>
    writeText(url)
      .then(() => toast.success(t("crash_analysis.toast.link_copied")))
      .catch(() => toast.error(t("crash_analysis.toast.copy_failed")));
  return (
    <>
      <Button
        variant="secondary"
        size="xs"
        icon={<FileText size={13} strokeWidth={1.75} />}
        onClick={() => openExternalUrl(url).catch(() => {})}
      >
        {t(openTextKey)}
      </Button>
      <Button variant="ghost" size="xs" icon={<Copy size={13} strokeWidth={1.75} />} onClick={copy}>
        {t("crash_analysis.copy_log_link")}
      </Button>
    </>
  );
}
