import { invoke } from "@tauri-apps/api/core";
import { useInsiderStore } from "../store/insider-store";
import { useProfileStore } from "../store/profile-store";
import { invalidatePacks } from "../hooks/usePacks";
import * as ProfileService from "./profile-service";

/** src-tauri/src/commands/insider_command.rs `InsiderStatus` */
export interface InsiderStatus {
  access: boolean;
  pack_id: string | null;
  profile_id: string | null;
  /** the backend's pack or profile lists changed with this check */
  changed: boolean;
}

/** What this PC knows about the active account, without asking the API. */
export const getInsiderStatus = (): Promise<InsiderStatus> => invoke("get_insider_status");

/** Asks the API whether the active account gets CrimeClient Insider (signs in to the store if needed). */
export const refreshInsider = (): Promise<InsiderStatus> => invoke("refresh_insider");

/** Takes a status into the store; returns whether the profile and pack lists have to be loaded again. */
function take(status: InsiderStatus): boolean {
  const before = useInsiderStore.getState();
  const shownChanged =
    before.access !== status.access || before.packId !== status.pack_id || before.profileId !== status.profile_id;
  if (status.changed) invalidatePacks();
  useInsiderStore.setState({
    access: status.access,
    packId: status.pack_id,
    profileId: status.profile_id,
    revision: status.changed ? before.revision + 1 : before.revision,
  });
  return shownChanged || status.changed;
}

async function reloadProfiles(): Promise<void> {
  await useProfileStore.getState().fetchProfiles();
  try {
    const { profiles } = await ProfileService.getStandardProfiles();
    useProfileStore.setState({ standardProfiles: profiles ?? [] });
  } catch (error) {
    console.error("[Insider] Failed to reload the standard profiles:", error);
  }
}

/** Before the first profile list is fetched: what this PC knows, so the Insider profile shows up at once. */
export async function loadInsiderStatus(): Promise<void> {
  try {
    take(await getInsiderStatus());
  } catch (error) {
    console.error("[Insider] Failed to read the cached status:", error);
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Checks the active account (app start after the normal refresh, every account change): first what this PC knows,
 * at once, then the API. Calls while one runs make it run once more.
 */
export function refreshInsiderAccess(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        if (take(await getInsiderStatus())) await reloadProfiles();
        if (take(await refreshInsider())) await reloadProfiles();
      } while (again);
    } catch (error) {
      console.error("[Insider] Failed to check the access:", error);
    } finally {
      running = null;
    }
  })();
  return running;
}
