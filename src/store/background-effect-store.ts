import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Backgrounds of the "Werkzeug" design: plain surfaces, or a faint 1 px grid. Own images and videos come on top. */
export enum BACKGROUND_EFFECTS {
  NONE = "none",
  GRID = "grid",
}

interface BackgroundEffectState {
  currentEffect: string;
  customMediaUrl: string | null;
  customMediaType: "image" | "video" | null;
  customMediaOpacity: number;
  customMediaBlur: number;
  customMediaQuality: "low" | "medium" | "high";
  customMediaOnlyOnPlay: boolean;
  customMediaHideEffects: boolean;
  setCurrentEffect: (effect: string) => void;
  setCustomMedia: (url: string | null, type: "image" | "video" | null) => void;
  setCustomMediaOpacity: (opacity: number) => void;
  setCustomMediaBlur: (blur: number) => void;
  setCustomMediaQuality: (quality: "low" | "medium" | "high") => void;
  setCustomMediaOnlyOnPlay: (onlyOnPlay: boolean) => void;
  setCustomMediaHideEffects: (hideEffects: boolean) => void;
}

export const useBackgroundEffectStore = create<BackgroundEffectState>()(
  persist(
    (set) => ({
      currentEffect: BACKGROUND_EFFECTS.NONE,
      customMediaUrl: null,
      customMediaType: null,
      customMediaOpacity: 0.25,
      customMediaBlur: 0,
      customMediaQuality: "high",
      customMediaOnlyOnPlay: true,
      customMediaHideEffects: false,
      setCurrentEffect: (effect) => set({ currentEffect: effect }),
      setCustomMedia: (url, type) => set({ customMediaUrl: url, customMediaType: type }),
      setCustomMediaOpacity: (opacity) => set({ customMediaOpacity: opacity }),
      setCustomMediaBlur: (blur) => set({ customMediaBlur: blur }),
      setCustomMediaQuality: (quality) => set({ customMediaQuality: quality }),
      setCustomMediaOnlyOnPlay: (onlyOnPlay) => set({ customMediaOnlyOnPlay: onlyOnPlay }),
      setCustomMediaHideEffects: (hideEffects) => set({ customMediaHideEffects: hideEffects }),
    }),
    {
      name: "norisk-background-effect-storage",
      // v1: CrimeClient design, switch existing installs once to the Glut background
      // v2: "Werkzeug" design, the animated effects are gone; everyone starts calm
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as BackgroundEffectState;
        if (version < 2 || !Object.values(BACKGROUND_EFFECTS).includes(state.currentEffect as BACKGROUND_EFFECTS)) {
          state.currentEffect = BACKGROUND_EFFECTS.NONE;
        }
        return state;
      },
    },
  ),
);
