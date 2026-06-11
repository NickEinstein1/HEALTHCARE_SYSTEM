import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export type PatientInsight = {
  title: string;
  body: string;
  severity?: string;
};

export type PatientAlert = {
  title?: string;
  body?: string;
};

export function usePatientAiInsights(
  patientId: string,
  vitals: Record<string, number>,
  options?: { enabled?: boolean; onError?: (message: string) => void },
) {
  const enabled = options?.enabled !== false;
  const [insights, setInsights] = useState<PatientInsight[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLive, setHasLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.aiPatientInsights(
        {
          patient_id: patientId,
          vitals: {
            rr: vitals.rr ?? 16,
            sbp: vitals.sbp ?? 120,
            hr: vitals.hr ?? 75,
            spo2: vitals.spo2 ?? 98,
            temp: vitals.temp ?? 37,
            gcs: vitals.gcs ?? 15,
          },
        },
        "patient",
      );
      const rows = res.insights ?? [];
      setInsights(rows);
      setHasLive(rows.length > 0);
    } catch (e: unknown) {
      setInsights([]);
      setHasLive(false);
      const msg = e instanceof Error ? e.message : "API offline";
      setError(msg);
      options?.onError?.(msg);
    }

    try {
      const alertRes = await api.aiPatientAlerts({ patient_id: patientId, limit: 6 }, "patient");
      setAlerts(alertRes.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, vitals, enabled, options]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { insights, alerts, loading, hasLive, error, refresh };
}
