import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowDownToLine,
  ChevronDown,
  Copy,
  FileText,
  FolderOpen,
  Loader2,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLogSettingsStore } from "../../store/useLogSettingsStore";
import { LogEntry, LogLevel } from "../../store/useProcessStore";
import { openExternalUrl } from "../../services/tauri-service";
import { uploadLogToMclogs } from "../../services/log-service";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { parseErrorMessage } from "../../utils/error-utils";
import { cn } from "../../lib/utils";
import { ToggleSwitch } from "../ui/ToggleSwitch";

const FILTER_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

// muted level colours: only warnings and errors stand out, info stays on the normal text colour
const MESSAGE_CLASS: Record<LogLevel, string> = {
  ERROR: "text-err",
  WARN: "text-warn",
  INFO: "text-fg-2",
  DEBUG: "text-fg-3",
  TRACE: "text-fg-3",
  UNKNOWN: "text-fg-2",
};

const LEVEL_DOT: Record<LogLevel, string> = {
  ERROR: "bg-err",
  WARN: "bg-warn",
  INFO: "bg-fg-3",
  DEBUG: "bg-fg-4",
  TRACE: "bg-fg-4",
  UNKNOWN: "bg-fg-4",
};

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

interface DisplayLogLine {
  id: string;
  timestamp: string | null;
  level: LogLevel;
  thread: string | null;
  message: string;
  processId: string;
  /** position in the whole buffer, shown in the gutter */
  line: number;
}

