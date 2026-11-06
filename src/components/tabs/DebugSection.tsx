import { useState, useEffect, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  Check,
  Copy,
  FileText,
  List,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useTranslation } from "react-i18next";
import {
  listLauncherLogs,
  listCrashReports,
  listAllMcLogs,
  listProcessLogs,
  getLogFileContent,
  uploadLogToMclogs,
  type FileInfo,
} from "../../services/log-service";
import {
  getCachedPermissions,
  refreshPermissions,
  type PermissionCacheState,
} from "../../services/permission-service";
import {
  listProfileBackups,
  restoreProfileBackup,
  type ProfileBackupInfo,
} from "../../services/profile-service";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useProfileStore } from "../../store/profile-store";
import { useContentCacheStore } from "../../store/content-cache-store";
import { SettingsSection } from "../ui/settings/SettingsSection";
import { SettingRow } from "../ui/settings/SettingRow";
import { Select } from "../ui/Select";
import { Button } from "../ui/buttons/Button";
import { cn } from "../../lib/utils";
import { useSettingsConfig } from "./settings/settings-context";
import { LOG_LEVELS, type LogLevel } from "../../types/launcherConfig";
import { logError } from '../../utils/logging-utils';

/** a bordered list of dense rows */
const LIST = "border border-line overflow-hidden";
const LIST_STYLE = { borderRadius: "var(--r-md)" } as const;
/** the small square row actions that show on hover */
const ROW_ACTION = "cc-icon-btn w-7 h-7 disabled:opacity-40";

export type DebugTab = "launcher" | "minecraft" | "process" | "crashes" | "permissions" | "testing";

export function getDebugTabs(t: (key: string) => string): { id: DebugTab; label: string }[] {
  return [
    { id: "launcher", label: t("debug.tabs.launcher") },
    { id: "minecraft", label: t("debug.tabs.minecraft") },
    { id: "process", label: t("debug.tabs.process") },
    { id: "crashes", label: t("debug.tabs.crashes") },
    { id: "permissions", label: t("debug.permissions.tab") },
    { id: "testing", label: t("debug.tabs.testing") },
  ];
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return (e as { message: string }).message;
  }
  return String(e);
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (timestamp: number) => {
  if (timestamp === 0) return "-";
  return new Date(timestamp * 1000).toLocaleString();
};

interface LogFileSectionProps {
  id: DebugTab;
  title: string;
  crash?: boolean;
  loader: () => Promise<FileInfo[]>;
}

