"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useWindowFocus } from "../../hooks/useWindowFocus";

/**
 * CrimeClient's title screen background ("Glut"): a dark gradient, a huge faint raven on the right,
 * a glow rising from below and embers drifting up, all in the accent colour.
 * Mirrors CrimeTitleScreen in the client mod (one GUI pixel there is about SCALE pixels here).
 */
const RAVEN_SRC = "crime/title_raven.png";
const EMBERS = 80;
const SCALE = 2.5;

function hash(n: number): number {
  n = ((n << 13) ^ n) | 0;
  const v = (Math.imul(n, (Math.imul(Math.imul(n, n), 15731) + 789221) | 0) + 1376312589) & 0x7fffffff;
  return v / 0x7fffffff;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [232, 49, 74];
}

/** The grey raven multiplied by the accent colour, keeping its facet shading like the client's tinted blit. */
function tintRaven(img: HTMLImageElement, accent: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = accent;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(img, 0, 0);
  return c;
}

export function GlutEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accent = useThemeStore((state) => state.accentColor.value);
  const isBackgroundAnimationEnabled = useThemeStore((state) => state.isBackgroundAnimationEnabled);
  const isWindowFocused = useWindowFocus();
  const animate = isBackgroundAnimationEnabled && isWindowFocused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const [r, gr, b] = hexToRgb(accent);
    const rgba = (a: number) => `rgba(${r}, ${gr}, ${b}, ${a})`;
    let raven: HTMLCanvasElement | null = null;
    let frame = 0;
    let stopped = false;
    const start = performance.now();

    const draw = (seconds: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#07070a");
      bg.addColorStop(1, "#120a0e");
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);

      if (raven) {
        const rh = (h * 5) / 4;
        const rw = (rh * raven.width) / raven.height;
        g.globalAlpha = 0.16;
        g.drawImage(raven, w - (rw * 2) / 3, (h - rh) / 2 - h / 12, rw, rh);
        g.globalAlpha = 1;
      }

      // glow rising from below
      g.save();
      g.translate(w / 2, h);
      g.scale((w * 3) / 4, (h * 4) / 5);
      const glow = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, rgba(0.38));
      glow.addColorStop(0.45, rgba(0.14));
      glow.addColorStop(1, rgba(0));
      g.fillStyle = glow;
      g.fillRect(-1, -1, 2, 1);
      g.restore();

      const top = g.createLinearGradient(0, 0, 0, h / 3);
      top.addColorStop(0, "rgba(0, 0, 0, 0.38)");
      top.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = top;
      g.fillRect(0, 0, w, h / 3);

      for (let i = 0; i < EMBERS; i++) {
        const r1 = hash(i * 3 + 1), r2 = hash(i * 3 + 2), r3 = hash(i * 3 + 3);
        const speed = (6 + r2 * 18) * SCALE;
        const span = h + 20 * SCALE;
        const y = h + 10 * SCALE - ((seconds * speed + r1 * span) % span);
        const x = r3 * w + Math.sin(seconds * (0.4 + r1) + i) * 6 * SCALE;
        const life = 1 - (h + 10 * SCALE - y) / span; // fade out towards the top
        const a = Math.min(1, Math.max(0, (life * (90 + 120 * r2)) / 255));
        const size = (r2 > 0.75 ? 2 : 1) * SCALE;
        g.fillStyle = rgba(a / 5); // soft halo
        g.fillRect(x - SCALE, y - SCALE, size + 2 * SCALE, size + 2 * SCALE);
        g.fillStyle = rgba(a);
        g.fillRect(x, y, size, size);
      }
    };

    const loop = () => {
      if (stopped) return;
      draw((performance.now() - start) / 1000 + 40);
      if (animate) frame = requestAnimationFrame(loop);
    };

    const img = new Image();
    img.onload = () => {
      raven = tintRaven(img, accent);
      if (!animate) loop();
    };
    img.src = RAVEN_SRC;

    const onResize = () => {
      if (!animate) loop();
    };
    window.addEventListener("resize", onResize);
    loop();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [accent, animate]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
