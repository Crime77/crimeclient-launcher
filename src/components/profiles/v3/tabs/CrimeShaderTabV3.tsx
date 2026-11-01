"use client";

/**
 * Photon settings of a CrimeClient Rust profile (src-tauri/src/commands/crime_shader_command.rs): the pack's own
 * screens, options and quality levels as the game wrote them, in the pack's words. The values go to the profile's
 * shaderpacks/photon_v1.4.zip.txt and load on the game's next start; nothing changes while it runs.
 */

import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

import type { Profile } from "../../../../types/profile";
import {
  getShaderPage,
  importJavaShader,
  setShaderValues,
  toggleShader,
  type ShaderItem,
  type ShaderModel,
  type ShaderPage,
} from "../../../../services/crime-shader-service";
import { parseErrorMessage } from "../../../../utils/error-utils";
import { ToggleSwitch } from "../../../ui/ToggleSwitch";
import { Select } from "../../../ui/Select";
import { RangeSlider } from "../../../ui/RangeSlider";
import { EmptyStateV3 } from "../shared/EmptyStateV3";

interface CrimeShaderTabV3Props {
  profile: Profile;
}

/** Minecraft's § colours. */
const COLORS: Record<string, string> = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA", "4": "#AA0000", "5": "#AA00AA",
  "6": "#FFAA00", "7": "#AAAAAA", "8": "#555555", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
  c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

/** The pack's text with its § colour and style codes, as the game shows it. */
function Legacy({ text }: { text: string }) {
  const pieces = text.split("§");
  let style: React.CSSProperties = {};
  const out: React.ReactNode[] = [pieces[0]];
  pieces.slice(1).forEach((piece, i) => {
    const code = piece.charAt(0).toLowerCase();
    if (COLORS[code]) style = { color: COLORS[code] };
    else if (code === "l") style = { ...style, fontWeight: 700 };
    else if (code === "o") style = { ...style, fontStyle: "italic" };
    else if (code === "n") style = { ...style, textDecoration: "underline" };
    else if (code === "m") style = { ...style, textDecoration: "line-through" };
    else if (code === "r") style = {};
    const rest = piece.slice(1);
    if (rest) out.push(<span key={i} style={style}>{rest}</span>);
  });
  return <>{out}</>;
}

const plain = (text: string) => text.replace(/§./g, "");

