import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type MedicationRequest, type Observation, type PatientSummary } from "../lib/api";
import { config } from "../lib/config";
import { getPatientId } from "../lib/storage";

type PatientContextValue = {
  patientId: string;
  setPatientId: (id: string) => void;
  summary: PatientSummary | null;
  meds: MedicationRequest[];
  observations: Observation[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
};

const PatientContext = createContext<PatientContextValue | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [patientId, setPatientIdState] = useState(config.defaultPatientId);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [meds, setMeds] = useState<MedicationRequest[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((c) => (c === msg ? null : c)), 3200);
  }, []);

  const load = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [s, m, o] = await Promise.all([
        api.patientSummary(pid, 5),
        api.medicationRequests(pid, 20),
        api.observations(pid, 30),
      ]);
      setSummary(s);
      setMeds(m);
      setObservations(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getPatientId().then((id) => {
      const pid = id || config.defaultPatientId;
      setPatientIdState(pid);
      void load(pid);
    });
  }, [load]);

  const setPatientId = useCallback(
    (id: string) => {
      setPatientIdState(id);
      void load(id);
    },
    [load],
  );

  const value = useMemo(
    () => ({
      patientId,
      setPatientId,
      summary,
      meds,
      observations,
      loading,
      error,
      refresh: () => void load(patientId),
      toast,
      toastMsg,
    }),
    [patientId, setPatientId, summary, meds, observations, loading, error, load, toast, toastMsg],
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used within PatientProvider");
  return ctx;
}
