"use client";

import type React from "react";
import { Icon } from "@iconify/react";
import { Gauge, Layers, Loader2, Minus, Puzzle, Shirt, Square, X, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useWelcomeStore } from "../../store/welcome-store";
import { useAddMinecraftAccount } from "../../hooks/useAddMinecraftAccount";
import { GridBackground } from "../effects/GridBackground";
import { Button } from "../ui/buttons/Button";

/** What the launcher does, in the footer strip. */
const HIGHLIGHTS: { icon: LucideIcon; key: string }[] = [
  { icon: Puzzle, key: "mods" },
  { icon: Shirt, key: "capes" },
  { icon: Gauge, key: "fps" },
  { icon: Layers, key: "versions" },
];

/**
 * Full-screen greeting for a launcher start with no account linked.
 *
 * Sits above the whole app rather than replacing the routed tree, so the
 * launcher boots normally behind it and dismissing costs nothing. It covers
 * the custom titlebar, so it carries its own drag region and window controls —
 * otherwise the window could not be moved or closed from here.
 *
 * Calm and flat: the raven, the wordmark, one accent button. The faint grid is
 * the only texture.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const isLoading = useMinecraftAuthStore((s) => s.isLoading);
  const skip = useWelcomeStore((s) => s.skip);
  const { startLogin } = useAddMinecraftAccount();

  // Staggered entrance over a base style that is already visible: if the
  // animation never runs (reduced motion, a throttled compositor) the element
  // is simply there. This is the one screen that must never stay blank.
  const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms` }) as React.CSSProperties;

  const handleWindow = async (action: "minimize" | "toggleMaximize" | "close") => {
    const mod = await import("@tauri-apps/api/window").catch(() => null);
    if (!mod) return;
    const win = mod.getCurrentWindow();
    if (action === "minimize") await win.minimize();
    else if (action === "toggleMaximize") await win.toggleMaximize();
    else await win.close();
  };

  return (
    <div className="fixed inset-0 z-[900] flex flex-col bg-bg text-fg select-none">
      <GridBackground />

      {/* titlebar strip: drag region and window controls */}
      <div data-tauri-drag-region className="relative z-10 h-10 flex-shrink-0 flex items-center justify-end">
        {([
          ["minimize", Minus, "window.minimize", 16],
          ["toggleMaximize", Square, "window.maximize", 13],
          ["close", X, "window.close", 17],
        ] as const).map(([action, Glyph, labelKey, size]) => (
          <button
            key={action}
            type="button"
            onClick={() => handleWindow(action)}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            className={`cc-window-btn h-10 ${action === "close" ? "is-close" : ""}`}
          >
            <Glyph size={size} strokeWidth={1.75} />
          </button>
        ))}
      </div>

      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="w-full max-w-[340px] flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt=""
            className="cc-enter w-14 h-14 object-contain"
            style={rise(40)}
            draggable={false}
          />

          <h1
            className="cc-enter mt-5 font-display text-[38px] leading-none font-[720] tracking-[-0.02em] text-fg"
            style={{ ...rise(90), fontStretch: "122%" }}
          >
            CrimeClient
          </h1>
          <p className="cc-enter mt-3 text-[15px] text-fg-2" style={rise(140)}>
            {t("welcome.hero.line1")} {t("welcome.hero.line2")}
          </p>

          <div className="cc-enter w-full mt-9 flex flex-col gap-1.5" style={rise(200)}>
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={startLogin}
              disabled={isLoading}
              icon={
                isLoading ? (
                  <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
                ) : (
                  <Icon icon="simple-icons:microsoft" className="w-4 h-4" />
                )
              }
            >
              {isLoading ? t("welcome.panel.cta_loading") : t("welcome.panel.cta")}
            </Button>
            <Button variant="ghost" size="md" className="w-full text-fg-3" onClick={skip}>
              {t("welcome.panel.skip")}
            </Button>
          </div>

          <p className="cc-enter mt-6 text-xs text-fg-3 leading-relaxed max-w-[300px]" style={rise(260)}>
            {t("welcome.panel.subtitle")}
          </p>
          <p className="cc-enter mt-2 text-[11px] text-fg-4 leading-relaxed max-w-[300px]" style={rise(300)}>
            {t("welcome.panel.footnote")}
          </p>
        </div>
      </main>

      {/* what the launcher does, as a quiet status strip */}
      <footer className="relative z-10 h-11 flex-shrink-0 border-t border-line bg-bg/80 flex items-center justify-center gap-x-8 px-6 overflow-hidden">
        {HIGHLIGHTS.map((h) => {
          const Glyph = h.icon;
          return (
            <span key={h.key} className="flex items-center gap-2 text-xs text-fg-3 whitespace-nowrap">
              <Glyph size={14} strokeWidth={1.75} className="text-fg-4" />
              {t(`welcome.highlight.${h.key}`)}
            </span>
          );
        })}
      </footer>
    </div>
  );
}
