import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/i18n';
import { Modal } from '../ui/Modal';
import { StaticTooltip } from '../ui/Tooltip';
import { useCrashModalStore } from '../../store/crash-modal-store';
import { Button } from '../ui/buttons/Button';
import { AlertTriangle, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProfile } from '../../services/profile-service';
import { uploadLogToMclogs } from '../../services/log-service';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { checkCrashLog, fetchCrashReport, getProcessLogCursor } from '../../services/process-service';
import type { CrashlogDto, ProcessMetadata } from '../../types/processState';
import type { CrashCheckResult } from '../../types/crash-analysis';
import { openExternalUrl } from '../../services/tauri-service';
import { useGlobalModal } from '../../hooks/useGlobalModal';
import { CrashAnalysisModal } from './CrashAnalysisModal';
import { logError, logWarn } from '../../utils/logging-utils';
import { Window } from '@tauri-apps/api/window';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { EventPayload, CrashReportContentAvailablePayload } from '../../types/events';
import { EventType } from '../../types/events';

export function GlobalCrashReportModal() {
  const { t } = useTranslation();
  const { isCrashModalOpen, crashData, closeCrashModal } = useCrashModalStore();
  const { showModal, hideModal } = useGlobalModal();
  const [profileName, setProfileName] = useState<string>('');
  const [mclogsUrl, setMclogsUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Crash analysis ran on NoRisk's backend; CrimeClient only uploads the log to mclo.gs.
  const analyzeWithNoRisk = false;
  const [statusText, setStatusText] = useState<string | null>(null); // inline progress while analyzing
  const [displayedCrashReportContent, setDisplayedCrashReportContent] = useState<string | undefined>(undefined);
  const [isListeningForCrashContent, setIsListeningForCrashContent] = useState(false);
  const hasFetchedCrashReportRef = React.useRef(false);

  useEffect(() => {
    if (crashData?.profile_id) {
      if (crashData.process_metadata?.profile_name) {
        setProfileName(crashData.process_metadata.profile_name);
      } else {
        setProfileName(crashData.profile_id);
        getProfile(crashData.profile_id)
          .then(details => {
            if (details?.name) {
              setProfileName(details.name);
            }
          })
          .catch(err => {
            logError(`Failed to fetch profile details for ${crashData.profile_id}: ${err}`);
          });
      }
      setMclogsUrl(null);
      setIsProcessing(false);
      setDisplayedCrashReportContent(crashData.crash_report_content);
      setIsListeningForCrashContent(false);
      hasFetchedCrashReportRef.current = false; // Reset fetch flag for new crash
    } else {
      setProfileName('');
      setMclogsUrl(null);
      setIsProcessing(false);
      setDisplayedCrashReportContent(undefined);
      setIsListeningForCrashContent(false);
      hasFetchedCrashReportRef.current = false; // Reset fetch flag
    }
  }, [crashData]);

  useEffect(() => {
    const focusRelevantWindow = async () => {
      if (isCrashModalOpen && crashData?.process_id) {
        const crashedProcessId = crashData.process_id;

        // Try to find existing single log window for this process
        const singleLogWindowLabel = `single_log_window_${crashedProcessId}`;
        let foundLogWindow = false;

        try {
          const singleLogWindow = await Window.getByLabel(singleLogWindowLabel);
          if (singleLogWindow) {
            await singleLogWindow.show();
            await singleLogWindow.unminimize();
            await singleLogWindow.setFocus();
            foundLogWindow = true;
          }
        } catch (e) {
          // Single log window not found, try main log window
        }

        if (!foundLogWindow) {
          // Open main log window with crashed process info
          try {
            const processMetadata = crashData.process_metadata;
            if (processMetadata) {
              // Pass crashed process as JSON so log window can show it
              await invoke("open_minecraft_log_window", {
                crashedProcess: JSON.stringify({
                  ...processMetadata,
                  id: crashedProcessId,
                  state: { Crashed: { exit_code: crashData.exit_code } }
                })
              });
            } else {
              await invoke("open_minecraft_log_window", { crashedProcess: null });
            }
          } catch (e) {
            logError(`Failed to open log window for crash: ${e}`);
          }
        }

        // Also focus main window
        try {
          const mainWindowInstance = await Window.getByLabel('main');
          if (mainWindowInstance) {
            await mainWindowInstance.show();
            await mainWindowInstance.unminimize();
            await mainWindowInstance.setFocus();
          }
        } catch (e) {
          logError(`Error getting or focusing main window: ${e}`);
        }
      }
    };

    focusRelevantWindow();
  }, [isCrashModalOpen, crashData]);

  useEffect(() => {
    let unlistenFn: UnlistenFn | undefined;
    let contentReceived = false;

    const listenForCrashContent = async () => {
      // Only run once per modal opening - check if we already fetched for this crash
      if (!isCrashModalOpen || !crashData?.process_id || !crashData?.profile_id || hasFetchedCrashReportRef.current) {
        return;
      }
      
      // Mark as fetched to prevent re-runs
      hasFetchedCrashReportRef.current = true;
      setIsListeningForCrashContent(true);
      
      
      // SCHRITT 1: Event-Listener SOFORT registrieren (um schnelle Events zu fangen)
      try {
        unlistenFn = await listen<EventPayload>(EventType.CrashReportContentAvailable, (event) => {
          if (event.payload.target_id === crashData.process_id && !contentReceived) {
            try {
              const contentPayload = JSON.parse(event.payload.message) as CrashReportContentAvailablePayload;
              if (contentPayload.content) {
                contentReceived = true;
                setDisplayedCrashReportContent(contentPayload.content);
                toast.success(t('crash_modal.toast.report_loaded'));
                setIsListeningForCrashContent(false);
                if (unlistenFn) unlistenFn();
              }
            } catch (e) {
              logError(`Failed to parse CrashReportContentAvailablePayload: ${e}`);
            }
          }
        });
      } catch (error) {
        logError(`Failed to set up listener for CrashReportContentAvailable: ${error}`);
      }
      
      // SCHRITT 2: Warte 1 Sekunde (gibt der Datei Zeit sich zu erstellen)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // SCHRITT 3: Falls Event noch nicht empfangen, aktiv fetchen als Fallback
      if (!contentReceived) {
        try {
          const fetchedContent = await fetchCrashReport(crashData.profile_id, crashData.process_id, crashData.process_metadata?.start_time);
          if (fetchedContent && !contentReceived) {
            contentReceived = true;
            setDisplayedCrashReportContent(fetchedContent);
            toast.success(t('crash_modal.toast.report_loaded'));
            setIsListeningForCrashContent(false);
          }
        } catch (e) {
          logError(`Failed to fetch crash report as fallback: ${e}`);
        }
      }
    };

    listenForCrashContent();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isCrashModalOpen, crashData?.process_id, crashData?.profile_id]);

  if (!isCrashModalOpen || !crashData) {
    return null;
  }

  const shareLogLink = async (url: string) => {
    try { await writeText(url); } catch {}
    try { await openExternalUrl(url); } catch {}
  };

  const buildLogContent = async (profileId: string, metadata: ProcessMetadata): Promise<string> => {
    let crashReport = displayedCrashReportContent;
    if (crashData?.process_id && !crashReport) {
      setStatusText(t('crash_modal.toast.fetching_before_upload'));
      try {
        crashReport = (await fetchCrashReport(profileId, crashData.process_id, metadata.start_time)) ?? undefined;
        if (crashReport) setDisplayedCrashReportContent(crashReport);
      } catch (e) {
        logWarn(`Failed to fetch crash report before upload, continuing with existing data: ${e}`);
      }
    }

    setStatusText(t('crash_modal.toast.fetching_log'));
    const gameLog = metadata.log_session_id
      ? (await getProcessLogCursor(metadata.log_session_id, 0)).output
      : "";

    const content = crashReport?.trim()
      ? `--- CRASH REPORT ---
${crashReport}

--- GAME LOG ---
${gameLog}`
      : gameLog;

    if (!content.trim()) {
      throw new Error(t('crash_modal.error.no_log_content'));
    }
    return content;
  };

  const ensureUploaded = async (profileId: string, metadata: ProcessMetadata): Promise<string> => {
    if (mclogsUrl) return mclogsUrl;
    const content = await buildLogContent(profileId, metadata);
    setStatusText(t('crash_modal.toast.uploading_mclogs'));
    const url = await uploadLogToMclogs(content);
    setMclogsUrl(url);
    return url;
  };

  const analyze = async (url: string, profileId: string, metadata: ProcessMetadata) => {
    setStatusText(t('crash_modal.toast.analyzing'));
    const payload: CrashlogDto = { mcLogsUrl: url, metadata, locale: i18n.language };
    let result: CrashCheckResult;
    try {
      result = await checkCrashLog(payload);
    } catch (e) {
      logError(`Crash analysis failed, falling back to log link: ${e}`);
      toast.error(t('crash_modal.toast.analyze_failed'));
      await shareLogLink(url);
      return;
    }
    closeCrashModal();
    showModal(
      'crash-analysis',
      <CrashAnalysisModal
        result={result}
        profileId={profileId}
        onClose={() => hideModal('crash-analysis')}
      />,
    );
  };

  const handlePrimaryAction = async () => {
    const profileId = crashData?.profile_id;
    const metadata = crashData?.process_metadata;
    if (!profileId || !metadata) {
      toast.error(t('crash_modal.toast.missing_data'));
      logError(`Action error: Missing profile_id or process_metadata for process ${crashData?.process_id}`);
      return;
    }

    setIsProcessing(true);
    setStatusText(t('crash_modal.toast.processing'));
    try {
      const url = await ensureUploaded(profileId, metadata);
      if (analyzeWithNoRisk) {
        await analyze(url, profileId, metadata);
      } else {
        toast.success(t('crash_modal.toast.url_copied'));
        await shareLogLink(url);
        closeCrashModal();
      }
    } catch (error: any) {
      toast.error(error.message || t('crash_modal.toast.unexpected_error'));
      logError(`Crash report processing error: ${error}`);
    } finally {
      setIsProcessing(false);
      setStatusText(null);
    }
  };

  const primaryButtonText = analyzeWithNoRisk ? t('crash_modal.button.analyze') : t('crash_modal.button.upload_only');

  const modalFooter = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => !isProcessing && closeCrashModal()}
        disabled={isProcessing}
      >
        {t('common.close')}
      </Button>
      <div className="relative">
        <Button
          onClick={handlePrimaryAction}
          variant="secondary"
          size="sm"
          icon={
            isProcessing ? (
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
            ) : analyzeWithNoRisk ? (
              <ShieldCheck size={14} strokeWidth={1.75} />
            ) : (
              <Upload size={14} strokeWidth={1.75} />
            )
          }
          disabled={isProcessing || !crashData?.process_metadata}
          className="whitespace-nowrap"
        >
          {primaryButtonText}
        </Button>
        {/* BETA badge — corner overlay like the rollout blitz in MainLaunchButton; tooltip on hover */}
        {analyzeWithNoRisk && (
        <div className="absolute -top-2 -left-2 z-10 pointer-events-auto">
          <StaticTooltip content={t('crash_modal.tooltip.beta')} delay={0}>
            <span className="border border-warn/40 bg-s2 px-1 py-px text-[10px] uppercase leading-none text-warn cursor-help" style={{ borderRadius: 3 }}>
              beta
            </span>
          </StaticTooltip>
        </div>
        )}
      </div>
    </div>
  );

  const profileLabel = crashData.process_metadata?.profile_name || profileName || t('common.loading');

  const titleSubtitleNode = (
    <span className="text-xs text-fg-3">
      {t('crash_modal.profile_label')}: {profileLabel}
    </span>
  );

  return (
    <Modal
      title={t('crash_modal.title')}
      titleIcon={<AlertTriangle size={16} strokeWidth={1.75} className="text-err" />}
      titleSubtitle={titleSubtitleNode}
      onClose={() => !isProcessing && closeCrashModal()}
      width="md"
      footer={modalFooter}
    >
      <div className="p-5">
        {isProcessing ? (
          <div className="flex items-center gap-2.5 h-20 text-[13px] text-fg-2">
            <Loader2 size={16} strokeWidth={1.75} className="animate-spin text-fg-3" />
            {statusText ?? t('common.loading')}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-fg-2 leading-relaxed">
              {t('crash_modal.description')}
            </p>

            {/* the facts of the crash, in mono */}
            <dl
              className="border border-line divide-y divide-line text-xs"
              style={{ borderRadius: "var(--r-md)" }}
            >
              <div className="flex items-center gap-4 px-3 h-8">
                <dt className="w-24 flex-shrink-0 text-fg-3">{t('crash_modal.exit_code')}</dt>
                <dd className="font-mono text-err">{crashData.exit_code ?? 'N/A'}</dd>
              </div>
              <div className="flex items-center gap-4 px-3 h-8">
                <dt className="w-24 flex-shrink-0 text-fg-3">{t('crash_modal.profile_label')}</dt>
                <dd className="font-mono text-fg-2 truncate">{profileLabel}</dd>
              </div>
              {crashData.process_id && (
                <div className="flex items-center gap-4 px-3 h-8">
                  <dt className="w-24 flex-shrink-0 text-fg-3">{t('crash_modal.process_label')}</dt>
                  <dd className="font-mono text-fg-3 truncate">{crashData.process_id}</dd>
                </div>
              )}
              <div className="flex items-center gap-4 px-3 h-8">
                <dt className="w-24 flex-shrink-0 text-fg-3">{t('crash_modal.report_label')}</dt>
                <dd className="font-mono text-fg-3 truncate">
                  {displayedCrashReportContent
                    ? t('crash_modal.report_found')
                    : isListeningForCrashContent
                      ? t('crash_modal.report_waiting')
                      : t('crash_modal.report_none')}
                </dd>
              </div>
            </dl>

            <p className="text-xs text-fg-3 leading-relaxed">
              {t('crash_modal.upload_notice')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
