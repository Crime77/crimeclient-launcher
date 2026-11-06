/**
 * The theme accent as CSS, without gluing hex alpha digits onto accentColor.value.
 * The values follow the live theme because they read the CSS variables that
 * useThemeStore.applyAccentColorToDOM sets.
 *
 * "Werkzeug" rule: the accent marks PLAY, the active page and progress. Everything
 * else (cards, hovers, borders) stays on the neutral surfaces (var(--s1) ... var(--s4),
 * var(--line)), so reach for these sparingly.
 */

/** The accent at the given opacity (0..1), e.g. accent(0.15) for a selected row's tint. */
export function accent(alpha = 1): string {
  if (alpha >= 1) return "var(--accent)";
  return `rgb(var(--accent-ch) / ${Math.max(0, alpha)})`;
}

/** Text colour that reads on a solid accent fill (dark on light accents). */
export const onAccent = "var(--on-accent)";

/** Neutral design tokens for inline styles. */
export const tokens = {
  bg: "var(--bg)",
  s1: "var(--s1)",
  s2: "var(--s2)",
  s3: "var(--s3)",
  s4: "var(--s4)",
  line: "var(--line)",
  line2: "var(--line-2)",
  line3: "var(--line-3)",
  fg: "var(--fg)",
  fg2: "var(--fg-2)",
  fg3: "var(--fg-3)",
  fg4: "var(--fg-4)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  err: "var(--err)",
  info: "var(--info)",
  rSm: "var(--r-sm)",
  rMd: "var(--r-md)",
  rLg: "var(--r-lg)",
  shadowPop: "var(--shadow-pop)",
} as const;
