"use client";

/**
 * LogsTabV3 — functional log-reader.
 *
 * Read-only (like V2) — live tailing overlaps with the Launcher console
 * window. Virtuoso for large log files, level pills + text search +
 * stack-trace-inherit filter logic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  AlertTriangle, ArrowDown, ChevronDown, CloudUpload, FileText, FolderOpen, Loader2, Pin, Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import type { Profile } from "../../../../types/profile";
import {
  getLogFileContent,
  getProfileLogFiles,
  openLogFileDirectory,
  uploadLogToMclogs,
  parseLogLinesFromString,
  LOG_LEVELS,
  type LogLevel,
  type ParsedLogLine,
} from "../../../../services/log-service";
import { useDelayedTrue } from "../../../../hooks/useDelayedTrue";
import { cn } from "../../../../lib/utils";
import { Tooltip } from "../../../ui/Tooltip";
import { ToggleSwitch } from "../../../ui/ToggleSwitch";
import { SearchWithFilters } from "../../../ui/SearchWithFilters";
import { ThemedDropdown, ThemedDropdownItem } from "../shared/ThemedDropdown";
import { EmptyStateV3 } from "../shared/EmptyStateV3";
import { parseErrorMessage } from "../../../../utils/error-utils";

interface LogsTabV3Props {
  profile: Profile;
  isActive?: boolean;
  onRefresh?: () => void;
}

// ─── Level colours ──────────────────────────────────────────────────────────
// Same muted scheme as the log windows (components/log/LogViewerCore.tsx): only warnings and errors
// stand out, info stays on the normal text colour.
const MESSAGE_CLASS: Record<LogLevel, string> = {
  ERROR: "text-err",
  WARN: "text-warn",
  INFO: "text-fg-2",
  DEBUG: "text-fg-3",
  TRACE: "text-fg-3",
};

const LEVEL_DOT: Record<LogLevel, string> = {
  ERROR: "bg-err",
  WARN: "bg-warn",
  INFO: "bg-fg-3",
  DEBUG: "bg-fg-4",
  TRACE: "bg-fg-4",
};

/** Square icon button of the toolbar. */
const ICON_BUTTON =
  "w-8 h-8 flex items-center justify-center flex-shrink-0 text-fg-3 hover:text-fg hover:bg-s2 " +
  "transition-colors duration-fast disabled:opacity-40 disabled:pointer-events-none";

const DEFAULT_LEVELS: Record<LogLevel, boolean> = {
  ERROR: true, WARN: true, INFO: true, DEBUG: true, TRACE: false,
};

