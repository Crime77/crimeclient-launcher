export interface FontPreset {
  id: string;
  name: string;
  smallcaps: string;
  minecraft: string;
  /** Headings and other display text (h1-h6, .font-display) */
  display: string;
  /** font-stretch of the display text; only Archivo has a width axis */
  displayStretch?: string;
  preview: string;
  /** font-size-adjust so text sized for the Minecraft font keeps roughly the same size */
  adjust?: number;
  tracking?: string;
}

const ARCHIVO = '"Archivo", system-ui, sans-serif';

export const FONT_PRESETS: Record<string, FontPreset> = {
  crime: {
    id: "crime",
    name: "CrimeClient",
    smallcaps: ARCHIVO,
    minecraft: ARCHIVO,
    display: ARCHIVO,
    displayStretch: "116%",
    preview: ARCHIVO,
    adjust: 0.5,
    tracking: "0",
  },
  inter: {
    id: "inter",
    name: "Inter",
    smallcaps: '"Inter", system-ui, sans-serif',
    minecraft: '"Inter", system-ui, sans-serif',
    display: '"Inter", system-ui, sans-serif',
    preview: '"Inter", sans-serif',
    adjust: 0.5,
    tracking: "0",
  },
  minecraft: {
    id: "minecraft",
    name: "Minecraft",
    smallcaps: '"SmallCaps", monospace',
    minecraft: '"MinecraftTen", sans-serif',
    display: '"MinecraftTen", "SmallCaps", sans-serif',
    preview: '"MinecraftTen", "SmallCaps", sans-serif',
  },
  system: {
    id: "system",
    name: "System",
    smallcaps: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    minecraft: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    display: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    preview: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  mono: {
    id: "mono",
    name: "Mono",
    smallcaps: '"JetBrains Mono", ui-monospace, monospace',
    minecraft: '"JetBrains Mono", ui-monospace, monospace',
    display: '"JetBrains Mono", ui-monospace, monospace',
    preview: '"JetBrains Mono", ui-monospace, monospace',
  },
};

export const DEFAULT_FONT_ID = "crime";
