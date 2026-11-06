"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { AlertTriangle, Loader2, RefreshCw, Star } from "lucide-react";

import { Button } from "../ui/buttons/Button";
import { GroupTabs } from "../ui/GroupTabs";
import { listOpenApps, listScreens, type OpenApp, type ScreenInfo } from "../../services/clip-service";
import type { OtherGame, OtherScreen } from "../../types/launcherConfig";
import { cn } from "../../lib/utils";
import { isMacOS } from "../../utils/platform";

interface Props {
  value: OtherGame | null;
  onChange: (game: OtherGame | null) => void;
  disabled: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  icon?: string;
  noneDescription?: string;
  screen?: OtherScreen | null;
  onScreen?: (screen: OtherScreen) => void;
}

export function GamePicker({
  value,
  onChange,
  disabled,
  t,
  icon = "solar:gamepad-bold",
  noneDescription,
  screen = null,
  onScreen,
}: Props) {
  const [apps, setApps] = useState<OpenApp[] | null>(null);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const offerScreens = Boolean(onScreen) && !isMacOS();
  const [view, setView] = useState<"apps" | "screens">(screen ? "screens" : "apps");
  const showing = offerScreens ? view : "apps";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [open, shown] = await Promise.all([
        listOpenApps(),
        offerScreens ? listScreens() : Promise.resolve([]),
      ]);
      setApps(open);
      setScreens(shown);
    } catch (e) {
      console.error("Could not list the open programs", e);
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [offerScreens]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows: OpenApp[] = apps ? [...apps] : [];
  const chosenIsOpen =
    value && rows.some((app) => app.executable === value.executable);
  if (value && !chosenIsOpen) {
    rows.unshift({ pid: 0, executable: value.executable, name: value.name });
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-md border border-line bg-s1 p-2", disabled && "opacity-50")}>
      <div className="flex items-center gap-2">
        {offerScreens ? (
          <GroupTabs
            groups={[
              {
                id: "apps",
                icon: "solar:widget-bold",
                name: t("settings.clips.games.apps"),
                count: apps?.length ?? 0,
              },
              {
                id: "screens",
                icon: "solar:monitor-bold",
                name: t("settings.clips.games.screens"),
                count: screens.length,
              },
            ]}
            activeGroup={showing}
            onGroupChange={(id) => setView(id === "screens" ? "screens" : "apps")}
            showAddButton={false}
            className="!mb-0 flex-1"
          />
        ) : (
          <p className="flex-1 px-1 text-xs text-fg-3">{t("settings.clips.games.open")}</p>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void refresh()}
          disabled={disabled || loading}
          icon={
            loading ? (
              <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
            ) : (
              <RefreshCw size={14} strokeWidth={1.75} />
            )
          }
        >
          {t("settings.clips.games.refresh")}
        </Button>
      </div>

      <div className="flex max-h-64 flex-col gap-px overflow-y-auto custom-scrollbar">
        <Row
          icon="solar:close-circle-bold"
          name={t("settings.clips.games.none")}
          detail={noneDescription ?? t("settings.clips.games.none.description")}
          selected={value === null && screen === null}
          disabled={disabled}
          onSelect={() => onChange(null)}
        />

        {showing === "apps" && rows.map((app) => (
          <Row
            key={app.executable}
            icon={icon}
            name={app.name}
            detail={
              app.pid === 0
                ? t("settings.clips.games.closed", { executable: app.executable })
                : app.executable
            }
            selected={value?.executable === app.executable}
            disabled={disabled}
            onSelect={() =>
              onChange({ executable: app.executable, name: app.name })
            }
          />
        ))}

        {showing === "apps" && apps !== null && apps.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-fg-4">
            {t("settings.clips.games.empty")}
          </p>
        )}

        {showing === "screens" && (
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            {screens.map((shown, index) => {
              const name = t("settings.clips.games.screen", { number: index + 1 });
              const selected = screen?.device === shown.device;
              return (
                <button
                  key={shown.device}
                  type="button"
                  onClick={() => onScreen?.({ device: shown.device, name })}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border px-3 pb-2.5 pt-3 transition-colors duration-fast",
                    selected
                      ? "border-line-3 bg-s3"
                      : "border-line bg-s2 hover:border-line-2 hover:bg-s3",
                    disabled && "cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex w-full max-w-[9rem] items-center justify-center rounded-sm border bg-bg",
                      selected ? "border-fg/80" : "border-line-3",
                    )}
                    style={{
                      aspectRatio: `${Math.max(shown.width, 1)} / ${Math.max(shown.height, 1)}`,
                    }}
                  >
                    <span className="font-mono text-lg text-fg-2">{index + 1}</span>
                    {shown.primary && (
                      <Star
                        size={11}
                        strokeWidth={1.75}
                        className="absolute right-1 top-1 fill-current text-fg-3"
                      />
                    )}
                  </span>
                  <span className="h-1 w-8 rounded-b-sm bg-line-3" />
                  <span className="text-[13px] text-fg">{name}</span>
                  <span className="font-mono text-[11px] text-fg-3">
                    {shown.width} × {shown.height}
                    {shown.primary ? ` · ${t("settings.clips.games.screen.primary")}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {offerScreens && screen && (
        <p className="flex items-start gap-2 rounded-md border border-warn/25 bg-warn/10 px-3 py-2 text-xs leading-relaxed text-fg-2">
          <AlertTriangle size={14} strokeWidth={1.75} className="mt-px shrink-0 text-warn" />
          {t("settings.clips.games.screen.hint")}
        </p>
      )}
    </div>
  );
}

function Row({
  icon,
  name,
  detail,
  selected,
  disabled,
  onSelect,
}: {
  icon: string;
  name: string;
  detail: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex h-11 shrink-0 items-center gap-3 rounded-sm px-2.5 text-left transition-colors duration-fast",
        selected ? "bg-s3" : "hover:bg-s2",
        disabled && "cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-fast",
          selected ? "border-fg bg-fg" : "border-line-3",
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-bg" />}
      </span>

      <Icon
        icon={icon}
        className={cn("h-4 w-4 shrink-0", selected ? "text-fg-2" : "text-fg-4")}
      />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-[13px] leading-[18px]", selected ? "text-fg" : "text-fg-2")}>{name}</span>
        <span className="truncate font-mono text-[11px] leading-4 text-fg-4">{detail}</span>
      </span>
    </button>
  );
}
