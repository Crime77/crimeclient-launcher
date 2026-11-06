// Dev mock for the settings dialog (debug lists, permissions, hooks) so every row can be looked at in the browser.
// Only answers commands the settings area needs; everything else returns undefined.

const now = Math.floor(Date.now() / 1000);
const dir = "C:\\Users\\crime77\\AppData\\Roaming\\crimeclient";

function file(path: string, size: number, ageMin: number) {
  return { path: `${dir}\\${path}`, name: path.split("\\").pop() ?? path, size, modified: now - ageMin * 60 };
}

const launcherLogs = [
  file("logs\\launcher.log", 184_320, 2),
  file("logs\\launcher.2026-11-04.log", 2_418_009, 60 * 22),
  file("logs\\launcher.2026-11-03.log", 965_112, 60 * 46),
];

const mcLogs = [
  file("profiles\\crimeclient\\logs\\latest.log", 412_900, 5),
  file("profiles\\crimeclient\\logs\\2026-11-04-2.log.gz", 88_201, 60 * 20),
  file("profiles\\vanilla-26.3\\logs\\latest.log", 51_330, 60 * 70),
];

const processLogs = [file("process-logs\\crimeclient-18244.log", 12_004, 7)];

const crashReports = [
  file("profiles\\crimeclient\\crash-reports\\crash-2026-11-05_18.41.07-client.txt", 31_877, 95),
];

export function handle(cmd: string, _args: Record<string, unknown>): unknown {
  switch (cmd) {
    case "list_launcher_logs":
      return launcherLogs;
    case "list_all_mc_logs":
      return mcLogs;
    case "list_process_logs":
      return processLogs;
    case "list_crash_reports":
      return crashReports;
    case "get_cached_permissions":
      return {
        nodes: ["crimeclient.cosmetics.dev", "crimeclient.store.gift", "crimeclient.debug"],
        last_fetched: new Date(Date.now() - 12 * 60_000).toISOString(),
        last_account_id: "a1b2c3d4",
      };
    case "debug_list_expected_cache_filenames":
      return ["sodium-fabric-0.8.2+mc26.3.jar", "fabric-api-0.141.0+26.3.jar", "crimeclient-2.4.1.jar"];
    default:
      return undefined;
  }
}