/** Marks every match of the search in a message. */
function highlight(message: string, needle: string): ReactNode {
  if (!needle) return message;
  const lower = message.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(needle, from);
  while (at !== -1 && parts.length < 64) {
    if (at > from) parts.push(message.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-[2px] bg-warn/25 text-fg">
        {message.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  if (parts.length === 0) return message;
  parts.push(message.slice(from));
  return parts;
}

/** Small flat button of the log toolbar; icon-only unless it has a label. */
function ToolButton({
  icon,
  label,
  title,
  active,
  disabled,
  onClick,
  buttonRef,
  className,
}: {
  icon: ReactNode;
  label?: ReactNode;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 flex-shrink-0 items-center justify-center gap-1.5 text-xs font-[520] transition-colors duration-fast",
        label ? "px-2" : "w-7",
        active ? "bg-s3 text-fg" : "text-fg-3 hover:bg-s3 hover:text-fg",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
      style={{ borderRadius: "var(--r-sm)" }}
    >
      {icon}
      {label && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}

// Convert LogEntry to DisplayLogLine
function logEntryToDisplayLine(entry: LogEntry, index: number): DisplayLogLine {
  const timestamp = entry.timestamp
    ? entry.timestamp.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return {
    id: entry.id,
    timestamp,
    level: entry.level,
    thread: entry.thread,
    message: entry.message,
    processId: entry.processId,
    line: index + 1,
  };
}

function formatLogLineForCopy(log: DisplayLogLine, showThreadPrefix: boolean): string {
  if (log.timestamp) {
    if (showThreadPrefix) {
      return `[${log.timestamp}] [${log.thread || "main"}/${log.level}] ${log.message}`;
    }
    return `[${log.timestamp}] ${log.message}`;
  }
  return `    ${log.message}`;
}

function getLogIndexFromNode(node: Node | null): number | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const row = element?.closest("[data-log-index]");
  if (!row) return null;
  const index = Number.parseInt(row.getAttribute("data-log-index") ?? "", 10);
  return Number.isNaN(index) ? null : index;
}

function getLogIndexFromPoint(clientX: number, clientY: number): number | null {
  return getLogIndexFromNode(document.elementFromPoint(clientX, clientY));
}

function buildLogCopyText(
  logs: DisplayLogLine[],
  range: { start: number; end: number },
  showThreadPrefix: boolean,
): string {
  return logs
    .slice(range.start, range.end + 1)
    .map((log) => formatLogLineForCopy(log, showThreadPrefix))
    .join("\n");
}

export interface LogViewerCoreProps {
  logs: LogEntry[];
  onClear?: () => void;
  showNoLogsMessage?: boolean;
  noLogsIcon?: string;
  noLogsTitle?: string;
  noLogsSubtitle?: string;
  logFiles?: string[];
  selectedLogPath?: string | null;
  onLogSelect?: (path: string) => void;
  onOpenFolder?: () => void;
}

export function LogViewerCore({
  logs,
  onClear,
  showNoLogsMessage = true,
  noLogsTitle = "No logs yet",
  noLogsSubtitle = "Waiting for log output...",
  logFiles,
  selectedLogPath,
  onLogSelect,
  onOpenFolder,
}: LogViewerCoreProps) {
  const { t } = useTranslation();
  const showThreadPrefix = useLogSettingsStore((state) => state.showThreadPrefix);
  const toggleShowThreadPrefix = useLogSettingsStore((state) => state.toggleShowThreadPrefix);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [levelFilters, setLevelFilters] = useState<Record<LogLevel, boolean>>({
    ERROR: true,
    WARN: true,
    INFO: true,
    DEBUG: true,
    TRACE: false,
    UNKNOWN: true,
  });
  const [isAutoscrollEnabled, setIsAutoscrollEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopupRef = useRef<HTMLDivElement>(null);
  const fileDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const fileDropdownRef = useRef<HTMLDivElement>(null);
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isPointerSelecting, setIsPointerSelecting] = useState(false);
  const selectionAnchorIndexRef = useRef<number | null>(null);
  const isMouseSelectingRef = useRef(false);
  const isAutoscrollEnabledRef = useRef(isAutoscrollEnabled);
  isAutoscrollEnabledRef.current = isAutoscrollEnabled;
  // State for delayed "NO LOGS YET" display
  const [showNoLogs, setShowNoLogs] = useState(false);

  // Convert log entries to display format
  const displayLogs = useMemo(() => {
    return logs.map(logEntryToDisplayLine);
  }, [logs]);

  // warnings and errors in the whole buffer, for the status bar
  const levelCounts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const log of displayLogs) {
      if (log.level === "ERROR") errors++;
      else if (log.level === "WARN") warnings++;
    }
    return { errors, warnings };
  }, [displayLogs]);

  // Filter logs based on search and level filters. Search uses React deferred input
  // so large log tails do not rescan synchronously on every keystroke.
  const filteredLogs = useMemo(() => {
    const searchLower = deferredSearchTerm.trim().toLowerCase();
    return displayLogs.filter((log) => {
      if (!levelFilters[log.level]) return false;
      if (!searchLower) return true;

      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.thread?.toLowerCase().includes(searchLower) ||
        log.level.toLowerCase().includes(searchLower)
      );
    });
  }, [displayLogs, levelFilters, deferredSearchTerm]);

  const filteredLogsRef = useRef(filteredLogs);
  filteredLogsRef.current = filteredLogs;
  const selectionRangeRef = useRef(selectionRange);
  selectionRangeRef.current = selectionRange;

  useEffect(() => {
    if (isMouseSelectingRef.current) return;
    if (!isAutoscrollEnabled || filteredLogs.length === 0) return;
    const lastIndex = filteredLogs.length - 1;
    const jumpToBottom = () =>
      virtuosoRef.current?.scrollToIndex({
        index: lastIndex,
        align: "end",
        behavior: "auto",
      });
    jumpToBottom();
    const raf = requestAnimationFrame(jumpToBottom);
    return () => cancelAnimationFrame(raf);
  }, [filteredLogs.length, isAutoscrollEnabled]);

  const userScrollRef = useRef(false);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markUserScroll = useCallback(() => {
    userScrollRef.current = true;
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    userScrollTimer.current = setTimeout(() => {
      userScrollRef.current = false;
    }, 400);
  }, []);
  useEffect(() => () => {
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
  }, []);

  const handleAtBottomChange = useCallback((atBottom: boolean) => {
    if (isMouseSelectingRef.current) return;
    if (atBottom) {
      setIsAutoscrollEnabled(true);
      return;
    }
    if (userScrollRef.current) setIsAutoscrollEnabled(false);
  }, []);

  // Delay showing "NO LOGS YET" by 1 second to avoid flicker
  useEffect(() => {
    setShowNoLogs(false);
    if (filteredLogs.length === 0) {
      const timer = setTimeout(() => setShowNoLogs(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [filteredLogs.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSettingsOpen &&
        settingsPopupRef.current &&
        settingsButtonRef.current &&
        !settingsPopupRef.current.contains(event.target as Node) &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
      if (
        isFileDropdownOpen &&
        fileDropdownRef.current &&
        fileDropdownButtonRef.current &&
        !fileDropdownRef.current.contains(event.target as Node) &&
        !fileDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsFileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen, isFileDropdownOpen]);

  const commitSelectionIndices = useCallback((anchorIndex: number, focusIndex: number) => {
    setSelectionRange({
      start: Math.min(anchorIndex, focusIndex),
      end: Math.max(anchorIndex, focusIndex),
    });
  }, []);

  const copySelectedLogs = useCallback(() => {
    const range = selectionRangeRef.current;
    if (!range) return false;

    const text = buildLogCopyText(filteredLogsRef.current, range, showThreadPrefix);
    if (!text) return false;

    void writeText(text).catch((error) => {
      console.error("Failed to copy selected logs:", error);
      toast.error(t("logs.copy_failed", { defaultValue: "Failed to copy logs" }));
    });
    return true;
  }, [showThreadPrefix, t]);

  useEffect(() => {
    selectionAnchorIndexRef.current = null;
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  }, [searchTerm, levelFilters, selectedLogPath]);

  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;

    const lastPointer = { x: 0, y: 0 };
    let edgeScrollRaf: number | null = null;

    const getScroller = () =>
      container.querySelector("[data-virtuoso-scroller]") as HTMLElement | null;

    const getEdgeScrollDelta = (clientY: number) => {
      const rect = container.getBoundingClientRect();
      const edgeThreshold = 56;
      const maxSpeed = 9;

      if (clientY >= rect.bottom - edgeThreshold) {
        const intensity = Math.min(1, (clientY - (rect.bottom - edgeThreshold)) / edgeThreshold);
        return maxSpeed * (0.2 + intensity * 0.8);
      }
      if (clientY <= rect.top + edgeThreshold) {
        const intensity = Math.min(1, (rect.top + edgeThreshold - clientY) / edgeThreshold);
        return -maxSpeed * (0.2 + intensity * 0.8);
      }
      return 0;
    };

    const getVisibleBoundaryIndex = (direction: "up" | "down"): number | null => {
      const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-log-index]"));
      if (rows.length === 0) return null;

      const boundaryRow = direction === "up" ? rows[0] : rows[rows.length - 1];
      const index = Number.parseInt(boundaryRow.getAttribute("data-log-index") ?? "", 10);
      return Number.isNaN(index) ? null : index;
    };

    const updateSelectionFromPointer = (
      clientX: number,
      clientY: number,
      fallbackDirection?: "up" | "down",
    ) => {
      const anchorIndex = selectionAnchorIndexRef.current;
      if (anchorIndex === null) return;

      let hitIndex = getLogIndexFromPoint(clientX, clientY);
      if (hitIndex === null && fallbackDirection) {
        hitIndex = getVisibleBoundaryIndex(fallbackDirection);
      }

      if (hitIndex !== null) {
        commitSelectionIndices(anchorIndex, hitIndex);
      }
    };

    const stopEdgeScroll = () => {
      if (edgeScrollRaf !== null) {
        cancelAnimationFrame(edgeScrollRaf);
        edgeScrollRaf = null;
      }
    };

    const tickEdgeScroll = () => {
      if (!isMouseSelectingRef.current) {
        stopEdgeScroll();
        return;
      }

      const scrollDelta = getEdgeScrollDelta(lastPointer.y);
      if (scrollDelta !== 0) {
        const scroller = getScroller();
        if (scroller) {
          scroller.scrollTop += scrollDelta;
        }
        updateSelectionFromPointer(
          lastPointer.x,
          lastPointer.y,
          scrollDelta < 0 ? "up" : "down",
        );
      }

      if (getEdgeScrollDelta(lastPointer.y) !== 0) {
        edgeScrollRaf = requestAnimationFrame(tickEdgeScroll);
      } else {
        edgeScrollRaf = null;
      }
    };

    const syncEdgeScroll = (clientY: number) => {
      if (getEdgeScrollDelta(clientY) === 0) {
        stopEdgeScroll();
        return;
      }
      if (edgeScrollRaf === null) {
        edgeScrollRaf = requestAnimationFrame(tickEdgeScroll);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const anchorIndex = getLogIndexFromNode(event.target as Node);
      if (anchorIndex === null) return;

      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      container.focus({ preventScroll: true });

      isMouseSelectingRef.current = true;
      setIsPointerSelecting(true);
      selectionAnchorIndexRef.current = anchorIndex;
      commitSelectionIndices(anchorIndex, anchorIndex);

      container.setPointerCapture(event.pointerId);

      if (isAutoscrollEnabledRef.current) {
        setIsAutoscrollEnabled(false);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isMouseSelectingRef.current) return;
      lastPointer.x = event.clientX;
      lastPointer.y = event.clientY;
      updateSelectionFromPointer(event.clientX, event.clientY);
      syncEdgeScroll(event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isMouseSelectingRef.current) return;

      stopEdgeScroll();
      lastPointer.x = event.clientX;
      lastPointer.y = event.clientY;
      updateSelectionFromPointer(event.clientX, event.clientY);
      isMouseSelectingRef.current = false;
      setIsPointerSelecting(false);

      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (key === "escape") {
        selectionAnchorIndexRef.current = null;
        setSelectionRange(null);
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (mod && key === "c") {
        if (!selectionRangeRef.current) return;
        event.preventDefault();
        copySelectedLogs();
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("keydown", onKeyDown);

    return () => {
      stopEdgeScroll();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("keydown", onKeyDown);
    };
  }, [commitSelectionIndices, copySelectedLogs]);

  const toggleLevelFilter = (level: LogLevel) => {
    setLevelFilters((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (filteredLogs.length === 0) {
      toast.error(t('logs.no_logs_to_upload'));
      return;
    }

    setIsUploading(true);
    try {
      const logText = filteredLogs
        .map((log) => formatLogLineForCopy(log, true))
        .join("\n");

      // Use Tauri backend command instead of direct fetch (CSP blocked in production)
      const url = await uploadLogToMclogs(logText);

      await writeText(url);
      toast.success(t('logs.uploaded_url_copied'));
      await openExternalUrl(url);
    } catch (error) {
      console.error("Failed to upload logs:", error);
      // Extract error message properly from Tauri CommandError
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : parseErrorMessage(error);
      toast.error(errorMessage || t('logs.upload_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    if (virtuosoRef.current && filteredLogs.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: filteredLogs.length - 1, align: "end", behavior: "auto" });
    }
    setIsAutoscrollEnabled(true);
  };

  const handleCopy = () => {
    if (copySelectedLogs()) {
      toast.success(t("logs.copy_success"));
      return;
    }
    if (filteredLogs.length === 0) return;
    const text = filteredLogs.map((log) => formatLogLineForCopy(log, showThreadPrefix)).join("\n");
    writeText(text)
      .then(() => toast.success(t("logs.copy_success")))
      .catch((error) => {
        console.error("Failed to copy logs:", error);
        toast.error(t("logs.copy_failed", { defaultValue: "Failed to copy logs" }));
      });
  };

  const needle = deferredSearchTerm.trim().toLowerCase();
  const gutterWidth = `calc(${String(Math.max(displayLogs.length, 1)).length}ch + 22px)`;
  const selectedCount = selectionRange ? selectionRange.end - selectionRange.start + 1 : 0;

  const renderLogLine = (index: number, log: DisplayLogLine) => {
    const isSelected =
      selectionRange !== null && index >= selectionRange.start && index <= selectionRange.end;
    const isLast = index === filteredLogs.length - 1;
    const loud = log.level === "ERROR" || log.level === "WARN";

    return (
      <div
        key={log.id}
        data-log-id={log.id}
        data-log-index={index}
        className={cn(
          "flex flex-nowrap items-start pr-4",
          isLast && "pb-2",
          isSelected ? "bg-s3" : "hover:bg-s1",
        )}
      >
        <span
          className="relative flex-shrink-0 select-none pr-3 text-right tabular-nums text-fg-4"
          style={{ width: gutterWidth }}
        >
          {loud && (
            <span
              aria-hidden
              className={cn(
                "absolute bottom-0 left-0 top-0 w-[2px]",
                log.level === "ERROR" ? "bg-err/70" : "bg-warn/70",
              )}
            />
          )}
          {log.line}
        </span>
        {log.timestamp && (
          <span className="flex-shrink-0 select-none pr-3 text-fg-3">
            {log.timestamp}
            {showThreadPrefix && (
              <span className="ml-2 text-fg-4">
                [{log.thread || "main"}/<span className={loud ? MESSAGE_CLASS[log.level] : undefined}>{log.level}</span>]
              </span>
            )}
          </span>
        )}
        <span className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words", MESSAGE_CLASS[log.level])}>
          {highlight(log.message, needle)}
        </span>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-bg">
      {/* Toolbar: search, level filter, actions, follow */}
      <div className="flex h-10 flex-shrink-0 items-center gap-1.5 border-b border-line bg-bg px-2">
        <label
          className="flex h-7 min-w-[120px] max-w-[280px] flex-1 items-center gap-1.5 border border-line bg-s2 px-2 transition-colors duration-fast focus-within:border-line-3"
          style={{ borderRadius: "var(--r-md)" }}
        >
          <Search size={14} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
          <input
            type="text"
            placeholder={t('placeholders.search_logs')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-4"
          />
          {needle && (
            <span className="flex-shrink-0 font-mono text-[11px] text-fg-3">{filteredLogs.length}</span>
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="-mr-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-fg-3 hover:text-fg"
              style={{ borderRadius: "var(--r-sm)" }}
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          )}
        </label>

        <div
          className="flex h-7 flex-shrink-0 items-center gap-px border border-line bg-s2 p-0.5"
          style={{ borderRadius: "var(--r-md)" }}
        >
          {FILTER_LEVELS.map((level) => {
            const on = levelFilters[level];
            return (
              <button
                key={level}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLevelFilter(level)}
                className={cn(
                  "flex h-full items-center gap-1.5 px-1.5 font-mono text-[10.5px] transition-colors duration-fast",
                  on ? "bg-s3 text-fg-2" : "text-fg-4 hover:text-fg-3",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", LEVEL_DOT[level], !on && "opacity-40")} />
                {level}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1" />

        {logFiles && logFiles.length > 0 && onLogSelect && (
          <button
            ref={fileDropdownButtonRef}
            type="button"
            onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
            className={cn(
              "flex h-7 min-w-0 max-w-[240px] items-center gap-1.5 border border-line px-2 text-fg-2 transition-colors duration-fast hover:border-line-2 hover:text-fg",
              isFileDropdownOpen ? "bg-s3" : "bg-s2",
            )}
            style={{ borderRadius: "var(--r-md)" }}
          >
            <FileText size={14} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
            <span className="truncate font-mono text-[11.5px]">
              {selectedLogPath ? (selectedLogPath.split(/[\\/]/).pop() || selectedLogPath) : t('logs.select_log_placeholder')}
            </span>
            <ChevronDown size={13} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
          </button>
        )}

        <ToolButton
          icon={<Copy size={15} strokeWidth={1.75} />}
          title={t("logs.copy_hint")}
          disabled={filteredLogs.length === 0}
          onClick={handleCopy}
        />
        <ToolButton
          icon={
            isUploading ? (
              <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <Upload size={15} strokeWidth={1.75} />
            )
          }
          title={isUploading ? t('logs.uploading') : t('logs.upload')}
          disabled={isUploading}
          onClick={handleUpload}
        />
        {onOpenFolder && (
          <ToolButton
            icon={<FolderOpen size={15} strokeWidth={1.75} />}
            title={t('logs.open_folder')}
            onClick={onOpenFolder}
          />
        )}
        {onClear && (
          <ToolButton
            icon={<Trash2 size={15} strokeWidth={1.75} />}
            title={t('logs.clear')}
            onClick={onClear}
          />
        )}

        <span className="mx-1 h-4 w-px flex-shrink-0 bg-line-2" />

        <ToolButton
          icon={<ArrowDownToLine size={15} strokeWidth={1.75} />}
          label={t("logs.follow")}
          title={isAutoscrollEnabled ? t('logs.following') : t('logs.paused')}
          active={isAutoscrollEnabled}
          onClick={() => (isAutoscrollEnabled ? setIsAutoscrollEnabled(false) : scrollToBottom())}
        />
        <ToolButton
          buttonRef={settingsButtonRef}
          icon={<SlidersHorizontal size={15} strokeWidth={1.75} />}
          title={t('logs.settings')}
          active={isSettingsOpen}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        />
      </div>

      {/* Log body */}
      <div
        ref={logContainerRef}
        tabIndex={0}
        role="region"
        aria-label={t("logs.viewer_region", { defaultValue: "Log output" })}
        onMouseDown={() => logContainerRef.current?.focus({ preventScroll: true })}
        onWheel={markUserScroll}
        onTouchMove={markUserScroll}
        onPointerDown={markUserScroll}
        className="relative flex min-h-0 flex-1 flex-col bg-bg pt-1.5 font-mono text-[12px] leading-[18px] outline-none"
      >
        {filteredLogs.length === 0 ? (
          showNoLogs && showNoLogsMessage && (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center font-sans">
              <p className="text-[13px] text-fg-2">{noLogsTitle}</p>
              <p className="text-xs text-fg-3">{noLogsSubtitle}</p>
            </div>
          )
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            className={`custom-scrollbar overflow-x-hidden ${isPointerSelecting ? "select-none" : "select-text"}`}
            style={{ flex: 1, minHeight: 0 }}
            data={filteredLogs}
            computeItemKey={(_index, log) => log.id}
            increaseViewportBy={{ top: 400, bottom: 400 }}
            atBottomStateChange={handleAtBottomChange}
            initialTopMostItemIndex={filteredLogs.length > 0 ? filteredLogs.length - 1 : 0}
            itemContent={(index, log) => renderLogLine(index, log)}
          />
        )}

        {!isAutoscrollEnabled && filteredLogs.length > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="cc-popover cc-pop absolute bottom-3 right-5 z-10 flex h-7 items-center gap-1.5 px-2.5 font-sans text-xs text-fg-2 transition-colors duration-fast hover:text-fg"
          >
            <ArrowDown size={14} strokeWidth={1.75} />
            {t('logs.scroll_to_bottom')}
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-7 flex-shrink-0 items-center gap-4 border-t border-line bg-s1 px-3 text-[11px] text-fg-3">
        <span className="font-mono">
          {filteredLogs.length === displayLogs.length
            ? t('logs.lines_count', { count: displayLogs.length })
            : t('logs.shown_of_total', { shown: filteredLogs.length, total: displayLogs.length })}
        </span>
        {selectedCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-fg-2">{t("logs.selected_lines", { count: selectedCount })}</span>
            <kbd className="border border-line-2 bg-s2 px-1 font-mono text-[10px] leading-[14px] text-fg-3" style={{ borderRadius: "var(--r-sm)" }}>
              {isMac ? "⌘C" : "Ctrl+C"}
            </kbd>
          </span>
        )}
        <span className="flex-1" />
        {levelCounts.errors > 0 && (
          <span className="font-mono text-err">ERROR {levelCounts.errors}</span>
        )}
        {levelCounts.warnings > 0 && (
          <span className="font-mono text-warn">WARN {levelCounts.warnings}</span>
        )}
      </div>

      {/* Settings Popup */}
      {isSettingsOpen && settingsButtonRef.current && createPortal(
        <div
          ref={settingsPopupRef}
          className="cc-popover cc-pop fixed w-[260px] p-3"
          style={{
            top: settingsButtonRef.current.getBoundingClientRect().bottom + 6,
            right: window.innerWidth - settingsButtonRef.current.getBoundingClientRect().right,
            zIndex: 9999,
          }}
        >
          <div className="cc-eyebrow mb-2.5">{t('logs.settings')}</div>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-fg">{t('logs.thread_prefix')}</div>
              <div className="mt-0.5 text-xs text-fg-3">{t('logs.thread_prefix_desc')}</div>
            </div>
            <ToggleSwitch
              size="sm"
              checked={showThreadPrefix}
              onChange={() => toggleShowThreadPrefix()}
              className="mt-0.5"
            />
          </div>
        </div>,
        document.body
      )}

      {isFileDropdownOpen && fileDropdownButtonRef.current && createPortal(
        <div
          ref={fileDropdownRef}
          className="cc-popover cc-pop custom-scrollbar fixed max-h-[300px] min-w-[200px] max-w-[400px] overflow-y-auto p-1"
          style={{
            top: fileDropdownButtonRef.current.getBoundingClientRect().bottom + 6,
            right: window.innerWidth - fileDropdownButtonRef.current.getBoundingClientRect().right,
            zIndex: 9999,
          }}
        >
          {logFiles?.map((path) => {
            const name = path.split(/[\\/]/).pop() || path;
            const isSelected = path === selectedLogPath;
            return (
              <button
                key={path}
                type="button"
                onClick={() => { onLogSelect?.(path); setIsFileDropdownOpen(false); }}
                className={cn(
                  "flex h-8 w-full items-center truncate px-2.5 text-left font-mono text-xs transition-colors duration-fast",
                  isSelected ? "bg-s3 text-fg" : "text-fg-2 hover:bg-s2 hover:text-fg",
                )}
                style={{ borderRadius: "var(--r-sm)" }}
              >
                {name}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
