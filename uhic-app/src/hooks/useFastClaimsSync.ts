import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { api } from "../lib/api";
import { UHIC_CLAIMS_SYNC_MS } from "../lib/syncConfig";
import type { InsuranceSyncPayload, UhicClaim, UhicDashboardSummary } from "../types/uhic";

export function useFastClaimsSync() {
  const versionRef = useRef(0);
  const [claims, setClaims] = useState<UhicClaim[]>([]);
  const [summary, setSummary] = useState<UhicDashboardSummary | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pull = useCallback(async (force = false) => {
    setSyncing(true);
    try {
      const res: InsuranceSyncPayload = await api.insuranceSync(force ? 0 : versionRef.current, true);
      setSyncVersion(res.sync_version);
      versionRef.current = res.sync_version;
      if (res.changed || force) {
        if (res.claims) setClaims(res.claims);
        if (res.summary) setSummary(res.summary);
      }
      setLastSyncAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void pull(true);
    const id = setInterval(() => void pull(), UHIC_CLAIMS_SYNC_MS);
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") void pull(true);
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [pull]);

  return { claims, summary, syncVersion, lastSyncAt, syncing, error, refresh: () => pull(true) };
}