function getFilename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function LogsTabV3({ profile, isActive = true, onRefresh }: LogsTabV3Props) {
  const { t } = useTranslation();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledLevels, setEnabledLevels] = useState<Record<LogLevel, boolean>>(DEFAULT_LEVELS);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showThreadPrefix, setShowThreadPrefix] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load file list ────────────────────────────────────────────────────────
  // `selectedPath` is NOT in the deps — we use the functional-setState
  // pattern so the callback isn't rebuilt on every file switch. On profile
  // change, if the previous path doesn't exist in the new list we fall back
  // to paths[0] (usually `latest.log`).
  const loadFiles = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingList(true);
    setError(null);
    try {
      const paths = await getProfileLogFiles(profile.id);
      if (!mountedRef.current) return;
      // latest.log pinned to top, rest sorted by filename descending (newer first).
      paths.sort((a, b) => {
        const aName = getFilename(a).toLowerCase();
        const bName = getFilename(b).toLowerCase();
        if (aName === "latest.log") return -1;
        if (bName === "latest.log") return 1;
        return bName.localeCompare(aName);
      });
      setLogFiles(paths);
      setSelectedPath(prev => (prev && paths.includes(prev)) ? prev : (paths[0] ?? null));
      onRefresh?.();
    } catch (err) {
      console.error("[V3 Logs] Failed to list:", err);
      if (mountedRef.current) setError(parseErrorMessage(err));
    } finally {
      if (mountedRef.current) setIsLoadingList(false);
    }
  }, [profile.id, onRefresh]);

  useEffect(() => {
    if (isActive) void loadFiles();
  }, [isActive, loadFiles]);

  // ── Load content when file changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedPath) {
      setRawContent("");
      return;
    }
    setIsLoadingContent(true);
    setError(null);
    (async () => {
      try {
        const content = await getLogFileContent(selectedPath);
        if (mountedRef.current) setRawContent(content);
      } catch (err) {
        console.error("[V3 Logs] Failed to load content:", err);
        if (mountedRef.current) setError(parseErrorMessage(err));
      } finally {
        if (mountedRef.current) setIsLoadingContent(false);
      }
    })();
  }, [selectedPath]);

  // Parse — memoized so we don't re-parse the full string on every render.
  const parsedLines = useMemo<ParsedLogLine[]>(() => {
    if (!rawContent) return [];
    return parseLogLinesFromString(rawContent);
  }, [rawContent]);

  // ── Filter (mit Stack-Trace-Inherit) ──────────────────────────────────────
  const visibleLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result: ParsedLogLine[] = [];
    let inheritedLevel: LogLevel | null = null;
    for (const line of parsedLines) {
      const effective = line.level ?? inheritedLevel;
      if (line.level) inheritedLevel = line.level;
      if (effective && !enabledLevels[effective]) continue;
      if (!effective && !Object.values(enabledLevels).some(Boolean)) continue;
      if (q) {
        const hay = `${line.text} ${line.thread ?? ""} ${line.level ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      result.push(line);
    }
    return result;
  }, [parsedLines, searchQuery, enabledLevels]);

  const shouldShowLoading = useDelayedTrue(isLoadingContent && parsedLines.length === 0, 500);

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleLevel = (lvl: LogLevel) => setEnabledLevels(prev => ({ ...prev, [lvl]: !prev[lvl] }));

  const handleOpenFolder = useCallback(async () => {
    if (!selectedPath) return;
    try {
      await openLogFileDirectory(selectedPath);
    } catch (err) {
      toast.error(parseErrorMessage(err));
    }
  }, [selectedPath]);

  const handleUpload = useCallback(async () => {
    if (!rawContent || isUploading) return;
    setIsUploading(true);
    try {
      const url = await toast.promise(
        uploadLogToMclogs(rawContent),
        {
          loading: t("profiles.v3.logs.uploading"),
          success: (u: string) => t("profiles.v3.logs.uploadSuccess", { url: u }),
          error: (err) => t("profiles.v3.logs.uploadFailed", { error: parseErrorMessage(err) }),
        },
      );
      // Copy URL to clipboard so the user can paste it straight into a chat.
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t("profiles.v3.logs.urlCopied"));
      } catch { /* clipboard blocked — fine */ }
    } finally {
      if (mountedRef.current) setIsUploading(false);
    }
  }, [rawContent, isUploading, t]);

  const scrollToBottom = useCallback(() => {
    if (virtuosoRef.current && visibleLines.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: visibleLines.length - 1, behavior: "auto" });
    }
  }, [visibleLines.length]);

  const selectedFilename = selectedPath ? getFilename(selectedPath) : t("profiles.v3.logs.noFile");

  return (
    <div className="flex flex-col min-h-0 flex-1 relative">
      <div className="flex items-center gap-2 px-5 h-12 border-b border-line flex-shrink-0">
        <SearchWithFilters
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={t("profiles.v3.logs.searchPlaceholder")}
          showSort={false}
          showFilter={false}
          dropdownSize="sm"
          className="w-60 flex-shrink-0"
        />

        <div
          className="flex h-8 flex-shrink-0 items-center gap-px border border-line bg-s2 p-0.5"
          style={{ borderRadius: "var(--r-md)" }}
        >
          {LOG_LEVELS.map((lvl) => {
            const on = enabledLevels[lvl];
            return (
              <button
                key={lvl}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLevel(lvl)}
                className={cn(
                  "flex h-full items-center gap-1.5 px-2 cc-num text-[10.5px] transition-colors duration-fast",
                  on ? "bg-s3 text-fg-2" : "text-fg-4 hover:text-fg-3",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
                title={on ? t("profiles.v3.logs.hideLevel", { level: lvl }) : t("profiles.v3.logs.showLevel", { level: lvl })}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", LEVEL_DOT[lvl], !on && "opacity-40")} />
                {lvl}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => setFileMenuOpen(v => !v)}
            disabled={logFiles.length === 0}
            className={cn(
              "h-8 min-w-0 max-w-[220px] px-2.5 flex items-center gap-1.5 border border-line text-fg-2",
              "hover:border-line-2 hover:text-fg transition-colors duration-fast disabled:opacity-45",
              fileMenuOpen ? "bg-s3" : "bg-s2",
            )}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <FileText size={13} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
            <span className="truncate cc-num text-[12px]">{selectedFilename}</span>
            <ChevronDown size={12} strokeWidth={1.75} className="flex-shrink-0 text-fg-4" />
          </button>
          <ThemedDropdown open={fileMenuOpen} onClose={() => setFileMenuOpen(false)} width="w-60" scrollable>
            {logFiles.map((path) => {
              const name = getFilename(path);
              return (
                <ThemedDropdownItem
                  key={path}
                  icon={name === "latest.log" ? Pin : FileText}
                  selected={selectedPath === path}
                  onClick={() => { setSelectedPath(path); setFileMenuOpen(false); }}
                >
                  {name}
                </ThemedDropdownItem>
              );
            })}
          </ThemedDropdown>
        </div>

        <Tooltip content={t("profiles.v3.logs.uploadTitle")}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!rawContent || isUploading}
            aria-label={t("profiles.v3.logs.uploadTitle")}
            className={ICON_BUTTON}
            style={{ borderRadius: "var(--r-md)" }}
          >
            {isUploading
              ? <Loader2 size={15} className="animate-spin" />
              : <CloudUpload size={15} strokeWidth={1.75} />}
          </button>
        </Tooltip>
        <Tooltip content={t("profiles.v3.logs.openFolderTitle")}>
          <button
            type="button"
            onClick={handleOpenFolder}
            disabled={!selectedPath}
            aria-label={t("profiles.v3.logs.openFolderTitle")}
            className={ICON_BUTTON}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <FolderOpen size={15} strokeWidth={1.75} />
          </button>
        </Tooltip>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen(v => !v)}
            aria-label={t("profiles.v3.logs.settingsTitle")}
            title={t("profiles.v3.logs.settingsTitle")}
            className={cn(ICON_BUTTON, settingsOpen && "bg-s2 text-fg")}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <Settings2 size={15} strokeWidth={1.75} />
          </button>
          <ThemedDropdown open={settingsOpen} onClose={() => setSettingsOpen(false)} width="w-56">
            <SettingsToggle
              label={t("profiles.v3.logs.showThreadPrefix")}
              checked={showThreadPrefix}
              onChange={() => setShowThreadPrefix(v => !v)}
            />
            <SettingsToggle
              label={t("profiles.v3.logs.wordWrap")}
              checked={wordWrap}
              onChange={() => setWordWrap(v => !v)}
            />
          </ThemedDropdown>
        </div>
      </div>

      {/* Virtuoso needs `flex: 1 + minHeight: 0`, the default would clamp it to ~400px. */}
      <div className="flex-1 min-h-0 relative flex flex-col pt-2">
        {error && (
          <div
            className="mx-5 mb-2 flex items-start gap-2.5 px-3 py-2 border border-err/30 bg-err/10"
            style={{ borderRadius: "var(--r-md)" }}
          >
            <AlertTriangle size={14} strokeWidth={1.75} className="text-err flex-shrink-0 mt-px" />
            <div className="flex-1 min-w-0 text-[12px] text-fg-2 break-words leading-[1.5]">{error}</div>
            <button
              type="button"
              onClick={loadFiles}
              className="flex-shrink-0 h-6 px-2 text-[12px] font-[520] text-err hover:bg-err/10 transition-colors duration-fast"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              {t("profiles.v3.content.retry")}
            </button>
          </div>
        )}

        {isLoadingList && logFiles.length === 0 && !error ? (
          <div className="flex items-center justify-center gap-2 h-full text-[12px] text-fg-3">
            <Loader2 size={14} className="animate-spin" />
            {t("profiles.v3.content.loading")}
          </div>
        ) : logFiles.length === 0 && !isLoadingList ? (
          <EmptyStateV3
            icon="solar:clipboard-text-bold-duotone"
            title={t("profiles.v3.logs.emptyFiles")}
            hint={t("profiles.v3.logs.emptyFilesHint")}
          />
        ) : isLoadingContent && parsedLines.length === 0 ? (
          shouldShowLoading ? (
            <div className="flex items-center justify-center gap-2 h-full text-[12px] text-fg-3 animate-in fade-in duration-300">
              <Loader2 size={14} className="animate-spin" />
              {t("profiles.v3.content.loading")}
            </div>
          ) : null
        ) : visibleLines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyStateV3
              icon="solar:magnifer-linear"
              title={searchQuery
                ? t("profiles.v3.logs.noMatchSearch", { query: searchQuery })
                : t("profiles.v3.logs.noMatchFilter")}
              hint={searchQuery ? undefined : t("profiles.v3.logs.noMatchFilterHint")}
            />
          </div>
        ) : (
          <Virtuoso
            // Remount on file switch so the scroll position resets and
            // `followOutput="auto"` lands on the newest line.
            key={selectedPath ?? "none"}
            ref={virtuosoRef}
            data={visibleLines}
            atBottomStateChange={setAtBottom}
            className="font-mono text-[12px] leading-[1.6] select-text custom-scrollbar"
            style={{ flex: 1, minHeight: 0 }}
            itemContent={(_idx, line) => (
              <LogLine line={line} showThreadPrefix={showThreadPrefix} wordWrap={wordWrap} />
            )}
            followOutput="auto"
            increaseViewportBy={400}
          />
        )}

        {!atBottom && visibleLines.length > 10 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="cc-pop absolute bottom-4 right-5 h-8 px-3 inline-flex items-center gap-1.5 bg-s3 border border-line-2 text-[12px] font-[520] text-fg hover:bg-s4 shadow-pop transition-colors duration-fast"
            style={{ borderRadius: "var(--r-md)" }}
            title={t("profiles.v3.logs.jumpToBottom")}
          >
            <ArrowDown size={13} strokeWidth={1.75} />
            {t("profiles.v3.logs.jumpToBottom")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Log Line ───────────────────────────────────────────────────────────────
// Like the log windows: time in fg-3, the optional [thread/LEVEL] prefix in fg-4, the message in its
// muted level colour; errors and warnings get a 2 px bar at the left edge. Continuation lines (no
// timestamp, e.g. stack traces) keep the colour of the line they belong to via the filter above.
interface LogLineProps {
  line: ParsedLogLine;
  showThreadPrefix: boolean;
  wordWrap: boolean;
}

const LogLine: React.FC<LogLineProps> = ({ line, showThreadPrefix, wordWrap }) => {
  const wrapClass = wordWrap ? "break-words whitespace-pre-wrap" : "whitespace-pre overflow-x-auto";
  const loud = line.level === "ERROR" || line.level === "WARN";
  const messageClass = line.level ? MESSAGE_CLASS[line.level] : "text-fg-2";

  return (
    <div className="relative flex flex-nowrap items-start px-5 hover:bg-s1">
      {loud && (
        <span
          aria-hidden
          className={cn("absolute left-0 top-0 bottom-0 w-[2px]", line.level === "ERROR" ? "bg-err/70" : "bg-warn/70")}
        />
      )}
      {line.timestamp && (
        <span className="flex-shrink-0 select-none pr-3 text-fg-3">
          {line.timestamp}
          {showThreadPrefix && line.thread && (
            <span className="ml-2 text-fg-4">
              [{line.thread}/<span className={loud ? messageClass : undefined}>{line.level ?? ""}</span>]
            </span>
          )}
        </span>
      )}
      <span className={cn("flex-1 min-w-0", wrapClass, messageClass)}>{line.text}</span>
    </div>
  );
};

// ─── Settings Toggle ────────────────────────────────────────────────────────
const SettingsToggle: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({
  label, checked, onChange,
}) => (
  <div className="w-full flex items-center justify-between gap-3 h-8 px-2 text-[13px] text-fg-2">
    <span>{label}</span>
    <ToggleSwitch size="sm" checked={checked} onChange={() => onChange()} />
  </div>
);
