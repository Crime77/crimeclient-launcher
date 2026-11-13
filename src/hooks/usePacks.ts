import { useEffect, useMemo, useState } from "react";
import * as ProfileService from "../services/profile-service";
import { PERMISSION } from "../constants/permissions";
import { usePermissions } from "./usePermission";
import { devPackPermission, isDevPack, visiblePacks, type Packs } from "../utils/pack-listing";
import { logError } from "../utils/logging-utils";
import { useInsiderStore, visibleInsiderPacks } from "../store/insider-store";

let cache: Packs | null = null;
let inFlight: Promise<Packs> | null = null;

/** The backend's pack list changed (CrimeClient Insider): the next loadPacks asks again. */
export function invalidatePacks(): void {
  cache = null;
}

export function loadPacks(): Promise<Packs> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = ProfileService.getNoriskPacksResolved()
      .then((config) => {
        cache = config?.packs ?? {};
        return cache;
      })
      .catch((err) => {
        logError(`Failed to load NoRisk packs: ${err}`);
        return {} as Packs;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function usePacks(): { packs: Packs; loading: boolean } {
  const [packs, setPacks] = useState<Packs>(() => cache ?? {});
  const [loading, setLoading] = useState(() => cache === null);
  const insiderRevision = useInsiderStore((s) => s.revision);
  const insiderAccess = useInsiderStore((s) => s.access);
  const insiderPackId = useInsiderStore((s) => s.packId);

  useEffect(() => {
    if (cache) {
      setPacks(cache);
      setLoading(false);
      return;
    }
    let active = true;
    loadPacks().then((p) => {
      if (!active) return;
      setPacks(p);
      setLoading(false);
    });
    return () => { active = false; };
  }, [insiderRevision]);

  const nodes = useMemo(
    () => [PERMISSION.STAFF, ...Object.keys(packs).filter(isDevPack).map(devPackPermission)],
    [packs],
  );
  const granted = usePermissions(nodes);

  const allowed = useMemo(
    () =>
      visibleInsiderPacks(
        visiblePacks(packs, (id) => granted.has(PERMISSION.STAFF) || granted.has(devPackPermission(id))),
        insiderAccess,
        insiderPackId,
      ),
    [packs, granted, insiderAccess, insiderPackId],
  );

  return { packs: allowed, loading };
}
