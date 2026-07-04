import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { UHIC_FULL_SYNC_MS } from "../lib/syncConfig";
import { useFastClaimsSync } from "../hooks/useFastClaimsSync";
import { getDisplayName, getFacilityId, getRole } from "../lib/storage";
import type { UhicFraudTrend, UhicMember, UhicProviderScore } from "../types/uhic";
import type { EccifProjection } from "../types/uhic";

type UhicContextValue = {
  role: string;
  facilityId: string;
  displayName: string;
  summary: ReturnType<typeof useFastClaimsSync>["summary"];
  members: UhicMember[];
  claims: ReturnType<typeof useFastClaimsSync>["claims"];
  providers: UhicProviderScore[];
  fraud: UhicFraudTrend | null;
  forecast: EccifProjection[];
  loading: boolean;
  error: string | null;
  syncVersion: number;
  lastSyncAt: number | null;
  syncing: boolean;
  toastMsg: string;
  toast: (msg: string) => void;
  refresh: () => Promise<void>;
};

const UhicContext = createContext<UhicContextValue | null>(null);

export function UhicProvider({ children }: { children: ReactNode }) {
  const fast = useFastClaimsSync();
  const [role, setRole] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [displayName, setDisplayName] = useState("UHIC Operator");
  const [members, setMembers] = useState<UhicMember[]>([]);
  const [providers, setProviders] = useState<UhicProviderScore[]>([]);
  const [fraud, setFraud] = useState<UhicFraudTrend | null>(null);
  const [forecast, setForecast] = useState<EccifProjection[]>([]);
  const [auxLoading, setAuxLoading] = useState(true);
  const [auxError, setAuxError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  }, []);

  const refreshAux = useCallback(async () => {
    setAuxLoading(true);
    try {
      const [r, f, d] = await Promise.all([getRole(), getFacilityId(), getDisplayName()]);
      setRole(r);
      setFacilityId(f);
      setDisplayName(d);
      const [m, p, fr, fc] = await Promise.all([
        api.uhicMembers(),
        api.uhicProviderScores(),
        api.uhicFraudTrend(),
        api.uhicActuarialForecast(12),
      ]);
      setMembers(m.members);
      setProviders(p.providers);
      setFraud(fr);
      setForecast(fc.eccif_projection);
      setAuxError(null);
    } catch (e) {
      setAuxError(e instanceof Error ? e.message : "Failed to load UHIC data");
    } finally {
      setAuxLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fast.refresh(), refreshAux()]);
  }, [fast, refreshAux]);

  useEffect(() => {
    void refreshAux();
    const id = setInterval(() => void refreshAux(), UHIC_FULL_SYNC_MS);
    return () => clearInterval(id);
  }, [refreshAux]);

  const value = useMemo(
    () => ({
      role,
      facilityId,
      displayName,
      summary: fast.summary,
      members,
      claims: fast.claims,
      providers,
      fraud,
      forecast,
      loading: fast.syncing && auxLoading,
      error: fast.error ?? auxError,
      syncVersion: fast.syncVersion,
      lastSyncAt: fast.lastSyncAt,
      syncing: fast.syncing,
      toastMsg,
      toast,
      refresh,
    }),
    [
      role,
      facilityId,
      displayName,
      fast.summary,
      fast.claims,
      fast.syncVersion,
      fast.lastSyncAt,
      fast.syncing,
      fast.error,
      members,
      providers,
      fraud,
      forecast,
      auxLoading,
      auxError,
      toastMsg,
      toast,
      refresh,
    ],
  );

  return <UhicContext.Provider value={value}>{children}</UhicContext.Provider>;
}

export function useUhic() {
  const ctx = useContext(UhicContext);
  if (!ctx) throw new Error("useUhic must be used within UhicProvider");
  return ctx;
}