export function CrimeShaderTabV3({ profile }: CrimeShaderTabV3Props) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState<ShaderPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPage(await getShaderPage(profile.id));
      setError(null);
    } catch (err) {
      setError(parseErrorMessage(err));
    }
  }, [profile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // while the game runs, look again now and then: the page unlocks once it has quit
  useEffect(() => {
    if (!page?.running) return;
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [page?.running, load]);

  const run = async (action: () => Promise<ShaderPage>, done?: string) => {
    setBusy(true);
    try {
      setPage(await action());
      if (done) toast.success(done);
    } catch (err) {
      toast.error(t("crimeShader.saveFailed", { error: parseErrorMessage(err) }));
      void load();
    } finally {
      setBusy(false);
    }
  };

  if (!page) {
    return error ? (
      <EmptyStateV3 icon="solar:sun-2-bold-duotone" title={t("crimeShader.loadFailed")} hint={error} />
    ) : null;
  }

  const model = page.model;
  const german = i18n.language?.startsWith("de");
  const text = (key: string) => (german ? model?.text.de?.[key] : undefined) ?? model?.text.en[key];
  const value = (name: string) => page.chosen[name] ?? model?.options[name]?.default ?? "";
  const locked = page.running || busy;

  const save = (chosen: Record<string, string>) => {
    setPage({ ...page, chosen });
    void run(() => setShaderValues(profile.id, chosen));
  };

  /** `chosen` with option `name` at `v`; a default is not kept. */
  const withValue = (chosen: Record<string, string>, name: string, v: string) => {
    const option = model?.options[name];
    if (!option || !option.values.includes(v)) return chosen;
    const out = { ...chosen };
    if (v === option.default) delete out[name];
    else out[name] = v;
    return out;
  };

  const profiles = model?.profiles ?? [];
  const currentProfile =
    profiles.find((p) => Object.entries(p.values).every(([n, v]) => value(n) === v))?.name ?? null;
  const pickProfile = (name: string) => {
    const values = profiles.find((p) => p.name === name)?.values ?? {};
    save(Object.entries(values).reduce((c, [n, v]) => withValue(c, n, v), page.chosen));
  };

  const qualitySelect =
    profiles.length > 0 ? (
      <Select
        size="sm"
        value={currentProfile ?? ""}
        placeholder={t("crimeShader.custom")}
        disabled={locked}
        onChange={pickProfile}
        options={profiles.map((p) => ({ value: p.name, label: plain(text(`profile.${p.name}`) ?? p.name) }))}
      />
    ) : null;

  const screen = path[path.length - 1] ?? "";
  const shown = model?.screens[screen];
  const columns = Math.min(Math.max(shown?.columns ?? 2, 1), 3);

  return (
    <div className="flex flex-col min-h-0 flex-1 relative">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-white/5 flex-shrink-0 bg-black/20 sticky top-0 z-10">
        <ToggleSwitch
          checked={page.on}
          disabled={locked || !model}
          onChange={(on) => void run(() => toggleShader(profile.id, on))}
          label={t("crimeShader.enabled")}
          size="sm"
        />
        {model && qualitySelect && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-minecraft uppercase tracking-wide text-white/50">{t("crimeShader.quality")}</span>
            <div className="w-40">{qualitySelect}</div>
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={() => void run(() => importJavaShader(profile.id), t("crimeShader.imported"))}
          disabled={locked || !model || !page.java}
          title={t(page.java ? "crimeShader.importJavaHint" : "crimeShader.importJavaNone")}
          className="h-8 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-minecraft text-white/70 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Icon icon="solar:import-bold" className="w-4 h-4" /> {t("crimeShader.importJava")}
        </button>
        <button
          onClick={() => save({})}
          disabled={locked || !model || Object.keys(page.chosen).length === 0}
          className="h-8 px-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-minecraft text-white/70 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Icon icon="solar:restart-bold" className="w-4 h-4" /> {t("crimeShader.reset")}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        {page.running && (
          <div className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 flex-shrink-0" />
            {t("crimeShader.running")}
          </div>
        )}

        {!model ? (
          <EmptyStateV3 icon="solar:sun-2-bold-duotone" title={t("crimeShader.noModel")} hint={t("crimeShader.noModelHint")} />
        ) : (
          <>
            <p className="text-xs text-white/45">{t("crimeShader.credit")}</p>

            {path.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPath(path.slice(0, -1))}
                  className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 flex items-center gap-1"
                >
                  <Icon icon="solar:alt-arrow-left-linear" className="w-4 h-4" /> {t("crimeShader.back")}
                </button>
                <button onClick={() => setPath([])} className="text-white/50 hover:text-white">
                  Photon
                </button>
                {path.map((s, i) => (
                  <span key={s} className="flex items-center gap-2 text-white/50">
                    <Icon icon="solar:alt-arrow-right-linear" className="w-3.5 h-3.5" />
                    <button onClick={() => setPath(path.slice(0, i + 1))} className="hover:text-white">
                      <Legacy text={text(`screen.${s}`) ?? s} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {(shown?.items ?? []).map((item, i) => (
                <Item
                  key={`${screen}-${i}`}
                  item={item}
                  model={model}
                  text={text}
                  value={value}
                  changed={(name) => name in page.chosen}
                  locked={locked}
                  qualitySelect={qualitySelect}
                  onValue={(name, v) => save(withValue(page.chosen, name, v))}
                  onReset={(name) => {
                    const chosen = { ...page.chosen };
                    delete chosen[name];
                    save(chosen);
                  }}
                  onOpen={(s) => setPath([...path, s])}
                />
              ))}
            </div>
            <p className="text-xs text-white/40">{t("crimeShader.nextStart")}</p>
          </>
        )}
      </div>
    </div>
  );
}

interface ItemProps {
  item: ShaderItem;
  model: ShaderModel;
  text: (key: string) => string | undefined;
  value: (name: string) => string;
  changed: (name: string) => boolean;
  locked: boolean;
  qualitySelect: React.ReactNode;
  onValue: (name: string, value: string) => void;
  onReset: (name: string) => void;
  onOpen: (screen: string) => void;
}

const ROW = "min-h-[44px] rounded-md bg-white/5 border border-white/10 px-3 py-1.5 flex items-center gap-3";

/** One place on a screen: an option with its control, a button to another screen, the quality levels or a gap. */
function Item({ item, model, text, value, changed, locked, qualitySelect, onValue, onReset, onOpen }: ItemProps) {
  const { t } = useTranslation();
  if (item.kind === "empty") return <div />;
  if (item.kind === "profile") {
    return (
      <div className={ROW} title={plain(text("profile.comment") ?? "")}>
        <span className="flex-1 min-w-0 truncate text-sm text-white/85">{t("crimeShader.quality")}</span>
        <div className="w-40">{qualitySelect}</div>
      </div>
    );
  }
  if (item.kind === "screen") {
    return (
      <button
        onClick={() => onOpen(item.name)}
        title={plain(text(`screen.${item.name}.comment`) ?? "")}
        className={`${ROW} text-left hover:bg-white/10 transition-colors`}
      >
        <span className="flex-1 min-w-0 truncate text-sm text-white/85">
          <Legacy text={text(`screen.${item.name}`) ?? item.name} />
        </span>
        <Icon icon="solar:alt-arrow-right-linear" className="w-4 h-4 text-white/50" />
      </button>
    );
  }
  const option = model.options[item.name];
  if (!option) return <div />;
  return (
    <OptionRow
      name={item.name}
      option={option}
      text={text}
      value={value(item.name)}
      changed={changed(item.name)}
      locked={locked}
      onValue={(v) => onValue(item.name, v)}
      onReset={() => onReset(item.name)}
    />
  );
}

interface OptionRowProps {
  name: string;
  option: ShaderModel["options"][string];
  text: (key: string) => string | undefined;
  value: string;
  changed: boolean;
  locked: boolean;
  onValue: (value: string) => void;
  onReset: () => void;
}

function OptionRow({ name, option, text, value, changed, locked, onValue, onReset }: OptionRowProps) {
  const { t } = useTranslation();
  const at = Math.max(0, option.values.indexOf(value));
  const [draft, setDraft] = useState(at);
  useEffect(() => setDraft(at), [at]);

  const valueText = (v: string) =>
    option.switch
      ? t(v === "true" ? "crimeShader.on" : "crimeShader.off")
      : `${text(`prefix.${name}`) ?? ""}${text(`value.${name}.${v}`) ?? v}${text(`suffix.${name}`) ?? ""}`;
  const comment = text(`option.${name}.comment`);

  let control: React.ReactNode;
  if (option.switch) {
    control = <ToggleSwitch checked={value === "true"} disabled={locked} onChange={(on) => onValue(on ? "true" : "false")} size="sm" />;
  } else if (option.slider && option.values.length > 1) {
    control = (
      <div className="flex items-center gap-2">
        <span className="w-16 text-right text-xs font-minecraft text-white/80 truncate">
          <Legacy text={valueText(option.values[draft] ?? value)} />
        </span>
        <div className="w-32 pt-2">
          <RangeSlider
            size="sm"
            min={0}
            max={option.values.length - 1}
            step={1}
            value={draft}
            disabled={locked}
            showValue={false}
            onChange={setDraft}
            onChangeEnd={(i) => onValue(option.values[Math.round(i)] ?? value)}
          />
        </div>
      </div>
    );
  } else {
    control = (
      <div className="w-40">
        <Select
          size="sm"
          value={value}
          disabled={locked}
          onChange={onValue}
          options={option.values.map((v) => ({ value: v, label: plain(valueText(v)) }))}
        />
      </div>
    );
  }

  return (
    <div className={ROW} title={comment ? plain(comment) : undefined}>
      <span className={`flex-1 min-w-0 truncate text-sm ${changed ? "text-yellow-200" : "text-white/85"}`}>
        <Legacy text={text(`option.${name}`) ?? name} />
      </span>
      {changed && (
        <button
          onClick={onReset}
          disabled={locked}
          title={t("crimeShader.resetOption")}
          className="text-white/40 hover:text-white disabled:opacity-40"
        >
          <Icon icon="solar:restart-linear" className="w-3.5 h-3.5" />
        </button>
      )}
      {control}
    </div>
  );
}
