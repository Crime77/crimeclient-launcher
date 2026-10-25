import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_FONT_ID, FONT_PRESETS } from "../config/fonts";

export const CUSTOM_FONT_ID = "custom";

interface FontState {
  fontId: string;
  customFamily: string;
  setFont: (id: string) => void;
  setCustomFamily: (name: string) => void;
  applyFontToDOM: () => void;
}

export const useFontStore = create<FontState>()(
  persist(
    (set, get) => ({
      fontId: DEFAULT_FONT_ID,
      customFamily: "",

      setFont: (id: string) => {
        const nextId = id === CUSTOM_FONT_ID || FONT_PRESETS[id] ? id : DEFAULT_FONT_ID;
        set({ fontId: nextId });
        get().applyFontToDOM();

        void import("../services/analytics-service").then(({ trackEvent }) => {
          trackEvent("font_changed", { font: nextId }).catch(console.error);
        });
      },

      setCustomFamily: (name: string) => {
        set({ customFamily: name });
        if (get().fontId === CUSTOM_FONT_ID) get().applyFontToDOM();
      },

      applyFontToDOM: () => {
        const { fontId, customFamily } = get();
        const root = document.documentElement.style;

        if (fontId === CUSTOM_FONT_ID && customFamily.trim()) {
          const family = `"${customFamily.trim()}", sans-serif`;
          root.setProperty("--font-smallcaps", family);
          root.setProperty("--font-minecraft", family);
          root.removeProperty("--font-adjust");
          root.removeProperty("--font-tracking");
          return;
        }

        const preset = FONT_PRESETS[fontId] ?? FONT_PRESETS[DEFAULT_FONT_ID];
        root.setProperty("--font-smallcaps", preset.smallcaps);
        root.setProperty("--font-minecraft", preset.minecraft);
        if (preset.adjust) root.setProperty("--font-adjust", String(preset.adjust));
        else root.removeProperty("--font-adjust");
        if (preset.tracking) root.setProperty("--font-tracking", preset.tracking);
        else root.removeProperty("--font-tracking");
      },
    }),
    {
      name: "norisk-font-storage",
      // v1: CrimeClient design, the old Minecraft default becomes the CrimeClient font
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as FontState;
        if (version < 1 && state.fontId === "minecraft") state.fontId = DEFAULT_FONT_ID;
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.applyFontToDOM();
      },
    },
  ),
);
