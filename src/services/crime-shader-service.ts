import { invoke } from "@tauri-apps/api/core";

/** One place on a screen of the pack (crimeclient-rust/mods/crime/shaders.rs, `ModelItem`). */
export type ShaderItem =
  | { kind: "option"; name: string }
  | { kind: "screen"; name: string }
  | { kind: "profile" }
  | { kind: "empty" };

export interface ShaderOption {
  default: string;
  values: string[];
  switch: boolean;
  slider: boolean;
}

/** What the game wrote of Photon beside the pack: its options, screens, quality levels and texts. */
export interface ShaderModel {
  format: number;
  pack: string;
  size: number;
  options: Record<string, ShaderOption>;
  /** By name, "" the main screen. */
  screens: Record<string, { columns: number; items: ShaderItem[] }>;
  profiles: { name: string; values: Record<string, string> }[];
  /** The pack's names and comments with their § codes: `en` all, `de` where it says something else. */
  text: { en: Record<string, string>; de?: Record<string, string> };
}

/** A CrimeClient Rust profile's Photon settings (src-tauri/src/commands/crime_shader_command.rs). */
export interface ShaderPage {
  model: ShaderModel | null;
  /** The values that differ from the defaults. */
  chosen: Record<string, string>;
  on: boolean;
  running: boolean;
  /** A Java profile has Photon values to take over. */
  java: boolean;
}

export const getShaderPage = (profileId: string) => invoke<ShaderPage>("crime_shader_get", { profileId });

export const setShaderValues = (profileId: string, chosen: Record<string, string>) =>
  invoke<ShaderPage>("crime_shader_set", { profileId, chosen });

export const toggleShader = (profileId: string, on: boolean) =>
  invoke<ShaderPage>("crime_shader_toggle", { profileId, on });

export const importJavaShader = (profileId: string) => invoke<ShaderPage>("crime_shader_import_java", { profileId });
