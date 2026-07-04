import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { api, type PatientClaim } from "../lib/api";
import { getPatientId } from "../lib/storage";

const SYNC_MS = 8_000;

export type PatientInsuranceSync = {
  syncVersion: number;
  lastSyncAt: number | null;
  syncing: boolean;
  error: string | null;
  coverageStats: {
    balance_kes: number;
    used_ytd_kes: number;
    annual_limit_kes: number;
    claims_count: number;
    claims_processed: number;
    renewal_date: string;
    cover_active: boolean;
  } | null;
  claims: PatientClaim[];
  billingMembershipStatus: string | null;
  refresh: () => Promise<void>;
};

export function useInsuranceSync(patientId?: string): PatientInsuranceSync {
  const versionRef = useRef(0);
  const [syncVersion, setSyncVersion] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageStats, setCoverageStats] = useState<PatientInsuranceSync["coverageStats"]>(null);
  const [claims, setClaims] = useState<PatientInsuranceSync["claims"]>([]);
  const [billingMembershipStatus, setBillingMembershipStatus] = useState<string | null>(null);

  const pull = useCallback(async (force = false) => {
    const pid = patientId ?? (await getPatientId());
    if (!pid) return;
    setSyncing(true);
    try {
      const res = await api.insuranceSync(pid, force ? 0 : versionRef.current);
      setSyncVersion(res.sync_version);
      versionRef.current = res.sync_version;
      if (res.changed || force) {
        if (res.coverage_stats) setCoverageStats(res.coverage_stats);
        if (res.patient_claims) setClaims(res.patient_claims);
        if (res.billing?.membership_status) setBillingMembershipStatus(res.billing.membership_status);
      }
      setLastSyncAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Insurance sync failed");
    } finally {
      setSyncing(false);
    }
  }, [patientId]);

  useEffect(() => {
    void pull(true);
    const id = setInterval(() => void pull(), SYNC_MS);
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") void pull(true);
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [pull]);

  return {
    syncVersion,
    lastSyncAt,
    syncing,
    error,
    coverageStats,
    claims,
    billingMembershipStatus,
    refresh: () => pull(true),
  };
}
