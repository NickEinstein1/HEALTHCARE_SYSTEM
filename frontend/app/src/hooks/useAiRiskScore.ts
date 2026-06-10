import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { buildVitalMapFromObs, type RiskScoreResult } from "../components/ai/riskScoreHelpers";

export function useAiRiskScore(
  patientId: string,
  observations: any[] | null | undefined,
  role: "doctor" | "nurse" | "admin",
  options?: { onError?: (message: string) => void },
) {
  const vitalMap = useMemo(() => buildVitalMapFromObs(observations ?? undefined), [observations]);
  const [riskScore, setRiskScore] = useState<RiskScoreResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  const fetchRiskScore = useCallback(async () => {
    setRiskLoading(true);
    try {
      const result = await api.aiRiskScore(
        { patient_id: patientId, features: vitalMap, use_fhir: true },
        role,
      );
      setRiskScore(result);
    } catch (e: unknown) {
      setRiskScore(null);
      const msg = e instanceof Error ? e.message : "API offline or feature disabled";
      options?.onError?.(msg);
    } finally {
      setRiskLoading(false);
    }
  }, [patientId, vitalMap, role, options]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setRiskLoading(true);
      try {
        const result = await api.aiRiskScore(
          { patient_id: patientId, features: vitalMap, use_fhir: true },
          role,
        );
        if (!cancelled) setRiskScore(result);
      } catch {
        if (!cancelled) setRiskScore(null);
      } finally {
        if (!cancelled) setRiskLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, vitalMap, role]);

  return { riskScore, riskLoading, fetchRiskScore, vitalMap };
}
