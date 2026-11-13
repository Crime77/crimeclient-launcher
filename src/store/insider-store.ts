import { create } from "zustand";
import type { Profile } from "../types/profile";

/** Pack id of CrimeClient Insider (mod-api insider/launcher), until the backend has named the one it knows. */
export const INSIDER_PACK_ID = "crimeclient-insider";

/**
 * CrimeClient Insider: a private profile only devs and chosen accounts get (src-tauri/src/commands/insider_command.rs).
 * The backend keeps the Insider pack and profile in its lists for every account on this PC; this store says whether
 * the active account may see them. Profile and pack lists hide them otherwise (services/profile-service.ts,
 * hooks/usePacks.ts); services/insider-service.ts fills it on app start and every account change.
 */
interface InsiderState {
  /** the active account gets the Insider profile */
  access: boolean;
  /** pack and standard profile of the Insider profile this PC knows */
  packId: string | null;
  profileId: string | null;
  /** goes up when the Insider pack in the backend's pack list changed, so usePacks loads the packs again */
  revision: number;
}

export const useInsiderStore = create<InsiderState>(() => ({
  access: false,
  packId: null,
  profileId: null,
  revision: 0,
}));

type ProfileLike = Pick<Profile, "id" | "selected_norisk_pack_id" | "source_standard_profile_id">;

/** The Insider profile, its copy and any profile on the Insider pack are hidden while the active account has no access. */
export function isHiddenInsider(profile: ProfileLike): boolean {
  const { access, packId, profileId } = useInsiderStore.getState();
  if (access) return false;
  if (profile.selected_norisk_pack_id === (packId ?? INSIDER_PACK_ID)) return true;
  return profileId !== null && (profile.id === profileId || profile.source_standard_profile_id === profileId);
}

export function visibleProfiles<T extends ProfileLike>(profiles: T[]): T[] {
  return profiles.filter((profile) => !isHiddenInsider(profile));
}

/** The packs without the Insider pack, unless the active account has access. */
export function visibleInsiderPacks<T>(packs: Record<string, T>, access: boolean, packId: string | null): Record<string, T> {
  const insider = packId ?? INSIDER_PACK_ID;
  if (access || !(insider in packs)) return packs;
  return Object.fromEntries(Object.entries(packs).filter(([id]) => id !== insider));
}