function LogFileSection({ id, title, crash, loader }: LogFileSectionProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const f = await loader();
        if (!cancelled) setFiles(f);
      } catch (e) {
        logError(`Failed to load files: ${e}`);
        if (!cancelled) setFiles([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(file: FileInfo) {
    setUploadingFile(file.path);
    try {
      const content = await getLogFileContent(file.path);
      const url = await uploadLogToMclogs(content);
      await writeText(url);
      toast.success(t("debug.uploaded_copied"));
    } catch (e) {
      logError(`Failed to upload: ${e}`);
      toast.error(t("debug.upload_failed", { error: getErrorMessage(e) }));
    }
    setUploadingFile(null);
  }

  async function handleCopyContent(file: FileInfo) {
    try {
      const content = await getLogFileContent(file.path);
      await writeText(content);
      toast.success(t("debug.copied"));
    } catch (e) {
      logError(`Failed to copy: ${e}`);
      toast.error(t("debug.copy_failed", { error: getErrorMessage(e) }));
    }
  }

  return (
    <SettingsSection id={`settings-section-${id}`} title={title}>
      <div className="pt-2 pb-1">
        <div className={LIST} style={LIST_STYLE}>
          {loading ? (
            <div className="flex items-center gap-2 px-3 h-10 text-[13px] text-fg-3">
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              {t("common.loading")}
            </div>
          ) : files.length === 0 ? (
            <div className="px-3 h-10 flex items-center text-[13px] text-fg-3">{t("debug.no_files")}</div>
          ) : (
            <div className="divide-y divide-line max-h-[320px] overflow-y-auto custom-scrollbar">
              {files.map((file, i) => (
                <div key={i} className="group flex items-center gap-3 px-3 py-2 hover:bg-s2 transition-colors duration-fast">
                  {crash ? (
                    <AlertTriangle size={14} strokeWidth={1.75} className="flex-shrink-0 text-err" />
                  ) : (
                    <FileText size={14} strokeWidth={1.75} className="flex-shrink-0 text-fg-3" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-fg truncate">{file.name}</div>
                    <div className="font-mono text-[11px] text-fg-3 truncate" title={file.path}>{file.path}</div>
                  </div>
                  <div className="font-mono text-xs text-fg-3 whitespace-nowrap">
                    {formatSize(file.size)}
                  </div>
                  <div className="font-mono text-[11px] text-fg-4 whitespace-nowrap hidden lg:block">
                    {formatDate(file.modified)}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-fast">
                    <button
                      type="button"
                      onClick={() => handleCopyContent(file)}
                      className={ROW_ACTION}
                      title={t("debug.copy_content")}
                      aria-label={t("debug.copy_content")}
                    >
                      <Copy size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpload(file)}
                      disabled={uploadingFile === file.path}
                      className={ROW_ACTION}
                      title={t("debug.upload_mclogs")}
                      aria-label={t("debug.upload_mclogs")}
                    >
                      {uploadingFile === file.path ? (
                        <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                      ) : (
                        <Upload size={14} strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

export function DebugSection() {
  const { t } = useTranslation();
  const { tempConfig, setTempConfig, saving } = useSettingsConfig();
  const [permissions, setPermissions] = useState<PermissionCacheState | null>(null);
  const [refreshingPerms, setRefreshingPerms] = useState(false);

  useEffect(() => {
    getCachedPermissions().then(setPermissions).catch(() => setPermissions(null));
  }, []);

  async function handleRefreshPermissions() {
    setRefreshingPerms(true);
    try {
      await refreshPermissions();
      const cached = await getCachedPermissions();
      setPermissions(cached);
      toast.success(t("debug.permissions.refreshed"));
    } catch (e) {
      logError(`Failed to refresh permissions: ${e}`);
      toast.error(t("debug.permissions.refresh_failed", { error: getErrorMessage(e) }));
    }
    setRefreshingPerms(false);
  }

  return (
    <div className="space-y-8">
      <SettingsSection id="settings-section-log-level" title={t("debug.log_level.title")}>
        <SettingRow label={t("debug.log_level.label")} description={t("debug.log_level.tooltip")} disabled={saving}>
          <div className="w-44">
            <Select
              value={tempConfig?.log_level ?? "debug"}
              onChange={(value) => tempConfig && setTempConfig({ ...tempConfig, log_level: value as LogLevel })}
              options={LOG_LEVELS.map((level) => ({ value: level, label: t(`debug.log_level.${level}`) }))}
              size="sm"
              variant="flat"
              disabled={saving}
            />
          </div>
        </SettingRow>
      </SettingsSection>
      <LogFileSection id="launcher" title={t("debug.tabs.launcher")} loader={listLauncherLogs} />
      <LogFileSection id="minecraft" title={t("debug.tabs.minecraft")} loader={listAllMcLogs} />
      <LogFileSection id="process" title={t("debug.tabs.process")} loader={listProcessLogs} />
      <LogFileSection id="crashes" title={t("debug.tabs.crashes")} crash loader={listCrashReports} />

      <SettingsSection id="settings-section-permissions" title={t("debug.permissions.tab")}>
        <PermissionsList
          permissions={permissions}
          refreshing={refreshingPerms}
          onRefresh={handleRefreshPermissions}
        />
      </SettingsSection>

      <SettingsSection id="settings-section-testing" title={t("debug.tabs.testing")}>
        <TestingPanel />
      </SettingsSection>
    </div>
  );
}

interface ModCacheCleanupStats {
  scanned: number;
  deleted: string[];
  freed_bytes: number;
  failed: string[];
  skipped_empty_keepset: boolean;
}

interface CacheClearStats {
  rows_deleted: number;
  bytes_before: number;
  bytes_after: number;
}

function TestingPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [filenames, setFilenames] = useState<string[] | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanStats, setCleanStats] = useState<ModCacheCleanupStats | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [backups, setBackups] = useState<ProfileBackupInfo[] | null>(null);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringPath, setRestoringPath] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();
  const fetchProfiles = useProfileStore((s) => s.fetchProfiles);

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const result = await listProfileBackups();
      setBackups(result);
    } catch (e) {
      logError(`Failed to list profile backups: ${e}`);
      toast.error(t("settings.backups.load_failed", { error: String(e) }));
    }
    setLoadingBackups(false);
  }

  async function handleRestore(backup: ProfileBackupInfo) {
    const date = new Date(backup.backup_time * 1000).toLocaleString();
    const ok = await confirm({
      title: t("settings.backups.restore_confirm_title"),
      message: t("settings.backups.restore_confirm_message", {
        date,
        count: backup.profile_count,
      }),
      confirmText: t("settings.backups.restore"),
      cancelText: t("common.cancel"),
      type: "warning",
      fullscreen: true,
    });
    if (!ok) return;
    setRestoringPath(backup.path);
    try {
      await restoreProfileBackup(backup.path);
      await fetchProfiles();
      await loadBackups();
      toast.success(t("settings.backups.restored", { count: backup.profile_count, date }));
    } catch (e) {
      logError(`Failed to restore profile backup: ${e}`);
      toast.error(t("settings.backups.restore_failed", { error: String(e) }));
    }
    setRestoringPath(null);
  }

  async function runExpectedCacheFilenames() {
    setLoading(true);
    try {
      const result = await invoke<string[]>("debug_list_expected_cache_filenames");
      setFilenames(result);
      toast.success(t("debug.testing.keepset_result", { count: result.length }));
    } catch (e) {
      logError(`Failed to list expected cache filenames: ${e}`);
      toast.error(t("debug.testing.failed", { error: String(e) }));
    }
    setLoading(false);
  }

  async function runCleanModCache() {
    setCleaning(true);
    try {
      const stats = await invoke<ModCacheCleanupStats>("clean_mod_cache_command");
      setCleanStats(stats);
      if (stats.skipped_empty_keepset) {
        toast.error(t("debug.testing.clean_skipped"));
      } else {
        const mb = (stats.freed_bytes / (1024 * 1024)).toFixed(1);
        toast.success(t("debug.testing.clean_result", { count: stats.deleted.length, mb }));
      }
    } catch (e) {
      logError(`Failed to clean mod_cache: ${e}`);
      toast.error(t("debug.testing.failed", { error: String(e) }));
    }
    setCleaning(false);
  }

  async function runClearContentCache() {
    const ok = await confirm({
      title: t("debug.testing.clear_cache_confirm_title"),
      message: t("debug.testing.clear_cache_confirm_message"),
      confirmText: t("debug.testing.clear_cache"),
      cancelText: t("common.cancel"),
      type: "warning",
      fullscreen: true,
    });
    if (!ok) return;

    setClearingCache(true);
    try {
      const stats = await invoke<CacheClearStats>("clear_content_cache_command");

      useContentCacheStore.setState({
        entries: {},
        modpackVersions: {},
        modrinthTags: null,
        diskSizes: {},
      });

      const mb = ((stats.bytes_before - stats.bytes_after) / (1024 * 1024)).toFixed(1);
      toast.success(
        t("debug.testing.clear_cache_result", { count: stats.rows_deleted, mb }),
      );
    } catch (e) {
      logError(`Failed to clear the content cache: ${e}`);
      toast.error(t("debug.testing.failed", { error: String(e) }));
    }
    setClearingCache(false);
  }

  const spin = <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />;

  return (
    <div>
      <SettingRow label={t("debug.testing.keepset_title")} description={t("debug.testing.keepset_desc")}>
        <Button
          variant="secondary"
          size="sm"
          onClick={runExpectedCacheFilenames}
          disabled={loading}
          title="Run debug_list_expected_cache_filenames"
          icon={loading ? spin : <Play size={14} strokeWidth={1.75} />}
        >
          {t("debug.testing.run")}
        </Button>
      </SettingRow>

      {filenames !== null && (
        <ResultList
          head={t("debug.testing.filenames_count", { count: filenames.length })}
          empty={t("debug.testing.empty")}
          items={filenames}
        />
      )}

      <SettingRow label={t("debug.testing.clean_title")} description={t("debug.testing.clean_desc")}>
        <Button
          variant="destructive"
          size="sm"
          onClick={runCleanModCache}
          disabled={cleaning}
          title="Run clean_mod_cache_command"
          icon={cleaning ? spin : <Trash2 size={14} strokeWidth={1.75} />}
        >
          {t("debug.testing.clean")}
        </Button>
      </SettingRow>

      <SettingRow label={t("debug.testing.clear_cache_title")} description={t("debug.testing.clear_cache_desc")}>
        <Button
          variant="destructive"
          size="sm"
          onClick={runClearContentCache}
          disabled={clearingCache}
          title="Run clear_content_cache_command"
          icon={clearingCache ? spin : <Trash2 size={14} strokeWidth={1.75} />}
        >
          {t("debug.testing.clear_cache")}
        </Button>
      </SettingRow>

      {cleanStats !== null && (
        <ResultList
          head={
            <>
              {t("debug.testing.stats", {
                scanned: cleanStats.scanned,
                deleted: cleanStats.deleted.length,
                failed: cleanStats.failed.length,
                mb: (cleanStats.freed_bytes / (1024 * 1024)).toFixed(1),
              })}
              {cleanStats.skipped_empty_keepset && t("debug.testing.stats_skipped")}
            </>
          }
          empty={t("debug.testing.no_orphans")}
          items={cleanStats.deleted}
          tone="text-err/90"
        />
      )}

      <SettingRow label={t("settings.backups.title")} description={t("settings.backups.description")}>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadBackups}
          disabled={loadingBackups}
          title="Run list_profile_backups"
          icon={loadingBackups ? spin : <List size={14} strokeWidth={1.75} />}
        >
          {t("settings.backups.load")}
        </Button>
      </SettingRow>

      {backups !== null && (
        <div className={cn(LIST, "mb-3")} style={LIST_STYLE}>
          <div className="px-3 h-8 flex items-center cc-num text-[11px] text-fg-3 border-b border-line bg-s2">
            {t("settings.backups.count", { count: backups.length })}
          </div>
          {backups.length === 0 ? (
            <div className="px-3 h-10 flex items-center text-[13px] text-fg-3">
              {t("settings.backups.empty")}
            </div>
          ) : (
            <div className="divide-y divide-line max-h-96 overflow-y-auto custom-scrollbar">
              {backups.map((b) => (
                <div key={b.path} className="flex items-center gap-3 px-3 py-2 hover:bg-s2 transition-colors duration-fast">
                  <Archive size={14} strokeWidth={1.75} className="text-fg-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="cc-num text-[13px] text-fg truncate">
                      {new Date(b.backup_time * 1000).toLocaleString()}
                    </div>
                    <div className="cc-num text-[11px] text-fg-3 truncate">
                      {t("settings.backups.meta", {
                        count: b.profile_count,
                        size: (b.file_size / 1024).toFixed(1),
                      })}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleRestore(b)}
                    disabled={restoringPath !== null}
                    icon={restoringPath === b.path ? spin : <RotateCcw size={13} strokeWidth={1.75} />}
                  >
                    {t("settings.backups.restore")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

/** what a debug command returned: a count line and the names in mono */
function ResultList({
  head,
  empty,
  items,
  tone = "text-fg-2",
}: {
  head: ReactNode;
  empty: string;
  items: string[];
  tone?: string;
}) {
  return (
    <div className={cn(LIST, "mb-3")} style={LIST_STYLE}>
      <div className="px-3 h-8 flex items-center cc-num text-[11px] text-fg-3 border-b border-line bg-s2">{head}</div>
      {items.length === 0 ? (
        <div className="px-3 h-10 flex items-center text-[13px] text-fg-3">{empty}</div>
      ) : (
        <div className="divide-y divide-line max-h-96 overflow-y-auto custom-scrollbar">
          {items.map((name) => (
            <div key={name} className={cn("px-3 py-1.5 font-mono text-xs truncate hover:bg-s2", tone)}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PermissionsListProps {
  permissions: PermissionCacheState | null;
  refreshing: boolean;
  onRefresh: () => void;
}

function PermissionsList({ permissions, refreshing, onRefresh }: PermissionsListProps) {
  const { t } = useTranslation();
  const nodes = permissions?.nodes ?? [];
  const lastFetched = permissions?.last_fetched
    ? new Date(permissions.last_fetched).toLocaleString()
    : null;


  return (
    <div>
      <SettingRow
        label={t('debug.permissions.count', { n: nodes.length })}
        description={lastFetched ? t('debug.permissions.last_refreshed', { time: lastFetched }) : undefined}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          title={t('debug.permissions.refresh')}
          icon={<RefreshCw size={14} strokeWidth={1.75} className={refreshing ? "animate-spin" : ""} />}
        >
          {t('debug.permissions.refresh')}
        </Button>
      </SettingRow>

      <div className={cn(LIST, "mt-1")} style={LIST_STYLE}>
        {nodes.length === 0 ? (
          <div className="px-3 h-10 flex items-center text-[13px] text-fg-3">
            {t('debug.permissions.empty')}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {nodes.map((node) => (
              <div
                key={node}
                className="px-3 py-1.5 hover:bg-s2 flex items-center gap-2.5"
              >
                <Check size={13} strokeWidth={2} className="text-ok shrink-0" />
                <div className="text-fg-2 font-mono text-xs truncate">{node}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
