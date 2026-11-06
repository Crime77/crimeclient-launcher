"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Server, Square } from "lucide-react";
import { useServerPingStore } from "../../store/server-ping-store";
import { parseMotdToHtml } from "../../utils/motd-utils";
import { useProfileLaunch } from "../../hooks/useProfileLaunch";
import { LaunchState } from "../../store/launch-state-store";
import { cn } from "../../lib/utils";
import type { ServerPingInfo } from "../../types/minecraft";
import type { LaunchOverrides } from "../../services/process-service";

/** The server on the home page, served by the CrimeClient update API so it can move without a launcher update. */
const SERVERS_URL = "https://crime77.duckdns.org/mod/api/launcher/servers.json";
const PING_INTERVAL_MS = 60_000;

export interface HomeServer {
  name: string;
  address: string;
}

export const DEFAULT_HOME_SERVER: HomeServer = { name: "CraftAttack", address: "crime77.duckdns.org" };

/** First entry of servers.json ({"servers": [{"name", "address"}]}); the CraftAttack server until it answers. */
export function useHomeServer(): HomeServer {
  const [server, setServer] = useState<HomeServer>(DEFAULT_HOME_SERVER);
  useEffect(() => {
    let cancelled = false;
    fetch(SERVERS_URL, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { servers?: Partial<HomeServer>[] }) => {
        const first = data.servers?.find((s) => typeof s.address === "string" && s.address.trim());
        if (!cancelled && first) {
          setServer({ name: first.name?.trim() || first.address!.trim(), address: first.address!.trim() });
        }
      })
      .catch((err) => console.warn("[ServerLaunchCard] servers.json not reachable, using the default:", err));
    return () => {
      cancelled = true;
    };
  }, []);
  return server;
}

interface ServerLaunchCardProps {
  serverAddress: string;
  serverName: string;
  profileId: string | null;
  onMods?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** Runtime launch overrides (version/loader/pack), not persisted. */
  launchOverrides?: LaunchOverrides;
}

/** Server status in one line (online, players, ping, MOTD; pinged every 60 s) with a button that joins it directly. */
export function ServerLaunchCard({
  serverAddress,
  serverName,
  profileId,
  onMods,
  className,
  style,
  launchOverrides,
}: ServerLaunchCardProps) {
  const { t } = useTranslation();
  const [serverInfo, setServerInfo] = useState<ServerPingInfo | null>(null);
  const getPing = useServerPingStore((state) => state.getPing);
  const subscribe = useServerPingStore((state) => state.subscribe);
  const triggerBackgroundPing = useServerPingStore((state) => state.triggerBackgroundPing);

  const { isLaunching, statusMessage, launchState, handleQuickPlayLaunch } = useProfileLaunch({
    profileId: profileId || "",
    quickPlayMultiplayer: serverAddress,
    onLaunchError: (error) => {
      console.error(`[ServerLaunchCard] Launch error:`, error);
    },
  });

  useEffect(() => {
    setServerInfo(getPing(serverAddress));
    const unsubscribe = subscribe(serverAddress, setServerInfo);
    const interval = setInterval(() => triggerBackgroundPing(serverAddress), PING_INTERVAL_MS);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [serverAddress, getPing, subscribe, triggerBackgroundPing]);

  const offline = !!serverInfo?.error;
  const online = !!serverInfo && !offline;
  const motdHtml = !online
    ? null
    : serverInfo.description_json
      ? parseMotdToHtml(serverInfo.description_json)
      : serverInfo.description
        ? parseMotdToHtml(serverInfo.description)
        : null;
  const isDisabled = !profileId;
  const failed = launchState === LaunchState.ERROR && !!statusMessage;

  return (
    <section className={cn("flex items-center gap-4 min-w-0", className)} style={style}>
      <div className="w-7 h-7 flex-shrink-0 grid place-items-center overflow-hidden bg-s3 border border-line" style={{ borderRadius: "var(--r-sm)" }}>
        {online && serverInfo.favicon_base64 ? (
          <img
            src={`data:image/png;base64,${serverInfo.favicon_base64}`}
            alt={serverName}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <Server size={14} strokeWidth={1.75} className="text-fg-3" />
        )}
      </div>

      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="text-[13px] font-[620] text-fg leading-none whitespace-nowrap">{serverName}</h2>
        <span className="cc-num text-[11.5px] text-fg-3 truncate">{serverAddress}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            online ? "bg-ok" : offline ? "bg-err" : "bg-fg-3 animate-pulse",
          )}
        />
        <span className={cn("text-xs", online ? "text-fg-2" : offline ? "text-err" : "text-fg-3")}>
          {online ? t("server.online") : offline ? t("server.offline") : t("server.pinging")}
        </span>
      </div>

      {online && (
        <div className="flex items-center gap-4 flex-shrink-0 text-xs text-fg-3">
          <span>
            <span className="cc-num text-fg-2">
              {serverInfo.players_online ?? "?"}/{serverInfo.players_max ?? "?"}
            </span>{" "}
            {t("server.players")}
          </span>
          {serverInfo.latency_ms !== null && (
            <span>
              <span className="cc-num text-fg-2">{serverInfo.latency_ms}</span> ms
            </span>
          )}
        </div>
      )}

      <div
        className="flex-1 min-w-0 text-xs leading-none font-minecraft truncate text-fg-3 hidden xl:block"
        title={serverInfo?.description || serverAddress}
      >
        {isLaunching && statusMessage ? (
          <span className="text-fg-2">{statusMessage}</span>
        ) : failed ? (
          <span className="text-err">{statusMessage}</span>
        ) : motdHtml ? (
          <span className="opacity-80" dangerouslySetInnerHTML={{ __html: motdHtml.replace(/<br\s*\/?>/gi, " ") }} />
        ) : null}
      </div>
      <div className="flex-1 xl:hidden" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onMods && (
          <button
            type="button"
            onClick={onMods}
            disabled={isDisabled || isLaunching}
            className="h-8 px-3 text-[13px] font-[540] text-fg-2 hover:text-fg bg-transparent hover:bg-s3 border border-line-2 transition-colors duration-fast disabled:opacity-45 disabled:cursor-not-allowed"
            style={{ borderRadius: "var(--r-md)" }}
          >
            {t("server.mods")}
          </button>
        )}
        <button
          type="button"
          onClick={() => !isDisabled && handleQuickPlayLaunch(undefined, serverAddress, launchOverrides)}
          disabled={isDisabled}
          className="h-8 pl-2.5 pr-3 flex items-center gap-2 text-[13px] font-[560] text-fg bg-s3 hover:bg-s4 border border-line-2 transition-colors duration-fast active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ borderRadius: "var(--r-md)" }}
        >
          {isLaunching ? <Square size={12} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          {isLaunching ? t("server.stop") : t("server.join")}
        </button>
      </div>
    </section>
  );
}
