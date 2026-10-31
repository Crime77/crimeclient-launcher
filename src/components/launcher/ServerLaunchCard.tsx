"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
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

function pingBars(latency: number | null) {
  if (latency === null) return "unknown";
  return latency < 80 ? "5" : latency < 100 ? "4" : latency < 150 ? "3" : latency < 300 ? "2" : "1";
}

/** Server status (online, players, MOTD, ping; pinged every 60 s) with a button that starts the game straight onto it. */
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

  let footer: React.ReactNode = null;
  if (isLaunching && statusMessage) {
    footer = <span className="text-xs text-white/70 truncate">{statusMessage}</span>;
  } else if (launchState === LaunchState.ERROR && statusMessage) {
    footer = <span className="text-xs text-red-300 truncate">{statusMessage}</span>;
  } else if (online) {
    footer = (
      <>
        <span className="flex items-center gap-1.5 text-xs text-white/60">
          <Icon icon="solar:users-group-rounded-bold" className="w-3.5 h-3.5" />
          {serverInfo.players_online ?? "?"}/{serverInfo.players_max ?? "?"} {t("server.players")}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/60">
          <img
            src={`/minecraft/ping_${pingBars(serverInfo.latency_ms)}.png`}
            alt=""
            className="h-3"
            style={{ imageRendering: "pixelated" }}
          />
          {serverInfo.latency_ms !== null && `${serverInfo.latency_ms} ms`}
        </span>
      </>
    );
  }

  return (
    <section className={cn("flex flex-col gap-3 p-5", className)} style={style}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 flex-shrink-0 grid place-items-center overflow-hidden bg-white/[0.06]" style={{ borderRadius: 12 }}>
          {online && serverInfo.favicon_base64 ? (
            <img
              src={`data:image/png;base64,${serverInfo.favicon_base64}`}
              alt={serverName}
              className="w-full h-full object-cover"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <Icon icon="solar:server-square-bold" className="w-6 h-6 text-white/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg font-bold text-white leading-tight truncate">{serverName}</h2>
          <p className="text-xs text-white/40 truncate">{serverAddress}</p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full",
            online ? "bg-emerald-400/15 text-emerald-300" : offline ? "bg-red-400/15 text-red-300" : "bg-white/[0.06] text-white/50",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              online ? "bg-emerald-400" : offline ? "bg-red-400" : "bg-white/40 animate-pulse",
            )}
          />
          {online ? t("server.online") : offline ? t("server.offline") : t("server.pinging")}
        </span>
      </div>

      <div
        className="min-h-[34px] text-xs leading-snug font-minecraft whitespace-pre-wrap break-words overflow-hidden line-clamp-2 px-3 py-2 rounded-xl bg-black/25"
        title={serverInfo?.description || serverAddress}
      >
        {motdHtml ? (
          <span dangerouslySetInnerHTML={{ __html: motdHtml }} />
        ) : (
          <span className="italic text-white/45">{offline ? t("server.offline_hint") : t("server.pinging")}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">{footer}</div>
        {onMods && (
          <button
            onClick={onMods}
            disabled={isDisabled || isLaunching}
            className="h-9 px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="solar:box-bold" className="w-4 h-4" />
            {t("server.mods")}
          </button>
        )}
        <button
          onClick={() => !isDisabled && handleQuickPlayLaunch(undefined, serverAddress, launchOverrides)}
          disabled={isDisabled}
          className="h-9 px-4 flex items-center gap-2 rounded-xl text-sm font-bold text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isLaunching
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          }}
        >
          <Icon icon={isLaunching ? "solar:stop-bold" : "solar:play-bold"} className="w-4 h-4" />
          {isLaunching ? t("server.stop") : t("server.join")}
        </button>
      </div>
    </section>
  );
}
