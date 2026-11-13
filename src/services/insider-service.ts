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
  /** the check could not be done (Mojang refused the sign-in or could not be reached): ask again later */
  retry: boolean;
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
 * After a check that could not be done, ask again after these waits (the backend asks Mojang again at the earliest
 * a minute after a refusal); a check that works, or the next app start or account change, starts over.
 */
const RETRY_DELAYS_MS = [65_000, 120_000, 300_000, 600_000];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;

function scheduleRetry(retry: boolean): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (!retry) {
    retries = 0;
    return;
  }
  if (retries >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[retries++];
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void refreshInsiderAccess(true);
  }, delay);
}

/**
 * Checks the active account (app start after the normal refresh, every account change): first what this PC knows,
 * at once, then the API. Calls while one runs make it run once more. `fromRetry` keeps counting the retries.
 */
export function refreshInsiderAccess(fromRetry = false): Promise<void> {
  if (!fromRetry) retries = 0;
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      let retry = false;
      do {
        again = false;
        if (take(await getInsiderStatus())) await reloadProfiles();
        const status = await refreshInsider();
        retry = status.retry;
        if (take(status)) await reloadProfiles();
      } while (again);
      scheduleRetry(retry);
    } catch (error) {
      console.error("[Insider] Failed to check the access:", error);
    } finally {
      running = null;
    }
  })();
  return running;
}
