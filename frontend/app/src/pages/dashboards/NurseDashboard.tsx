import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAiAlertsWebSocket } from "../../hooks/useAiAlertsWebSocket";
import { usePolling } from "../../hooks/usePolling";
import { BodyVitalsFigure } from "../../components/BodyVitalsFigure";
import { CrudRowActions } from "../../components/CrudRowActions";
import { FormModal } from "../../components/FormModal";
import { AiRiskScorePanel } from "../../components/ai/AiRiskScorePanel";
import { riskBandClass } from "../../components/ai/riskScoreHelpers";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";
import { ESignModulePanel } from "../../components/legal/ESignModulePanel";
import { useAiRiskScore } from "../../hooks/useAiRiskScore";

function formatRowTime(ts?: number | string): string {
  if (!ts) return "—";
  if (typeof ts === "number") {
    return new Date(ts * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(ts);
}

type NursePage =
  | "home"
  | "patients"
  | "chart"
  | "triage"
  | "vitals"
  | "mar"
  | "tasks"
  | "fluids"
  | "wounds"
  | "handover"
  | "incidents"
  | "esign"
  | "supplies";

const NURSE_TITLES: Record<NursePage, string> = {
  home: "Shift Overview",
  patients: "My Patients",
  chart: "Patient Chart",
  triage: "Triage Queue",
  vitals: "Record Vitals",
  mar: "Medication Administration",
  tasks: "Tasks & Care Plans",
  fluids: "Fluid Balance",
  wounds: "Wound Care",
  handover: "Shift Handover",
  incidents: "Incident Reports",
  esign: "E-Signatures",
  supplies: "Supplies & Inventory",
};

const NURSE_CRUMBS: Record<NursePage, string> = {
  home: "Home",
  patients: "Nursing › Patients",
  chart: "Nursing › Patient Chart",
  triage: "Nursing › Triage",
  vitals: "Nursing › Vitals",
  mar: "Nursing › MAR",
  tasks: "Nursing › Tasks",
  fluids: "Nursing › Fluids",
  wounds: "Nursing › Wounds",
  handover: "Docs › Handover",
  incidents: "Docs › Incidents",
  esign: "Docs › E-Signatures",
  supplies: "Docs › Supplies",
};

/** Persist nurse’s ward focus for the Phase 3 bed-demand chart across refresh. */
const LS_PHASE3_FORECAST_WARD = "unihealth.phase3.forecastWardId";

function pgOn(active: boolean) {
  return `pg${active ? " on" : ""}`;
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function obsCodeMatches(code: string | null | undefined, patterns: readonly string[]) {
  const c = (code ?? "").toLowerCase();
  return patterns.some((p) => c.includes(p));
}

const NURSE_VITALS_CATALOG = [
  { key: "bp", label: "Blood Pressure", unit: "mmHg", icon: "🩸", range: "90–140 / 60–90", match: ["blood pressure", "bp"] as const },
  { key: "hr", label: "Heart Rate", unit: "bpm", icon: "💗", range: "60–100", match: ["heart rate", "pulse", "hr"] as const },
  { key: "rr", label: "Respiratory Rate", unit: "breaths/min", icon: "🫁", range: "12–20", match: ["respiratory", "rr"] as const },
  { key: "temp", label: "Temperature", unit: "°C", icon: "🌡️", range: "36.1–37.2", match: ["temperature", "temp"] as const },
  { key: "spo2", label: "SpO₂", unit: "%", icon: "🩺", range: "≥ 95", match: ["spo2", "oxygen", "o2"] as const },
  { key: "glucose", label: "Random Glucose", unit: "mmol/L", icon: "🩸", range: "3.9–7.8", match: ["glucose", "rbg"] as const },
  { key: "pain", label: "Pain Score", unit: "/10", icon: "😖", range: "0–10", match: ["pain"] as const },
  { key: "avpu", label: "AVPU", unit: "", icon: "🧠", range: "A–U", match: ["avpu", "gcs"] as const },
] as const;

export function NurseDashboard() {
  const toast = useDashboardToast();
  const [patientId, setPatientId] = useState("P001");
  const obs = usePolling(() => api.observations(patientId, 20, "nurse"), { intervalMs: 4000 });
  const summary = usePolling(() => api.patientSummary(patientId, 5, "nurse"), { intervalMs: 8000 });
  const meds = usePolling(() => api.medicationRequests(patientId, 20, "nurse"), { intervalMs: 8000 });
  const supplyRequests = usePolling(() => api.nurseSupplies(50), { intervalMs: 5000 });
  const { riskScore, riskLoading, fetchRiskScore } = useAiRiskScore(patientId, obs.data, "nurse", {
    onError: (msg) => toast(`Risk score: ${msg}`),
  });
  const [page, setPage] = useState<NursePage>("home");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Phase 3: AI state ──────────────────────────────────────────────
  const [aiAlerts, setAiAlerts]       = useState<any[]>([]);
  const [simPatients, setSimPatients] = useState<any[]>([]);
  const [wardState, setWardState]     = useState<any[]>([]);
  const [wardForecast, setWardForecast] = useState<any[]>([]);
  const [forecastWardId, setForecastWardId] = useState(() => {
    try {
      return sessionStorage.getItem(LS_PHASE3_FORECAST_WARD) ?? "";
    } catch {
      return "";
    }
  });
  const [forecastLoading, setForecastLoading] = useState(false);
  const [nurseCensusDraft, setNurseCensusDraft] = useState<Record<string, string>>({});
  const [_ewsResult, setEwsResult]    = useState<any | null>(null); void _ewsResult;

  useAiAlertsWebSocket("nurse", useCallback((data) => {
    setAiAlerts((prev) => [data, ...prev].slice(0, 20));
    toast(`🚨 ${String(data.severity ?? "Alert")}: ${String(data.msg ?? "Anomaly detected")}`);
  }, [toast]));

  const refreshWardStrip = useCallback(
    async (focusWardId?: string) => {
      try {
        const wards = await api.aiWards("nurse");
        setWardState(wards);
        let wid = "";
        if (focusWardId && wards.some((w: any) => w.ward_id === focusWardId)) {
          wid = focusWardId;
        } else if (forecastWardId && wards.some((w: any) => w.ward_id === forecastWardId)) {
          wid = forecastWardId;
        } else {
          wid = wards[0]?.ward_id ?? "";
        }
        if (wid && wid !== forecastWardId) {
          setForecastWardId(wid);
          try {
            sessionStorage.setItem(LS_PHASE3_FORECAST_WARD, wid);
          } catch { /* private mode */ }
        }
        if (wid) {
          const fc = await api.aiWardForecast(wid, 24, "nurse");
          setWardForecast(fc);
        } else {
          setWardForecast([]);
        }
      } catch { /* api offline */ }
    },
    [forecastWardId],
  );

  const selectForecastWard = useCallback(
    async (wardId: string) => {
      if (!wardId) return;
      setForecastLoading(true);
      setForecastWardId(wardId);
      try {
        sessionStorage.setItem(LS_PHASE3_FORECAST_WARD, wardId);
      } catch { /* ignore */ }
      try {
        const fc = await api.aiWardForecast(wardId, 24, "nurse");
        setWardForecast(fc);
      } catch {
        toast("Could not load forecast for that ward.");
      } finally {
        setForecastLoading(false);
      }
    },
    [toast],
  );

  // Poll anomalies, sim patients, wards
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [alerts, patients] = await Promise.all([
          api.aiAnomalies({ ack: false, limit: 20 }, "nurse"),
          api.aiSimPatients({ limit: 25 }, "nurse"),
        ]);
        if (!cancelled) {
          setAiAlerts(alerts);
          setSimPatients(patients);
        }
        if (!cancelled) await refreshWardStrip();
      } catch { /* api offline */ }
    };
    void load();
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshWardStrip]);

  const _computeEws = async (rr: number, spo2: number, sbp: number, hr: number, temp: number) => {
    try {
      const res = await api.aiNews2({ rr, spo2, sbp, hr, temp, gcs: 15 }, "nurse");
      setEwsResult(res);
    } catch { /* offline */ }
  }; void _computeEws;

  const ackAlert = async (id: string) => {
    try {
      await api.aiAckAnomaly(id, "Reviewed by nurse", "nurse");
      setAiAlerts(prev => prev.filter(a => a.id !== id));
      toast("Alert acknowledged.");
    } catch { /* offline */ }
  };

  // Constant for display (must be declared before use in JSX below)
  const MODEL_VERSION_DISPLAY = "rule-v1.0.0";

  // ── AI Live Alerts Rail ───────────────────────────────────────────
  const aiAlertsRail = (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>
          Live Clinical Alerts
          {aiAlerts.length > 0 && (
            <span style={{ marginLeft: 8, background: "#ff3366", color: "#fff", borderRadius: 10,
              padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
              {aiAlerts.filter(a => !a.acknowledged).length}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>Phase 3 · AI Anomaly Engine · {MODEL_VERSION_DISPLAY}</span>
      </div>
      {aiAlerts.length === 0 ? (
        <div style={{ padding: "12px 14px", background: "rgba(0,229,160,0.05)",
          border: "1px solid rgba(0,229,160,0.15)", borderRadius: 10, fontSize: 13, color: "var(--t3)" }}>
          No active alerts — all patients within safe parameters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {aiAlerts.slice(0, 5).map((a: any) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: a.severity === "CRITICAL" ? "rgba(255,51,102,0.08)" : "rgba(255,184,48,0.07)",
              border: `1px solid ${a.severity === "CRITICAL" ? "rgba(255,51,102,0.3)" : "rgba(255,184,48,0.2)"}`,
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{a.severity === "CRITICAL" ? "🚨" : "⚠️"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13,
                  color: a.severity === "CRITICAL" ? "#ff3366" : "#ffb830" }}>
                  {a.severity} · {(a.metric ?? "").toUpperCase()} = {a.value}
                  {a.z_score && <span style={{ fontSize: 11, marginLeft: 6 }}>(z={a.z_score}σ)</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>
                  {a.msg} · Patient {a.patient_id} · {a.type === "z_score" ? "Trend anomaly" : "Threshold breach"}
                </div>
              </div>
              <button onClick={() => void ackAlert(a.id)}
                style={{ padding: "3px 10px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
                  color: "var(--t3)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                Ack
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Ward Capacity Strip ───────────────────────────────────────────
  const wardCapacityStrip = wardState.length > 0 ? (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 10 }}>Ward Capacity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
        {wardState.map((w: any) => (
          <div key={w.ward_id} style={{
            padding: "12px 14px", background: "rgba(8,18,42,0.6)",
            border: `1px solid ${w.pct >= 90 ? "rgba(255,51,102,0.3)" : w.pct >= 75 ? "rgba(255,184,48,0.25)" : "rgba(0,212,255,0.12)"}`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>{w.name}</div>
            <div style={{ fontWeight: 800, fontSize: 20,
              color: w.pct >= 90 ? "#ff3366" : w.pct >= 75 ? "#ffb830" : "#00e5a0" }}>
              {w.pct}%
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>{w.occupied}/{w.capacity} beds</div>
            <div style={{ marginTop: 6, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${w.pct}%`,
                background: w.pct >= 90 ? "#ff3366" : w.pct >= 75 ? "#ffb830" : "#00e5a0",
                transition: "width 0.6s ease" }} />
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="number"
                min={0}
                max={w.capacity}
                placeholder={`e.g. ${w.occupied}`}
                value={nurseCensusDraft[w.ward_id] ?? ""}
                onChange={(e) =>
                  setNurseCensusDraft((prev) => ({ ...prev, [w.ward_id]: e.target.value }))}
                style={{
                  width: 64, fontSize: 11, padding: "4px 6px", borderRadius: 6,
                  border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,0,0,0.25)",
                  color: "var(--t1)",
                }}
              />
              <button
                type="button"
                onClick={() => void (async () => {
                  const raw = (nurseCensusDraft[w.ward_id] ?? "").trim();
                  if (!raw) {
                    toast("Enter occupied bed count.");
                    return;
                  }
                  const occ = parseInt(raw, 10);
                  if (Number.isNaN(occ) || occ < 0 || occ > w.capacity) {
                    toast(`Occupied must be 0–${w.capacity}.`);
                    return;
                  }
                  try {
                    await api.aiWardCensusSnapshot(
                      w.ward_id,
                      { occupied: occ, source: "nurse_home_strip" },
                      "nurse",
                    );
                    toast(`Logged census · ${w.name}`);
                    setNurseCensusDraft((prev) => {
                      const next = { ...prev };
                      delete next[w.ward_id];
                      return next;
                    });
                    await refreshWardStrip(w.ward_id);
                  } catch {
                    toast("Could not log census.");
                  }
                })()}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,212,255,0.22)",
                  background: "rgba(0,212,255,0.08)", color: "var(--t2)", fontSize: 11, cursor: "pointer",
                }}
              >
                Log census
              </button>
            </div>
          </div>
        ))}
      </div>
      {wardForecast.length > 0 && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(8,18,42,0.5)",
          border: "1px solid rgba(0,212,255,0.10)", borderRadius: 10,
          opacity: forecastLoading ? 0.72 : 1, transition: "opacity 0.2s ease" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>
              48-h Bed Demand Forecast
              <span style={{ color: "var(--t2)", marginLeft: 6 }}>
                · {(wardState.find((w: any) => w.ward_id === forecastWardId) ?? wardState[0])?.name ?? "Ward"}
              </span>
              {forecastLoading && (
                <span style={{ marginLeft: 8, fontSize: 10, color: "#00d4ff" }}>Updating…</span>
              )}
            </div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--t2)",
              marginLeft: "auto",
            }}>
              <span style={{ color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ward</span>
              <select
                value={forecastWardId || wardState[0]?.ward_id || ""}
                onChange={(e) => void selectForecastWard(e.target.value)}
                disabled={forecastLoading || wardState.length === 0}
                style={{
                  minWidth: 140,
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,212,255,0.25)",
                  background: "rgba(0,0,0,0.35)",
                  color: "var(--t1)",
                  cursor: wardState.length ? "pointer" : "not-allowed",
                }}
              >
                {wardState.map((w: any) => (
                  <option key={w.ward_id} value={w.ward_id}>
                    {w.name} ({w.ward_id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 50 }}>
            {wardForecast.slice(0, 24).map((step: any, i: number) => (
              <div key={i} title={`${step.ts}: ${step.predicted}/${step.capacity} (${step.pct}%)`}
                style={{ flex: 1, height: `${step.pct}%`, minHeight: 2,
                  background: step.status === "CRITICAL" ? "#ff3366" : step.status === "WARNING" ? "#ffb830" : "#00e5a0",
                  borderRadius: "2px 2px 0 0", opacity: 0.8 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
            <span>Now</span><span>+12h</span><span>+24h</span>
          </div>
          {(() => {
            const meta = wardForecast[0]?.forecast_meta as Record<string, unknown> | undefined;
            const src = meta?.training_source as string | undefined;
            const line = src === "persisted_census"
              ? `Trainer: persisted census (${meta?.history_points ?? "—"} hourly snapshots)`
              : src === "synthetic_bootstrap"
                ? "Trainer: synthetic bootstrap"
                : (meta?.model as string | undefined) === "heuristic_diurnal_fallback"
                  ? "Trainer: heuristic fallback"
                  : meta?.model != null
                    ? `Trainer: ${String(meta.model)}`
                    : null;
            return line ? (
              <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 8, lineHeight: 1.4 }}>
                {line}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  ) : null;

  // ── Simulated Patients Table ──────────────────────────────────────
  const simPatientsTable = simPatients.length > 0 ? (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 10 }}>
        AI Patient Monitor · {simPatients.length} patients
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,212,255,0.12)" }}>
              {["Patient", "Ward", "Diagnosis", "NEWS2", "Risk", "Deteriorating"].map(h => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--t3)",
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {simPatients.slice(0, 10).map((p: any) => (
              <tr key={p.sim_id} style={{ borderBottom: "1px solid rgba(0,212,255,0.06)" }}>
                <td style={{ padding: "7px 10px", color: "var(--t1)", fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: "7px 10px", color: "var(--t2)" }}>{p.ward_id}</td>
                <td style={{ padding: "7px 10px", color: "var(--t2)" }}>{p.diagnosis}</td>
                <td style={{ padding: "7px 10px", fontWeight: 700,
                  color: p.news2_score >= 7 ? "#ff3366" : p.news2_score >= 5 ? "#ffb830" : "#00e5a0" }}>
                  {p.news2_score ?? "—"}
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                    background: p.news2_risk === "HIGH" ? "rgba(255,51,102,0.15)"
                      : p.news2_risk === "MEDIUM" ? "rgba(255,184,48,0.12)" : "rgba(0,229,160,0.10)",
                    color: p.news2_risk === "HIGH" ? "#ff3366"
                      : p.news2_risk === "MEDIUM" ? "#ffb830" : "#00e5a0",
                    border: `1px solid ${p.news2_risk === "HIGH" ? "rgba(255,51,102,0.3)"
                      : p.news2_risk === "MEDIUM" ? "rgba(255,184,48,0.25)" : "rgba(0,229,160,0.2)"}`,
                  }}>
                    {p.news2_risk}
                  </span>
                </td>
                <td style={{ padding: "7px 10px" }}>
                  {p.deteriorating
                    ? <span style={{ color: "#ff3366", fontWeight: 700, fontSize: 11 }}>↓ Deteriorating</span>
                    : <span style={{ color: "#00e5a0", fontSize: 11 }}>Stable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;


  const [showWalkin, setShowWalkin] = useState(false);
  const [walkinBusy, setWalkinBusy] = useState(false);
  const [walkinForm, setWalkinForm] = useState<{
    facility_id: string;
    full_name: string;
    phone: string;
    dob: string;
    gender: string;
    national_id: string;
    mrn: string;
    chief_complaint: string;
    triage_level: string;
  }>({
    facility_id: "FAC-0001",
    full_name: "",
    phone: "",
    dob: "",
    gender: "female",
    national_id: "",
    mrn: "",
    chief_complaint: "",
    triage_level: "Orange",
  });
  const [walkinMatches, setWalkinMatches] = useState<{ uhid: string; score: number; reason: string }[] | null>(null);
  const [lastCreated, setLastCreated] = useState<{ uhid: string; walkinId: string; aliases: any[] } | null>(null);

  const liveWalkins = usePolling(
    () => api.walkinsList({ limit: 30, facility_id: walkinForm.facility_id || undefined }),
    { intervalMs: 8000 },
  );

  const uiAction = async (label: string, extra?: Record<string, unknown>) => {
    try {
      await api.uiAction({ role: "nurse", page, label, ...extra });
    } catch (e) {
      // Keep the UX clean even if the API is offline.
    }
    toast(label);
  };

  const submitWalkin = async (chosenUhid?: string) => {
    setWalkinBusy(true);
    try {
      const res = await api.walkinCreate({
        ...walkinForm,
        uhid: chosenUhid,
      });
      const candidates = res.correlation?.candidates ?? [];
      const action = res.correlation?.action ?? "";
      if (action !== "created_new" && candidates.length > 0 && !chosenUhid) {
        // Present candidates to the nurse to choose from
        setWalkinMatches(candidates);
      } else {
        setWalkinMatches(null);
        setShowWalkin(false);
        setLastCreated({
          uhid: res.patient?.uhid ?? "",
          walkinId: res.walkin?.id ?? "",
          aliases: res.aliases ?? [],
        });
        setWalkinForm((s) => ({ ...s, full_name: "", phone: "", dob: "", national_id: "", mrn: "", chief_complaint: "" }));
      }
      void uiAction("Walk-in registered.", {
        walkin_id: res.walkin?.id,
        uhid: res.patient?.uhid,
        correlation_action: action,
      });
      toast(`Walk-in: ${action === "created_new" ? "New patient — " : "Linked — "}${res.patient?.uhid ?? "UHID"}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Walk-in failed — is the API running?");
    } finally {
      setWalkinBusy(false);
    }
  };

  const [showTask, setShowTask] = useState(false);
  const [taskForm, setTaskForm] = useState<{ patient_id: string; title: string; due: string }>({ patient_id: patientId, title: "", due: "" });

  const [showFluid, setShowFluid] = useState(false);
  const [fluidForm, setFluidForm] = useState<{ patient_id: string; type: "intake" | "output"; route: string; volume_ml: string; notes: string }>({
    patient_id: patientId,
    type: "intake",
    route: "IV",
    volume_ml: "",
    notes: "",
  });

  const [showWound, setShowWound] = useState(false);
  const [woundForm, setWoundForm] = useState<{ patient_id: string; site: string; wound_type: string; dressing: string; notes: string }>({
    patient_id: patientId,
    site: "",
    wound_type: "Post-op",
    dressing: "",
    notes: "",
  });

  const [showHandover, setShowHandover] = useState(false);
  const [handoverForm, setHandoverForm] = useState<{ ward: string; shift: string; author: string; summary: string; special_attention: string; signed: boolean }>({
    ward: "4B",
    shift: "07:00–15:00",
    author: "Nurse Atieno",
    summary: "Ward 4B — 12 patients stable except Bed 01 (critical K⁺). ECG continuous.",
    special_attention: "BED 01: K⁺ repeat due at 13:00. Strict fluid restriction 1.5L.",
    signed: true,
  });

  const [showSupply, setShowSupply] = useState(false);
  const [supplyForm, setSupplyForm] = useState<{ ward: string; item: string; qty: string; priority: string; notes: string }>({
    ward: "4B",
    item: "",
    qty: "10",
    priority: "Routine",
    notes: "",
  });
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryItem, setInventoryItem] = useState<{ name: string; category: string; inStock: string; min: string }>({
    name: "",
    category: "",
    inStock: "",
    min: "",
  });

  const [showIncident, setShowIncident] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<string | null>(null);
  const incidentsPoll = usePolling(() => api.nurseIncidents(100), { intervalMs: 5000 });
  const [incidentForm, setIncidentForm] = useState<{
    type: string;
    severity: string;
    patient_id: string;
    notes: string;
    status: string;
  }>({
    type: "Patient fall",
    severity: "Moderate",
    patient_id: patientId,
    notes: "",
    status: "Under Review",
  });

  const openIncidentModal = (row?: Record<string, unknown>) => {
    if (row) {
      setEditingIncidentId(String(row.id ?? ""));
      setIncidentForm({
        type: String(row.type ?? "Patient fall"),
        severity: String(row.severity ?? "Moderate"),
        patient_id: String(row.patient_id ?? patientId),
        notes: String(row.notes ?? ""),
        status: String(row.status ?? "Under Review"),
      });
    } else {
      setEditingIncidentId(null);
      setIncidentForm({
        type: "Patient fall",
        severity: "Moderate",
        patient_id: patientId,
        notes: "",
        status: "Under Review",
      });
    }
    setShowIncident(true);
  };

  const [vitalsForm, setVitalsForm] = useState<{
    patient_id: string;
    bp: string;
    hr: string;
    temp: string;
    spo2: string;
    rr: string;
    glucose: string;
    avpu: string;
    pain: string;
    notes: string;
  }>({
    patient_id: patientId,
    bp: "",
    hr: "",
    temp: "",
    spo2: "",
    rr: "",
    glucose: "",
    avpu: "A",
    pain: "0",
    notes: "",
  });
  const [activeVital, setActiveVital] = useState<string | null>(null);

  useEffect(() => {
    setVitalsForm((s) => (s.patient_id === patientId ? s : { ...s, patient_id: patientId }));
  }, [patientId]);

  const nursePatientGender = useMemo((): "male" | "female" => {
    const g = (summary.data?.patient.gender ?? "").toLowerCase();
    return g.startsWith("f") ? "female" : "male";
  }, [summary.data?.patient.gender]);

  const nurseFigureVitals = useMemo(() => {
    const formByKey: Record<string, string> = {
      bp: vitalsForm.bp,
      hr: vitalsForm.hr,
      rr: vitalsForm.rr,
      temp: vitalsForm.temp,
      spo2: vitalsForm.spo2,
      glucose: vitalsForm.glucose,
      pain: vitalsForm.pain,
      avpu: vitalsForm.avpu,
    };
    return NURSE_VITALS_CATALOG.map((v) => {
      const formVal = formByKey[v.key]?.trim() ?? "";
      const fromObs = (obs.data ?? []).find((o) => obsCodeMatches(o.code, v.match));
      return {
        key: v.key,
        label: v.label,
        icon: v.icon,
        unit: v.unit,
        range: v.range,
        value: formVal || fromObs?.value_text || null,
        measuredAt: fromObs?.effective_time ?? null,
      };
    });
  }, [obs.data, vitalsForm]);

  const triageRows = useMemo(
    () => [
      {
        priTone: "r" as const,
        dot: "red" as const,
        priLabel: "Immediate",
        name: "James Otieno",
        id: "AFL-45678901",
        fhirId: "P003",
        cc: "Chest pain, SOB, diaphoresis",
        time: "11:42",
        wait: "8 min",
        nurse: "Nurse Atieno",
        primary: true,
      },
      {
        priTone: "am" as const,
        dot: "orange" as const,
        priLabel: "Urgent",
        name: "Mary Kamau",
        id: "AFL-56789012",
        fhirId: "P004",
        cc: "Severe abdominal pain, fever 39.5°C",
        time: "11:35",
        wait: "15 min",
        nurse: "Nurse Atieno",
        primary: true,
      },
      {
        priTone: "am" as const,
        dot: "yellow" as const,
        priLabel: "Semi-urgent",
        name: "Ali Hassan",
        id: "AFL-67890123",
        fhirId: "P005",
        cc: "Head injury — minor, GCS 15",
        time: "11:20",
        wait: "28 min",
        nurse: "Nurse Osei",
        primary: false,
      },
      {
        priTone: "g" as const,
        dot: "green" as const,
        priLabel: "Non-urgent",
        name: "Samuel Wanjohi",
        id: "AFL-78901234",
        fhirId: "P006",
        cc: "Cough & cold, 3 days",
        time: "11:05",
        wait: "43 min",
        nurse: "Nurse Osei",
        primary: false,
      },
    ],
    []
  );

  const wardPatients = useMemo(
    () => [
      { bed: "01", name: "Wangui Njoroge", id: "AFL-78841209", fhirId: "P001", dx: "AKI / hyperkalaemia", tag: "r" as const, tagL: "Critical" },
      { bed: "02", name: "Omar Abdullahi", id: "AFL-87654321", fhirId: "P002", dx: "Post-op abdomen", tag: "b" as const, tagL: "Surgical" },
      { bed: "04", name: "Adhiambo Grace", id: "AFL-11223344", fhirId: "P003", dx: "Meningitis query", tag: "am" as const, tagL: "Neuro obs" },
      { bed: "07", name: "Fatuma Ali", id: "AFL-55667788", fhirId: "P004", dx: "Sepsis — IV abx", tag: "am" as const, tagL: "Antibiotics" },
      { bed: "10", name: "Mary Kamau", id: "AFL-56789012", fhirId: "P005", dx: "Cellulitis", tag: "g" as const, tagL: "Stable" },
    ],
    []
  );

  const pendingTasks = useMemo(
    () => [
      { t: "30-min vitals — Bed 01 (NEWS2)", due: "Due now", tone: "r" as const },
      { t: "IV bag change — Bed 07", due: "14:00", tone: "am" as const },
      { t: "Dressing — Bed 02 (Omar)", due: "14:00", tone: "am" as const },
      { t: "Insulin scale — Bed 07", due: "12:00", tone: "am" as const },
      { t: "CSF result check — Bed 04", due: "Today", tone: "b" as const },
    ],
    []
  );

  const doneTasks = useMemo(
    () => [
      "08:00 — Morning drug round complete",
      "09:30 — Fluid chart updated (Beds 01–06)",
      "10:15 — Wound review Bed 11",
    ],
    []
  );

  return (
    <DashboardShell
      shellVariant="nurse"
      title={NURSE_TITLES[page]}
      crumb={NURSE_CRUMBS[page]}
      portalSubtitle="Nurse Station"
      userInitials="AM"
      userName="Nurse Atieno"
      userEmail="n.atieno@knh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as NursePage)}
      topbarSearchPlaceholder="Search patients, beds, tasks…"
      topbarSearchValue={searchQuery}
      onTopbarSearchChange={(v) => setSearchQuery(v)}
      onTopbarSearchFocus={() => {
        // make search feel “alive” by taking you to the patient list
        if (page !== "patients") setPage("patients");
      }}
      onTopbarSearchKeyDown={(e) => {
        if (e.key !== "Enter") return;
        setPage("patients");
        const q = searchQuery.trim();
        toast(q ? `Filtering patient list for “${q}”.` : "Opening patient list.");
      }}
      onTopbarNotificationsClick={() => {
        setPage("incidents");
        toast("Opening notifications → Incidents.");
      }}
      onTopbarStatusClick={() => {
        setPage("home");
        toast("UniHealth Live Status: Online · last sync < 1 min · gateway polling active.");
      }}
      nav={[
        {
          label: "Ward",
          items: [
            { id: "home", icon: "🏠", label: "Shift Overview" },
            { id: "patients", icon: "🧑‍⚕️", label: "My Patients", badge: { text: "12", tone: "green" } },
            { id: "chart", icon: "🗂️", label: "Patient Chart", badge: { text: patientId, tone: "amber" } },
            { id: "triage", icon: "🚑", label: "Triage Queue", badge: { text: "3", tone: "red" } },
            { id: "vitals", icon: "💗", label: "Record Vitals", badge: { text: "4", tone: "amber" } },
            { id: "mar", icon: "💊", label: "MAR" },
            { id: "tasks", icon: "✅", label: "Tasks", badge: { text: "5", tone: "amber" } },
            { id: "handover", icon: "📝", label: "Handover" },
          ],
        },
        {
          label: "More",
          items: [
            { id: "fluids", icon: "💧", label: "Fluid Balance" },
            { id: "wounds", icon: "🩹", label: "Wound Care" },
            { id: "incidents", icon: "⚠️", label: "Incidents" },
            { id: "esign", icon: "✍️", label: "E-Signatures" },
            { id: "supplies", icon: "📦", label: "Supplies" },
          ],
        },
      ]}
    >
      <div className="nurse">
        {(showTask || showFluid || showWound || showHandover || showSupply || showInventory) && (
          <div
            role="presentation"
            onClick={() => {
              setShowTask(false);
              setShowFluid(false);
              setShowWound(false);
              setShowHandover(false);
              setShowSupply(false);
              setShowInventory(false);
            }}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.38)", zIndex: 999 }}
          />
        )}

        {showTask && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(760px, calc(100vw - 28px))",
              background: "#fff",
              border: "1.5px solid var(--bdr)",
              borderRadius: 14,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(2,6,23,.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Create task</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowTask(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>Patient ID</label>
                  <input className="mono" value={taskForm.patient_id} onChange={(e) => setTaskForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>Due</label>
                  <input value={taskForm.due} onChange={(e) => setTaskForm((s) => ({ ...s, due: e.target.value }))} placeholder="e.g. 14:00 / Today" />
                </div>
              </div>
              <div className="ff">
                <label>Task</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))} placeholder="What needs doing?" />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-s" type="button" onClick={() => setShowTask(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={async () => {
                    try {
                      const pid = taskForm.patient_id.trim() || patientId;
                      const title = taskForm.title.trim();
                      if (!title) {
                        toast("Task title is required.");
                        return;
                      }
                      const res = await api.nurseTaskCreate({ patient_id: pid, title, due: taskForm.due.trim() || "Today" });
                      setShowTask(false);
                      toast(`Task created (${res.id ?? "ok"}).`);
                    } catch (e) {
                      toast(`Task create failed: ${String(e)}`);
                    }
                  }}
                >
                  Create task
                </button>
              </div>
            </div>
          </div>
        )}

        {showFluid && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(760px, calc(100vw - 28px))",
              background: "#fff",
              border: "1.5px solid var(--bdr)",
              borderRadius: 14,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(2,6,23,.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Record fluid entry</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowFluid(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>Patient ID</label>
                  <input className="mono" value={fluidForm.patient_id} onChange={(e) => setFluidForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>Type</label>
                  <select value={fluidForm.type} onChange={(e) => setFluidForm((s) => ({ ...s, type: e.target.value as any }))}>
                    <option value="intake">Intake</option>
                    <option value="output">Output</option>
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Route</label>
                  <input value={fluidForm.route} onChange={(e) => setFluidForm((s) => ({ ...s, route: e.target.value }))} placeholder="IV / PO / Catheter…" />
                </div>
                <div className="ff">
                  <label>Volume (ml)</label>
                  <input value={fluidForm.volume_ml} onChange={(e) => setFluidForm((s) => ({ ...s, volume_ml: e.target.value }))} type="number" placeholder="500" />
                </div>
              </div>
              <div className="ff">
                <label>Notes</label>
                <input value={fluidForm.notes} onChange={(e) => setFluidForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Optional" />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-s" type="button" onClick={() => setShowFluid(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={async () => {
                    try {
                      const pid = fluidForm.patient_id.trim() || patientId;
                      const vol = Number(fluidForm.volume_ml);
                      if (!Number.isFinite(vol) || vol <= 0) {
                        toast("Volume must be a positive number.");
                        return;
                      }
                      const res = await api.nurseFluidCreate({
                        patient_id: pid,
                        type: fluidForm.type,
                        route: fluidForm.route.trim(),
                        volume_ml: vol,
                        notes: fluidForm.notes.trim(),
                      });
                      setShowFluid(false);
                      toast(`Fluid entry saved (${res.id ?? "ok"}).`);
                    } catch (e) {
                      toast(`Fluid entry failed: ${String(e)}`);
                    }
                  }}
                >
                  Save entry
                </button>
              </div>
            </div>
          </div>
        )}

        {showWound && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(760px, calc(100vw - 28px))",
              background: "#fff",
              border: "1.5px solid var(--bdr)",
              borderRadius: 14,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(2,6,23,.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Record wound/dressing</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowWound(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>Patient ID</label>
                  <input className="mono" value={woundForm.patient_id} onChange={(e) => setWoundForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>Site</label>
                  <input value={woundForm.site} onChange={(e) => setWoundForm((s) => ({ ...s, site: e.target.value }))} placeholder="e.g. Abdomen / L) leg" />
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Type</label>
                  <select value={woundForm.wound_type} onChange={(e) => setWoundForm((s) => ({ ...s, wound_type: e.target.value }))}>
                    <option>Post-op</option>
                    <option>Traumatic</option>
                    <option>Pressure injury</option>
                    <option>Diabetic foot</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Dressing</label>
                  <input value={woundForm.dressing} onChange={(e) => setWoundForm((s) => ({ ...s, dressing: e.target.value }))} placeholder="e.g. Non-adherent + iodine" />
                </div>
              </div>
              <div className="ff">
                <label>Notes</label>
                <textarea value={woundForm.notes} onChange={(e) => setWoundForm((s) => ({ ...s, notes: e.target.value }))} style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-s" type="button" onClick={() => setShowWound(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={async () => {
                    try {
                      const pid = woundForm.patient_id.trim() || patientId;
                      if (!woundForm.site.trim() || !woundForm.dressing.trim()) {
                        toast("Site and dressing are required.");
                        return;
                      }
                      const res = await api.nurseWoundCreate({
                        patient_id: pid,
                        site: woundForm.site.trim(),
                        wound_type: woundForm.wound_type,
                        dressing: woundForm.dressing.trim(),
                        notes: woundForm.notes.trim(),
                      });
                      setShowWound(false);
                      toast(`Wound entry saved (${res.id ?? "ok"}).`);
                    } catch (e) {
                      toast(`Wound entry failed: ${String(e)}`);
                    }
                  }}
                >
                  Save entry
                </button>
              </div>
            </div>
          </div>
        )}

        {showHandover && (
          <>
            <div
              role="presentation"
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 998 }}
              onClick={() => setShowHandover(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Sign handover"
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: "min(820px, calc(100vw - 24px))",
                maxHeight: "calc(100vh - 32px)",
                background: "rgba(4,14,34,0.98)",
                border: "1px solid rgba(0,210,255,0.20)",
                borderRadius: 18,
                zIndex: 1000,
                boxShadow: "0 32px 100px rgba(0,0,0,0.80), 0 0 40px rgba(0,210,255,0.06)",
                backdropFilter: "blur(18px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,210,255,0.10)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,77,133,0.16)", border: "1px solid rgba(255,77,133,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  📝
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#ddf0ff", fontSize: 14 }}>Sign & Submit Shift Handover</div>
                  <div style={{ fontSize: 11, color: "rgba(0,210,255,0.55)", marginTop: 2 }}>SBAR format · Ward 4B · {handoverForm.shift}</div>
                </div>
                <button className="btn-s btn-sm" type="button" onClick={() => setShowHandover(false)}>✕ Close</button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* S — Situation */}
                <div style={{ padding: 14, background: "rgba(255,77,133,0.07)", border: "1px solid rgba(255,77,133,0.18)", borderRadius: 12 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "rgba(255,77,133,0.70)", marginBottom: 10, fontWeight: 800 }}>S — SITUATION</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="ff">
                      <label>Ward</label>
                      <input value={handoverForm.ward} onChange={(e) => setHandoverForm((s) => ({ ...s, ward: e.target.value }))} />
                    </div>
                    <div className="ff">
                      <label>Shift period</label>
                      <input value={handoverForm.shift} onChange={(e) => setHandoverForm((s) => ({ ...s, shift: e.target.value }))} />
                    </div>
                  </div>
                  <div className="ff">
                    <label>Handing-over nurse</label>
                    <input value={handoverForm.author} onChange={(e) => setHandoverForm((s) => ({ ...s, author: e.target.value }))} />
                  </div>
                </div>

                {/* B — Background */}
                <div style={{ padding: 14, background: "rgba(0,210,255,0.05)", border: "1px solid rgba(0,210,255,0.13)", borderRadius: 12 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "rgba(0,210,255,0.55)", marginBottom: 10, fontWeight: 800 }}>B — BACKGROUND · WARD SUMMARY</div>
                  <div className="ff">
                    <label>Ward summary</label>
                    <textarea value={handoverForm.summary} onChange={(e) => setHandoverForm((s) => ({ ...s, summary: e.target.value }))} style={{ minHeight: 80 }} />
                  </div>
                </div>

                {/* A+R — Assessment & Recommendation */}
                <div style={{ padding: 14, background: "rgba(255,184,48,0.06)", border: "1px solid rgba(255,184,48,0.16)", borderRadius: 12 }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "rgba(255,184,48,0.65)", marginBottom: 10, fontWeight: 800 }}>A+R — ASSESSMENT & SPECIAL ATTENTION</div>
                  <div className="ff">
                    <label>Patients requiring special attention</label>
                    <textarea value={handoverForm.special_attention} onChange={(e) => setHandoverForm((s) => ({ ...s, special_attention: e.target.value }))} style={{ minHeight: 80 }} />
                  </div>
                </div>

                {/* Signature */}
                <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="checkbox"
                    id="ho-signed"
                    checked={handoverForm.signed}
                    onChange={(e) => setHandoverForm((s) => ({ ...s, signed: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "#00e5a0", flexShrink: 0 }}
                  />
                  <label htmlFor="ho-signed" style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", cursor: "pointer", fontWeight: 600 }}>
                    I, <strong style={{ color: "#ddf0ff" }}>{handoverForm.author}</strong>, confirm this handover is accurate and complete per NCC/NCK guidelines.
                  </label>
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(0,210,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
                <button className="btn-s" type="button" onClick={() => setShowHandover(false)}>Cancel</button>
                <button
                  className="btn-p"
                  type="button"
                  disabled={!handoverForm.signed}
                  style={{ opacity: handoverForm.signed ? 1 : 0.5 }}
                  onClick={async () => {
                    try {
                      const res = await api.nurseHandoverSubmit(handoverForm);
                      setShowHandover(false);
                      toast(`✓ Handover signed & submitted (ref: ${res.id ?? "ok"}).`);
                    } catch (e) {
                      toast(`Handover submit failed: ${String(e)}`);
                    }
                  }}
                >
                  ✍ Sign & Submit Handover
                </button>
              </div>
            </div>
          </>
        )}

        {showSupply && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(760px, calc(100vw - 28px))",
              background: "#fff",
              border: "1.5px solid var(--bdr)",
              borderRadius: 14,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(2,6,23,.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Request supplies</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowSupply(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>Ward</label>
                  <input value={supplyForm.ward} onChange={(e) => setSupplyForm((s) => ({ ...s, ward: e.target.value }))} placeholder="e.g. 4B" />
                </div>
                <div className="ff">
                  <label>Priority</label>
                  <select value={supplyForm.priority} onChange={(e) => setSupplyForm((s) => ({ ...s, priority: e.target.value }))}>
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Item</label>
                  <input value={supplyForm.item} onChange={(e) => setSupplyForm((s) => ({ ...s, item: e.target.value }))} placeholder="Item name" />
                </div>
                <div className="ff">
                  <label>Quantity</label>
                  <input value={supplyForm.qty} onChange={(e) => setSupplyForm((s) => ({ ...s, qty: e.target.value }))} type="number" min={1} placeholder="10" />
                </div>
              </div>
              <div className="ff">
                <label>Notes</label>
                <textarea value={supplyForm.notes} onChange={(e) => setSupplyForm((s) => ({ ...s, notes: e.target.value }))} style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-s" type="button" onClick={() => setShowSupply(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={async () => {
                    try {
                      const item = supplyForm.item.trim();
                      const qty = Number(supplyForm.qty);
                      if (!item) {
                        toast("Please enter an item name.");
                        return;
                      }
                      if (!Number.isFinite(qty) || qty <= 0) {
                        toast("Quantity must be a positive number.");
                        return;
                      }
                      const res = await api.nurseSupplyRequest({
                        ward: supplyForm.ward.trim() || "4B",
                        item,
                        qty,
                        priority: supplyForm.priority,
                        notes: supplyForm.notes.trim(),
                      });
                      setShowSupply(false);
                      toast(`Supply request submitted (${res.id ?? "created"}).`);
                    } catch (e) {
                      toast(`Supply request failed: ${String(e)}`);
                    }
                  }}
                >
                  Submit request
                </button>
              </div>
            </div>
          </div>
        )}

        {showInventory && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(680px, calc(100vw - 28px))",
              background: "#fff",
              border: "1.5px solid var(--bdr)",
              borderRadius: 14,
              zIndex: 1000,
              boxShadow: "0 20px 60px rgba(2,6,23,.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bdr)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Inventory item</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowInventory(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16, color: "var(--t2)", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 950, color: "var(--t1)", marginBottom: 6 }}>{inventoryItem.name || "Item"}</div>
              <div>
                <strong>Category:</strong> {inventoryItem.category || "—"}
              </div>
              <div>
                <strong>In stock:</strong> {inventoryItem.inStock || "—"}
              </div>
              <div>
                <strong>Minimum level:</strong> {inventoryItem.min || "—"}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button
                  className="btn-p"
                  type="button"
                  onClick={() => {
                    setSupplyForm((s) => ({ ...s, item: inventoryItem.name || s.item }));
                    setShowInventory(false);
                    setShowSupply(true);
                  }}
                >
                  Request more →
                </button>
              </div>
            </div>
          </div>
        )}

        <FormModal
          open={showIncident}
          title={editingIncidentId ? "Edit incident" : "Report incident"}
          subtitle="Safety reports are stored in the nurse incidents API."
          onClose={() => {
            setShowIncident(false);
            setEditingIncidentId(null);
          }}
          footer={
            <>
              <button
                className="btn-s"
                type="button"
                onClick={() => {
                  setShowIncident(false);
                  setEditingIncidentId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={async () => {
                  try {
                    const pid = incidentForm.patient_id.trim() || patientId;
                    const body = {
                      patient_id: pid,
                      type: incidentForm.type,
                      severity: incidentForm.severity,
                      notes: incidentForm.notes.trim(),
                      status: incidentForm.status,
                    };
                    if (editingIncidentId) {
                      await api.nurseIncidentUpdate(editingIncidentId, body);
                      toast("Incident updated.");
                    } else {
                      const res = await api.nurseIncident(body);
                      toast(`Incident submitted (${res.id ?? "created"}).`);
                    }
                    setShowIncident(false);
                    setEditingIncidentId(null);
                    incidentsPoll.refresh();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Save failed");
                  }
                }}
              >
                {editingIncidentId ? "Save changes" : "Submit incident"}
              </button>
            </>
          }
        >
          <div className="g2">
            <div className="ff">
              <label>Patient ID</label>
              <input
                className="mono"
                value={incidentForm.patient_id}
                onChange={(e) => setIncidentForm((s) => ({ ...s, patient_id: e.target.value }))}
                placeholder="e.g. P001"
              />
            </div>
            <div className="ff">
              <label>Severity</label>
              <select value={incidentForm.severity} onChange={(e) => setIncidentForm((s) => ({ ...s, severity: e.target.value }))}>
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
          </div>
          <div className="g2">
            <div className="ff">
              <label>Incident type</label>
              <select value={incidentForm.type} onChange={(e) => setIncidentForm((s) => ({ ...s, type: e.target.value }))}>
                <option>Patient fall</option>
                <option>Near-miss — medication</option>
                <option>Equipment failure</option>
                <option>Needlestick injury</option>
                <option>Security</option>
              </select>
            </div>
            <div className="ff">
              <label>Status</label>
              <select value={incidentForm.status} onChange={(e) => setIncidentForm((s) => ({ ...s, status: e.target.value }))}>
                <option>Under Review</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </div>
          </div>
          <div className="ff">
            <label>Notes</label>
            <textarea
              value={incidentForm.notes}
              onChange={(e) => setIncidentForm((s) => ({ ...s, notes: e.target.value }))}
              style={{ minHeight: 90 }}
            />
          </div>
        </FormModal>

        <div className={pgOn(page === "home")} id="pg-home">
          <div className="ph">
            <div>
              <div className="ph-ey">Morning Shift · Ward 4B</div>
              <div className="ph-ti">Good morning, Nurse Atieno 🩺</div>
              <div className="ph-su">
                07:00–15:00 · <strong>12 patients</strong> assigned · <strong>5 tasks pending</strong> · <strong>4 vitals due</strong>
              </div>
            </div>
            <div className="ph-r">
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("handover")}>
                📋 Handover Notes
              </button>
              <button className="btn-vitals" type="button" onClick={() => setPage("vitals")}>
                💗 Record Vitals
              </button>
            </div>
          </div>

          <div className="sync-bar">
            <span style={{ fontSize: 16 }}>🟢</span>
            <span>
              UniHealth Sync: <strong>Online</strong> · Last sync 47s ago · FHIR events: 312 queued · Data integrity: verified · IndexedDB: ready
              for offline
            </span>
            <button type="button" onClick={() => {
              obs.refresh(); summary.refresh(); meds.refresh(); supplyRequests.refresh();
              void uiAction("Manual UniHealth sync requested.");
            }}>
              Sync Now
            </button>
          </div>

          {/* Phase 3: Live Alerts + Ward Capacity */}
          {aiAlertsRail}
          <AiRiskScorePanel
            riskScore={riskScore}
            riskLoading={riskLoading}
            onRefresh={() => void fetchRiskScore()}
            variant="nurse"
          />
          {wardCapacityStrip}
          {simPatientsTable}

          <div className="ai-widget teal" style={{ animationDelay: ".08s" }}>
            <div className="ai-widget-hd">
              <div>
                <div className="ai-widget-ti">🤖 AI Early Warning Score (NEWS2)</div>
                <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 3, fontWeight: 650 }}>
                  Automated vital-sign analysis · Real-time risk escalation
                </div>
              </div>
              <button
                type="button"
                className="btn-s btn-sm"
                style={{
                  borderColor: "rgba(13,148,136,.3)",
                  color: "#0f766e",
                }}
                onClick={async () => {
                  try {
                    const res = await api.nurseIncident({
                      category: "news2_escalate_batch",
                      ward: "Ward 4B",
                      scope: "ews_widget_home",
                    });
                    toast(`Escalation batch logged (${res.id ?? "ok"}).`);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Escalation request failed.");
                  }
                }}
              >
                Escalate All →
              </button>
            </div>
            <div className="ai-row">
              <span className="ai-row-ico">🔴</span>
              <div className="ai-row-body">
                <div className="ai-row-ti">
                  Bed 01 — Wangui Njoroge &nbsp;<span className="ews-badge ews-high">NEWS2: 7 — HIGH</span>
                </div>
                <div className="ai-row-su">
                  AI alert: RR 24, SpO₂ 91%, HR 118. Deterioration trend over 2h. <strong>Immediate medical review required.</strong> Consider ICU
                  escalation.
                </div>
              </div>
              <span className="ai-pri crit">ESCALATE</span>
            </div>
            <div className="ai-row">
              <span className="ai-row-ico">🟡</span>
              <div className="ai-row-body">
                <div className="ai-row-ti">
                  Bed 04 — Adhiambo Grace &nbsp;<span className="ews-badge ews-med">NEWS2: 4 — MEDIUM</span>
                </div>
                <div className="ai-row-su">
                  BP rising trend (158/96 → 166/102 over 3h). AI recommends 30-minute vital checks and inform doctor if BP ≥170 systolic.
                </div>
              </div>
              <span className="ai-pri high">MONITOR</span>
            </div>
            <div className="ai-row">
              <span className="ai-row-ico">🟢</span>
              <div className="ai-row-body">
                <div className="ai-row-ti">
                  Remaining 10 patients &nbsp;<span className="ews-badge ews-0">NEWS2: 0–2 — LOW</span>
                </div>
                <div className="ai-row-su">
                  All other patients stable. AI predicts no deterioration risk in next 4 hours. Continue 4-hourly vital checks per protocol.
                </div>
              </div>
              <span className="ai-pri med">STABLE</span>
            </div>
            <div className="audit-notice">⛓️ All NEWS2 scores logged to FHIR · Escalations recorded in append-only shift audit trail</div>
          </div>

          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="kpi" style={{ animationDelay: ".03s", borderTop: "3px solid var(--ro)" }}>
              <div className="kpi-e">🛏️</div>
              <div className="kpi-v">12</div>
              <div className="kpi-l">My Patients</div>
              <div className="kpi-su">Ward 4B assigned</div>
            </div>
            <div className="kpi" style={{ animationDelay: ".06s", borderTop: "3px solid var(--r)" }}>
              <div className="kpi-e">🚨</div>
              <div className="kpi-v" style={{ color: "var(--r)" }}>
                2
              </div>
              <div className="kpi-l">Critical Alerts</div>
              <div className="kpi-su">Bed 01, Bed 04</div>
            </div>
            <div className="kpi" style={{ animationDelay: ".09s", borderTop: "3px solid var(--am)" }}>
              <div className="kpi-e">⏰</div>
              <div className="kpi-v" style={{ color: "var(--am)" }}>
                5
              </div>
              <div className="kpi-l">Pending Tasks</div>
              <div className="kpi-su">3 vitals · 2 meds due</div>
            </div>
            <div className="kpi" style={{ animationDelay: ".12s", borderTop: "3px solid var(--g)" }}>
              <div className="kpi-e">✅</div>
              <div className="kpi-v" style={{ color: "var(--g)" }}>
                18
              </div>
              <div className="kpi-l">Completed Today</div>
              <div className="kpi-su">Since shift start</div>
            </div>
          </div>

          <div className="notice r notice-critical-anim">
            <span className="notice-e">🚨</span>
            <div className="notice-tx">
              <strong>CRITICAL — Bed 01 (Wangui Njoroge):</strong> K⁺ 6.8 mmol/L. Dr. Mutuku has been notified. Please ensure IV Calcium Gluconate is
              prepared and administer per order. <strong>ECG monitoring must be continuous.</strong>
            </div>
          </div>

          <div className="gcol2">
            <div>
              <div className="panel" style={{ marginBottom: 14 }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">My Patients — Ward 4B</div>
                    <div className="pnl-su">12 assigned this shift</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("patients")}>
                    All patients →
                  </span>
                </div>
                <div className="pnl-bd">
                  {wardPatients.slice(0, 4).map((p) => (
                    <div key={p.id} className="pt-row" role="button" tabIndex={0} onClick={() => setPage("patients")}>
                      <div className="pt-av">{initialsFromName(p.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pt-name">
                          {p.name} · Bed {p.bed}
                        </div>
                        <div className="pt-det">{p.dx}</div>
                      </div>
                      <span className={`tag ${p.tag}`}>{p.tagL}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Shift Tasks</div>
                    <div className="pnl-su">5 pending · 18 complete</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("tasks")}>
                    All tasks →
                  </span>
                </div>
                <div className="pnl-bd">
                  {pendingTasks.slice(0, 4).map((t, i) => (
                    <div key={i} className="task">
                      <div className="task-cb" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="task-ti">{t.t}</div>
                        <div className="task-det">Ward 4B · Morning shift</div>
                      </div>
                      <span className={`tag ${t.tone}`}>{t.due}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="panel" style={{ marginBottom: 14 }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Medications Due</div>
                    <div className="pnl-su">Next 2 hours</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("mar")}>
                    Full MAR →
                  </span>
                </div>
                <div className="pnl-bd">
                  <div className="mar-row">
                    <div className="mar-drug" style={{ flex: 1 }}>
                      <div className="mar-name">Furosemide 40mg · Wangui (Bed 01)</div>
                      <div className="mar-detail">PO · Scheduled 12:00</div>
                    </div>
                    <div className="mar-times">
                      <span className="mar-time given">✓</span>
                      <span className="mar-time due">12</span>
                    </div>
                  </div>
                  <div className="mar-row">
                    <div className="mar-drug" style={{ flex: 1 }}>
                      <div className="mar-name">Insulin sliding scale · Fatuma (Bed 07)</div>
                      <div className="mar-detail">SC · Before lunch</div>
                    </div>
                    <div className="mar-times">
                      <span className="mar-time due">12</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 14 }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Vitals Due</div>
                    <div className="pnl-su">Scheduled observations</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("vitals")}>
                    Record →
                  </span>
                </div>
                <div className="pnl-bd">
                  <div className="vital-entry" onClick={() => setPage("vitals")} role="presentation">
                    <div className="ve-name">Bed 01 — Wangui Njoroge · NEWS2 round</div>
                    <div className="ve-time">Due now · 30-min frequency</div>
                    <div className="ve-vals">
                      <span className="ve-v">Last BP 166/102</span>
                      <span className="ve-v">SpO₂ 91%</span>
                    </div>
                  </div>
                  <div className="vital-entry" onClick={() => setPage("vitals")} role="presentation">
                    <div className="ve-name">Bed 04 — Adhiambo Grace · 4-hourly</div>
                    <div className="ve-time">Due 12:00</div>
                    <div className="ve-vals">
                      <span className="ve-v">Neuro obs q2h</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div className="pnl-ti">Quick Actions</div>
                </div>
                <div className="pnl-bd">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="btn-vitals" style={{ justifyContent: "center" }} type="button" onClick={() => setPage("vitals")}>
                      💗 Record Vitals
                    </button>
                    <button className="btn-pg" style={{ justifyContent: "center" }} type="button" onClick={() => setPage("mar")}>
                      💊 Give Medication
                    </button>
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button" onClick={() => setPage("fluids")}>
                      💧 Update Fluids
                    </button>
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button" onClick={() => setPage("incidents")}>
                      ⚠️ Report Incident
                    </button>
                    <button
                      className="btn-s"
                      style={{ justifyContent: "center" }}
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.nurseIncident({
                            category: "call_doctor",
                            patient_id: patientId,
                            ward: "Ward 4B",
                          });
                          toast(`Call doctor request logged (${res.id ?? "ok"}).`);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : "Request failed.");
                        }
                      }}
                    >
                      📞 Call Doctor
                    </button>
                    <button
                      className="btn-s"
                      style={{ justifyContent: "center" }}
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.nurseIncident({
                            category: "transfer_request",
                            patient_id: patientId,
                            ward: "Ward 4B",
                          });
                          toast(`Transfer request logged (${res.id ?? "ok"}).`);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : "Request failed.");
                        }
                      }}
                    >
                      🚑 Request Transfer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Live Observation Feed (Gateway)</div>
                <div className="pnl-su">Polling from `/observations` (patient ID below)</div>
              </div>
              <span className="pnl-lk" onClick={() => setPage("vitals")}>
                Record →
              </span>
            </div>
            <div className="pnl-bd">
              <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--t2)", marginBottom: 6 }}>Patient ID</div>
                  <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g. P001"
                    autoComplete="off"
                    className="mono"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1.5px solid var(--bdr)",
                      background: "var(--bg)",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 6, fontWeight: 650 }}>
                    Observation feed auto-refresh every 4 seconds.
                  </div>
                </div>
                <button className="btn-p btn-sm" type="button" onClick={() => setPage("triage")}>
                  Open triage →
                </button>
              </div>

              {obs.error && (
                <div className="errbanner is-visible" role="alert">
                  <span>⚠️</span>
                  <span>
                    {obs.error} (Try starting the API and using <code>P001</code>.)
                  </span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(obs.data ?? []).map((o) => (
                  <div
                    key={o.id}
                    style={{
                      border: "1.5px solid var(--bdr)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, color: "var(--t2)" }}>{o.code ?? "Observation"}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t2)", marginTop: 4, fontWeight: 700 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 900, color: "var(--gd)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 650 }}>No observations yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "patients")} id="pg-patients">
          <div className="ph">
            <div>
              <div className="ph-ey">Ward 4B</div>
              <div className="ph-ti">My Patients</div>
              <div className="ph-su">12 assigned · Morning Shift · Nurse Atieno</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={async () => {
                try {
                  const res = await api.nurseIncident({
                    category: "admit_request",
                    ward: "Ward 4B",
                    notes: "From My Patients header",
                  });
                  toast(`Admit request logged (${res.id ?? "ok"}).`);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Request failed.");
                }
              }}
            >
              + Admit Patient
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Patient List — Ward 4B</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Bed</th>
                    <th>Patient</th>
                    <th className="mono">AFL ID</th>
                    <th>Focus</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {wardPatients.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.bed}</td>
                      <td style={{ fontWeight: 800 }}>{p.name}</td>
                      <td className="mono">{p.id}</td>
                      <td>{p.dx}</td>
                      <td>
                        <span className={`tag ${p.tag}`}>{p.tagL}</span>
                      </td>
                      <td>
                        <button
                          className="btn-s btn-sm"
                          type="button"
                          onClick={() => {
                            setPatientId(p.fhirId);
                            setPage("chart");
                            toast(`Opened chart for ${p.name} (${p.fhirId}).`);
                          }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "chart")} id="pg-chart">
          <div className="ph">
            <div>
              <div className="ph-ey">Unified Patient Record</div>
              <div className="ph-ti">Patient Chart</div>
              <div className="ph-su">
                Linked to FHIR Patient ID <span className="mono">{patientId}</span> · Summary, encounters, vitals and medications
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. P001"
                autoComplete="off"
                className="mono"
                style={{
                  width: 150,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--bdr)",
                  background: "var(--bg)",
                  outline: "none",
                }}
              />
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("patients")}>
                ← Patient list
              </button>
              <button
                className="btn-s btn-sm"
                type="button"
                disabled={riskLoading}
                onClick={() => void fetchRiskScore()}
              >
                {riskLoading ? "Scoring…" : "📊 Risk"}
              </button>
              <button className="btn-p btn-sm" type="button" onClick={() => setPage("vitals")}>
                💗 Vitals
              </button>
              <button className="btn-pg btn-sm" type="button" onClick={() => setPage("mar")}>
                💊 MAR
              </button>
            </div>
          </div>

          <AiRiskScorePanel
            riskScore={riskScore}
            riskLoading={riskLoading}
            onRefresh={() => void fetchRiskScore()}
            variant="nurse"
          />

          {(summary.error || meds.error || obs.error) && (
            <div className="errbanner is-visible" role="alert" style={{ marginBottom: 14 }}>
              <span>⚠️</span>
              <span>
                {(summary.error || meds.error || obs.error) ?? "Unknown error"} (Ensure the API is running and the patient ID exists.)
              </span>
            </div>
          )}

          <div className="gcol3">
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Patient Summary</div>
                  <div className="pnl-su">From `/Patient/{patientId}/summary`</div>
                </div>
                <span className={`tag ${summary.loading ? "am" : "g"} dot`}>{summary.loading ? "LOADING" : "LIVE"}</span>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ border: "1.5px solid var(--bdr)", borderRadius: 10, padding: 12, background: "#fff" }}>
                    <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 950, letterSpacing: 0.2 }}>NAME</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "var(--t1)", marginTop: 4 }}>
                      {(summary.data?.patient.given_name ?? "—") + " " + (summary.data?.patient.family_name ?? "")}
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 4, fontWeight: 700 }}>
                      Patient ID: {summary.data?.patient.id ?? patientId}
                    </div>
                    {riskScore ? (
                      <div style={{ marginTop: 8 }}>
                        <span className={`risk-score ${riskBandClass(riskScore.risk_band)}`} style={{ fontSize: 11 }}>
                          {(riskScore.risk_band ?? "LOW").toUpperCase()} RISK
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ border: "1.5px solid var(--bdr)", borderRadius: 10, padding: 12, background: "#fff" }}>
                    <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 950, letterSpacing: 0.2 }}>DEMOGRAPHICS</div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--t2)", lineHeight: 1.65 }}>
                      <div>
                        <strong>NHI:</strong> {summary.data?.patient.nhi_number ?? "—"}
                      </div>
                      <div>
                        <strong>DOB:</strong> {summary.data?.patient.birth_date ?? "—"}
                      </div>
                      <div>
                        <strong>Gender:</strong> {summary.data?.patient.gender ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "var(--t2)", marginBottom: 8 }}>Recent encounters</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(summary.data?.encounters ?? []).slice(0, 5).map((e) => (
                      <div
                        key={e.id}
                        style={{
                          border: "1.5px solid var(--bdr)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: "#fff",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900, color: "var(--t2)" }}>{e.facility_name ?? "Facility"}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--t2)", marginTop: 5, fontWeight: 700 }}>
                            {e.period_start ?? "—"} {e.period_end ? `→ ${e.period_end}` : ""}
                          </div>
                        </div>
                        <span className="tag b">{e.status}</span>
                      </div>
                    ))}
                    {!summary.loading && (summary.data?.encounters?.length ?? 0) === 0 && (
                      <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 650 }}>No encounters returned for this patient.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Vitals / Observations</div>
                  <div className="pnl-su">From `/observations` (auto-refresh)</div>
                </div>
                <button className="btn-s btn-sm" type="button" onClick={() => setPage("vitals")}>
                  Record →
                </button>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(obs.data ?? []).slice(0, 12).map((o) => (
                    <div
                      key={o.id}
                      style={{
                        border: "1.5px solid var(--bdr)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: "var(--t2)" }}>{o.code ?? "Observation"}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--t2)", marginTop: 4, fontWeight: 700 }}>
                          {o.effective_time ?? "—"}
                        </div>
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 900, color: "var(--gd)" }}>
                        {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                      </div>
                    </div>
                  ))}
                  {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                    <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 650 }}>No observations for this patient.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Medications</div>
                  <div className="pnl-su">From `/medication-requests`</div>
                </div>
                <button className="btn-pg btn-sm" type="button" onClick={() => setPage("mar")}>
                  Open MAR →
                </button>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Medication</th>
                      <th>Status</th>
                      <th className="mono">Authored</th>
                      <th>Dosage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(meds.data ?? []).slice(0, 10).map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 800 }}>{m.medication_code ?? "Medication"}</td>
                        <td>
                          <span className={`tag ${m.status === "active" ? "g" : m.status === "draft" ? "am" : "b"}`}>{m.status ?? "unknown"}</span>
                        </td>
                        <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
                          {m.authored_on ?? "—"}
                        </td>
                        <td style={{ color: "var(--t2)" }}>{m.dosage_text ?? "—"}</td>
                      </tr>
                    ))}
                    {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 14, color: "var(--t2)", fontSize: 12, fontWeight: 650 }}>
                          No medication requests for this patient.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <NurseAppointmentsWidget />

        <div className={pgOn(page === "triage")} id="pg-triage">
          <div className="ph">
            <div>
              <div className="ph-ey">A&E / Emergency</div>
              <div className="ph-ti">Triage Queue</div>
              <div className="ph-su">Emergency and walk-in patients awaiting triage assessment</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="btn-s"
                type="button"
                onClick={() => {
                  setShowWalkin(true);
                  setWalkinMatches(null);
                  void uiAction("Walk-in modal opened.");
                }}
              >
                + Walk-in
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={() => {
                  setPage("vitals");
                  void uiAction("Triage new patient — opening vitals entry.");
                }}
              >
                + Triage New Patient
              </button>
            </div>
          </div>
          {walkinMatches && walkinMatches.length > 0 && (
            <div className="notice am" style={{ marginBottom: 14 }}>
              <span className="notice-e">🧬</span>
              <div className="notice-tx">
                <strong>Possible existing patient matches found:</strong>{" "}
                {walkinMatches.slice(0, 3).map((m) => `${m.uhid} (${Math.round(m.score * 100)}%)`).join(", ")}
                .
              </div>
            </div>
          )}
          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="kpi" style={{ borderTop: "3px solid #ef4444" }}>
              <div className="kpi-e">🔴</div>
              <div className="kpi-v" style={{ color: "#ef4444" }}>
                1
              </div>
              <div className="kpi-l">Red — Immediate</div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid #f97316" }}>
              <div className="kpi-e">🟠</div>
              <div className="kpi-v" style={{ color: "#f97316" }}>
                1
              </div>
              <div className="kpi-l">Orange — Urgent</div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid #eab308" }}>
              <div className="kpi-e">🟡</div>
              <div className="kpi-v" style={{ color: "#eab308" }}>
                1
              </div>
              <div className="kpi-l">Yellow — Semi-urgent</div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--g)" }}>
              <div className="kpi-e">🟢</div>
              <div className="kpi-v" style={{ color: "var(--g)" }}>
                3
              </div>
              <div className="kpi-l">Green — Non-urgent</div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Current Triage Queue</div>
                <div className="pnl-su">Prioritised by acuity</div>
              </div>
              <span className="tag am dot">LIVE</span>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Patient</th>
                    <th className="mono">AFL ID</th>
                    <th>Chief complaint</th>
                    <th className="mono">Arrived</th>
                    <th>Wait</th>
                    <th>Nurse</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {triageRows.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        background:
                          r.dot === "red"
                            ? "rgba(239,68,68,.04)"
                            : r.dot === "orange"
                              ? "rgba(249,115,22,.04)"
                              : undefined,
                      }}
                    >
                      <td>
                        <span className={`triage-dot ${r.dot}`} style={{ display: "inline-block", marginRight: 5 }} />
                        <span className={`tag ${r.priTone}`}>{r.priLabel}</span>
                      </td>
                      <td style={{ fontWeight: 800 }}>{r.name}</td>
                      <td className="mono">{r.id}</td>
                      <td>{r.cc}</td>
                      <td className="mono">{r.time}</td>
                      <td
                        style={{
                          color: r.priTone === "r" ? "var(--r)" : r.priTone === "am" ? "var(--am)" : "var(--t2)",
                          fontWeight: r.primary ? 900 : 750,
                        }}
                      >
                        {r.wait}
                      </td>
                      <td>{r.nurse}</td>
                      <td>
                        <button
                          className={`${r.primary ? "btn-p" : "btn-s"} btn-sm`}
                          type="button"
                          onClick={() => {
                            setPatientId(r.fhirId ?? patientId);
                            setPage("vitals");
                            void uiAction("Triage opened.", { triage_patient: r.name, triage_id: r.id });
                          }}
                        >
                          Triage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Live walk-in visits from the API ── */}
          <div className="panel" style={{ marginTop: 18 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Today's Walk-in Visits</div>
                <div className="pnl-su">Registered via this facility · polling every 8 s</div>
              </div>
              <span className="tag g dot">SYNC</span>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              {liveWalkins.data && liveWalkins.data.length > 0 ? (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="mono">Walk-in ID</th>
                      <th className="mono">UHID</th>
                      <th>Complaint</th>
                      <th>Triage</th>
                      <th className="mono">MRN</th>
                      <th className="mono">Arrived</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(liveWalkins.data as any[]).map((w) => {
                      const level = String(w.triage_level ?? "");
                      const statusResolved = String(w.status ?? "") === "Resolved";
                      const dot =
                        level === "Red" ? "red" : level === "Orange" ? "orange" : level === "Yellow" ? "yellow" : "green";
                      return (
                        <tr key={w.id}>
                          <td className="mono" style={{ fontSize: 12 }}>{w.id}</td>
                          <td className="mono" style={{ fontWeight: 900, color: "var(--p)" }}>{w.uhid}</td>
                          <td>{w.chief_complaint ?? "—"}</td>
                          <td>
                            <span className={`triage-dot ${dot}`} style={{ display: "inline-block", marginRight: 5 }} />
                            {level || "—"}
                          </td>
                          <td className="mono">{w.mrn ?? "—"}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{w.arrived_at ?? "—"}</td>
                          <td>
                            <span className={`tag ${statusResolved ? "g" : "am"}`}>
                              {statusResolved ? "Resolved" : "Pending"}
                            </span>
                          </td>
                          <td>
                            {!statusResolved && (
                              <button
                                className="btn-s btn-sm"
                                type="button"
                                onClick={async () => {
                                  try {
                                    await api.walkinResolve(w.id, { resolved_by: "Nurse" });
                                    toast(`Walk-in ${w.id} resolved`);
                                    void liveWalkins.refresh?.();
                                  } catch {
                                    toast("Resolve failed");
                                  }
                                }}
                              >
                                ✓ Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: "20px 18px", color: "var(--t2)" }}>
                  {liveWalkins.loading ? "Loading walk-ins…" : "No walk-ins registered yet for this facility."}
                </div>
              )}
            </div>
          </div>

          {lastCreated && (
            <div className="notice g" style={{ marginTop: 14 }}>
              <span className="notice-e">✅</span>
              <div className="notice-tx" style={{ width: "100%" }}>
                <strong>Walk-in created</strong> · UHID <span className="mono">{lastCreated.uhid}</span> · ID{" "}
                <span className="mono">{lastCreated.walkinId}</span>
                {lastCreated.aliases.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--t2)" }}>
                    Aliases:{" "}
                    {lastCreated.aliases.map((a: any) => `${a.facility_id}/${a.mrn}`).join(", ")}
                  </div>
                )}
                <button
                  className="btn-s btn-sm"
                  type="button"
                  style={{ marginTop: 6 }}
                  onClick={() => setLastCreated(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {showWalkin && (
          <div className="modal" role="dialog" aria-modal="true" aria-label="Register walk-in">
            <div className="modal-card" style={{ maxWidth: 780 }}>
              <div className="modal-hd">
                <div>
                  <div className="modal-ti">Register Walk-in</div>
                  <div className="modal-su">Quick registration + cross-facility patient correlation (UHID)</div>
                </div>
                <button className="btn-x" type="button" onClick={() => setShowWalkin(false)} aria-label="Close">
                  ✕
                </button>
              </div>
              <div className="modal-bd">
                {/* Row 1: facility + triage */}
                <div className="g2" style={{ gap: 12 }}>
                  <div>
                    <div className="lbl">Facility ID</div>
                    <input
                      value={walkinForm.facility_id}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, facility_id: e.target.value }))}
                      placeholder="e.g. FAC-0001"
                      className="mono"
                    />
                  </div>
                  <div>
                    <div className="lbl">Triage Level</div>
                    <select value={walkinForm.triage_level} onChange={(e) => setWalkinForm((s) => ({ ...s, triage_level: e.target.value }))}>
                      {["Red", "Orange", "Yellow", "Green"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Row 2: demographics */}
                <div className="g2" style={{ gap: 12, marginTop: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div className="lbl">Full name <span style={{ color: "var(--r)" }}>*</span></div>
                    <input value={walkinForm.full_name} onChange={(e) => setWalkinForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="e.g. Jane Wanjiku" />
                  </div>
                  <div>
                    <div className="lbl">Phone</div>
                    <input value={walkinForm.phone} onChange={(e) => setWalkinForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+2547..." className="mono" />
                  </div>
                  <div>
                    <div className="lbl">Date of birth</div>
                    <input value={walkinForm.dob} onChange={(e) => setWalkinForm((s) => ({ ...s, dob: e.target.value }))} placeholder="YYYY-MM-DD" className="mono" />
                  </div>
                  <div>
                    <div className="lbl">Gender</div>
                    <select value={walkinForm.gender} onChange={(e) => setWalkinForm((s) => ({ ...s, gender: e.target.value }))}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <div className="lbl">National ID / Passport</div>
                    <input
                      value={walkinForm.national_id}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, national_id: e.target.value }))}
                      placeholder="e.g. 12345678"
                      className="mono"
                    />
                  </div>
                </div>
                {/* Row 3: local MRN + complaint */}
                <div className="g2" style={{ gap: 12, marginTop: 12 }}>
                  <div>
                    <div className="lbl">Local MRN (facility record number)</div>
                    <input
                      value={walkinForm.mrn}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, mrn: e.target.value }))}
                      placeholder="e.g. MRN-00482"
                      className="mono"
                    />
                  </div>
                  <div>
                    <div className="lbl">Chief complaint <span style={{ color: "var(--r)" }}>*</span></div>
                    <input
                      value={walkinForm.chief_complaint}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, chief_complaint: e.target.value }))}
                      placeholder="e.g. abdominal pain, fever"
                    />
                  </div>
                </div>

                {/* Correlation matches panel */}
                {walkinMatches && walkinMatches.length > 0 && (
                  <div className="notice am" style={{ marginTop: 14 }}>
                    <span className="notice-e">🧬</span>
                    <div className="notice-tx" style={{ width: "100%" }}>
                      <strong>Possible existing records found — is this the same patient?</strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        {walkinMatches.map((m) => (
                          <div
                            key={m.uhid}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "8px 10px",
                              background: "var(--s)",
                              borderRadius: 8,
                            }}
                          >
                            <div>
                              <span className="mono" style={{ fontWeight: 900, color: "var(--p)" }}>{m.uhid}</span>
                              <span style={{ marginLeft: 8, color: "var(--t2)", fontWeight: 700 }}>
                                {Math.round(m.score * 100)}% match
                              </span>
                              <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>{m.reason}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn-p btn-sm"
                                type="button"
                                disabled={walkinBusy}
                                onClick={() => void submitWalkin(m.uhid)}
                              >
                                ✓ Link to this UHID
                              </button>
                              <button
                                className="btn-s btn-sm"
                                type="button"
                                disabled={walkinBusy}
                                onClick={() => {
                                  setWalkinMatches(null);
                                  void submitWalkin("__create_new__");
                                }}
                              >
                                No, create new
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-ft">
                <button className="btn-s" type="button" onClick={() => setShowWalkin(false)} disabled={walkinBusy}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={() => void submitWalkin()}
                  disabled={walkinBusy || !walkinForm.full_name.trim()}
                >
                  {walkinBusy ? "Creating…" : "Register walk-in"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={pgOn(page === "vitals")} id="pg-vitals">
          <div className="ph">
            <div>
              <div className="ph-ey">Observation Chart</div>
              <div className="ph-ti">Record Vitals</div>
              <div className="ph-su">Ward 4B · 4-hourly observations schedule</div>
            </div>
            <button
              className="btn-vitals"
              type="button"
              onClick={() => {
                void uiAction("Focused Quick Vitals Entry.");
                window.requestAnimationFrame(() =>
                  document.getElementById("nurse-vitals-quick-entry")?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }}
            >
              + Record Vitals
            </button>
          </div>
          <div className="notice am" style={{ marginBottom: 14 }}>
            <span className="notice-e">⏰</span>
            <div className="notice-tx">
              <strong>4 patients have vitals due now:</strong> Bed 01 (Wangui Njoroge), Bed 04 (Adhiambo Grace), Bed 07 (Fatuma Ali),
              Bed 10 (Mary K.). Next scheduled round: 12:00.
            </div>
          </div>
          <div className="gcol3 nurse-vitals-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Recent Vital Entries</div>
                  <div className="pnl-su">Today · 4B · Gateway feed for {patientId}</div>
                </div>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--t2)", marginBottom: 4 }}>Patient ID</div>
                  <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g. P001"
                    autoComplete="off"
                    className="mono"
                    style={{
                      width: "100%",
                      maxWidth: 280,
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "1.5px solid var(--bdr)",
                      background: "var(--bg)",
                      outline: "none",
                    }}
                  />
                </div>
                {obs.error && (
                  <div className="errbanner is-visible" role="alert">
                    <span>⚠️</span>
                    <span>{obs.error}</span>
                  </div>
                )}
                {(obs.data ?? []).slice(0, 12).map((o) => (
                  <div
                    key={o.id}
                    style={{
                      border: "1.5px solid var(--bdr)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{o.code ?? "Observation"}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--t2)", marginTop: 4, fontWeight: 700 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "var(--gd)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 650 }}>No observations for this patient.</div>
                )}
              </div>
            </div>
            <div className="panel" id="nurse-vitals-quick-entry">
              <div className="pnl-hd">
                <div className="pnl-ti">Quick Vitals Entry</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Patient</label>
                  <input className="mono" value={vitalsForm.patient_id} onChange={(e) => setVitalsForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>BP (mmHg)</label>
                    <input value={vitalsForm.bp} onChange={(e) => setVitalsForm((s) => ({ ...s, bp: e.target.value }))} placeholder="e.g. 120/80" />
                  </div>
                  <div className="ff">
                    <label>HR (bpm)</label>
                    <input value={vitalsForm.hr} onChange={(e) => setVitalsForm((s) => ({ ...s, hr: e.target.value }))} type="number" placeholder="72" />
                  </div>
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>Temp (°C)</label>
                    <input value={vitalsForm.temp} onChange={(e) => setVitalsForm((s) => ({ ...s, temp: e.target.value }))} type="number" step={0.1} placeholder="36.8" />
                  </div>
                  <div className="ff">
                    <label>SpO₂ (%)</label>
                    <input value={vitalsForm.spo2} onChange={(e) => setVitalsForm((s) => ({ ...s, spo2: e.target.value }))} type="number" placeholder="98" />
                  </div>
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>RR (breaths/min)</label>
                    <input value={vitalsForm.rr} onChange={(e) => setVitalsForm((s) => ({ ...s, rr: e.target.value }))} type="number" placeholder="16" />
                  </div>
                  <div className="ff">
                    <label>Glucose (mmol/L)</label>
                    <input value={vitalsForm.glucose} onChange={(e) => setVitalsForm((s) => ({ ...s, glucose: e.target.value }))} type="number" step={0.1} placeholder="5.4" />
                  </div>
                </div>
                <div className="ff">
                  <label>AVPU / GCS</label>
                  <select value={vitalsForm.avpu} onChange={(e) => setVitalsForm((s) => ({ ...s, avpu: e.target.value }))}>
                    <option value="A">A — Alert</option>
                    <option value="V">V — Voice response</option>
                    <option value="P">P — Pain response</option>
                    <option value="U">U — Unresponsive</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Pain Score (0–10)</label>
                  <input value={vitalsForm.pain} onChange={(e) => setVitalsForm((s) => ({ ...s, pain: e.target.value }))} type="number" min={0} max={10} placeholder="0" />
                </div>
                <div className="ff">
                  <label>Notes</label>
                  <textarea
                    value={vitalsForm.notes}
                    onChange={(e) => setVitalsForm((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Any concerns or observations…"
                    style={{ minHeight: 60 }}
                  />
                </div>
                <button
                  className="btn-vitals"
                  style={{ width: "100%", justifyContent: "center" }}
                  type="button"
                  onClick={async () => {
                    const pid = vitalsForm.patient_id.trim() || patientId;
                    const nowId = () => `OBS-${Math.random().toString(16).slice(2)}-${Date.now()}`;
                    const effective = new Date().toISOString();
                    const rows: Array<{ code: string; value_text: string; unit?: string }> = [];
                    if (vitalsForm.bp.trim()) rows.push({ code: "BP", value_text: vitalsForm.bp.trim(), unit: "mmHg" });
                    if (vitalsForm.hr.trim()) rows.push({ code: "HR", value_text: vitalsForm.hr.trim(), unit: "bpm" });
                    if (vitalsForm.temp.trim()) rows.push({ code: "Temp", value_text: vitalsForm.temp.trim(), unit: "°C" });
                    if (vitalsForm.spo2.trim()) rows.push({ code: "SpO2", value_text: vitalsForm.spo2.trim(), unit: "%" });
                    if (vitalsForm.rr.trim()) rows.push({ code: "RR", value_text: vitalsForm.rr.trim(), unit: "breaths/min" });
                    if (vitalsForm.glucose.trim()) rows.push({ code: "Glucose", value_text: vitalsForm.glucose.trim(), unit: "mmol/L" });
                    rows.push({ code: "AVPU", value_text: vitalsForm.avpu.trim() });
                    if (vitalsForm.pain.trim()) rows.push({ code: "Pain", value_text: vitalsForm.pain.trim(), unit: "/10" });
                    if (vitalsForm.notes.trim()) rows.push({ code: "Notes", value_text: vitalsForm.notes.trim() });

                    try {
                      for (const r of rows) {
                        await api.ingestObservation({
                          id: nowId(),
                          patient_id: pid,
                          code: r.code,
                          effective_time: effective,
                          value_text: r.value_text,
                          unit: r.unit ?? null,
                        });
                      }
                      toast(`Vitals saved for ${pid}.`);
                      // refresh view (poller will catch it shortly) + keep patient id consistent
                      setPatientId(pid);
                    } catch (e) {
                      toast(`Vitals save failed: ${String(e)}`);
                    }
                  }}
                >
                  Save Vitals to EHR
                </button>
              </div>
            </div>
            </div>
            <div className="panel nurse-vitals-figure-panel" style={{ position: "sticky", top: 10 }}>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <BodyVitalsFigure
                  vitals={nurseFigureVitals}
                  gender={nursePatientGender}
                  activeVital={activeVital}
                  onVitalHover={setActiveVital}
                  subtitle={`Ward 4B · ${vitalsForm.patient_id.trim() || patientId} · live preview`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "mar")} id="pg-mar">
          <div className="ph">
            <div>
              <div className="ph-ey">Medication Administration Record</div>
              <div className="ph-ti">MAR — Medication Admin</div>
              <div className="ph-su">Tap a time slot to mark as given · Verified with UniHealth biometric</div>
            </div>
          </div>
          <div className="notice ro" style={{ marginBottom: 14 }}>
            <span className="notice-e">⚠️</span>
            <div className="notice-tx">
              <strong>Allergy on file — Wangui Njoroge:</strong> Penicillin (Anaphylaxis), Sulfa drugs (Rash). System will alert if
              contraindicated drug is administered.
            </div>
          </div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Wangui Njoroge — Bed 01</div>
                <div className="pnl-su">AFL-78841209 · Internal Medicine</div>
              </div>
              <span className="tag r">⚠ Allergy: Penicillin</span>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Route</th>
                    <th>06:00</th>
                    <th>12:00</th>
                    <th>18:00</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Furosemide 40mg</td>
                    <td>
                      <span className="tag g">PO</span>
                    </td>
                    <td>
                      <span className="tag g">✓</span>
                    </td>
                    <td>
                      <span className="tag am">Due</span>
                    </td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Calcium Gluconate</td>
                    <td>
                      <span className="tag b">IV</span>
                    </td>
                    <td>
                      <span className="tag g">✓</span>
                    </td>
                    <td>
                      <span className="tag am">Due</span>
                    </td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Omar Abdullahi — Bed 02</div>
                <div className="pnl-su">AFL-87654321 · Surgical Ward</div>
              </div>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Route</th>
                    <th>06:00</th>
                    <th>12:00</th>
                    <th>18:00</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Morphine PCA</td>
                    <td>
                      <span className="tag b">IV</span>
                    </td>
                    <td>
                      <span className="tag g">✓</span>
                    </td>
                    <td>
                      <span className="tag g">✓</span>
                    </td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "tasks")} id="pg-tasks">
          <div className="ph">
            <div>
              <div className="ph-ey">Care Management</div>
              <div className="ph-ti">Tasks & Care Plans</div>
              <div className="ph-su">Nursing tasks for this shift — Ward 4B</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setTaskForm({ patient_id: patientId, title: "", due: "" });
                setShowTask(true);
              }}
            >
              + Add Task
            </button>
          </div>
          <div className="g2">
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Pending Tasks</div>
                  <div className="pnl-su">5 remaining this shift</div>
                </div>
              </div>
              <div className="pnl-bd">
                {pendingTasks.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--bdr)",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{t.t}</div>
                    <span className={`tag ${t.tone}`}>{t.due}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Completed Tasks</div>
                  <div className="pnl-su">18 done today</div>
                </div>
              </div>
              <div className="pnl-bd">
                {doneTasks.map((t, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: "var(--t2)", padding: "8px 0", borderBottom: "1px solid var(--bdr)" }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clean UI: keep endpoints working, hide system tables/badges */}
        </div>

        <div className={pgOn(page === "fluids")} id="pg-fluids">
          <div className="ph">
            <div>
              <div className="ph-ey">24-hr Fluid Chart</div>
              <div className="ph-ti">Fluid Balance</div>
              <div className="ph-su">Intake vs output monitoring — Ward 4B</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setFluidForm((s) => ({ ...s, patient_id: patientId }));
                setShowFluid(true);
              }}
            >
              + Record Entry
            </button>
          </div>
          <div className="g2" style={{ marginBottom: 14 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Wangui Njoroge — Bed 01</div>
                  <div className="pnl-su">24-hr balance · Fluid restriction: 1.5L/day</div>
                </div>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "var(--bl)", border: "1.5px solid var(--bm)", borderRadius: 9, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>🔵</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--b)" }}>920 ml</div>
                    <div style={{ fontSize: 10.5, fontWeight: 950, color: "var(--t2)", marginTop: 3, letterSpacing: 0.2 }}>TOTAL INTAKE</div>
                  </div>
                  <div style={{ background: "var(--gl)", border: "1.5px solid var(--gm)", borderRadius: 9, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>🟢</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>740 ml</div>
                    <div style={{ fontSize: 10.5, fontWeight: 950, color: "var(--t2)", marginTop: 3, letterSpacing: 0.2 }}>TOTAL OUTPUT</div>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--al)",
                    border: "1px solid var(--amm)",
                    borderRadius: 7,
                    padding: "9px 12px",
                    fontSize: 11.5,
                    color: "var(--t1)",
                    marginBottom: 12,
                  }}
                >
                  <strong>Balance: +180 ml</strong> · Target: 1,500 ml / day · Remaining today: 580 ml
                </div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Route</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
                        07:00
                      </td>
                      <td>IV Saline 0.9%</td>
                      <td>
                        <span className="tag b">IV</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>500 ml</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
                        09:15
                      </td>
                      <td>Urine output</td>
                      <td>
                        <span className="tag am">Catheter</span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--g)" }}>
                        −240 ml
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">All Patients — Balance Summary</div>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Bed</th>
                      <th>Intake</th>
                      <th>Output</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Wangui Njoroge</td>
                      <td className="mono">
                        01
                      </td>
                      <td>920 ml</td>
                      <td>740 ml</td>
                      <td style={{ fontWeight: 700, color: "var(--am)" }}>+180 ml</td>
                      <td>
                        <span className="tag am">Restricted</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Adhiambo Grace</td>
                      <td className="mono">
                        04
                      </td>
                      <td>2,100 ml</td>
                      <td>2,050 ml</td>
                      <td style={{ fontWeight: 700, color: "var(--g)" }}>+50 ml</td>
                      <td>
                        <span className="tag g">Balanced</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Clean UI: keep endpoints working, hide system tables/badges */}
        </div>

        <div className={pgOn(page === "wounds")} id="pg-wounds">
          <div className="ph">
            <div>
              <div className="ph-ey">Wound Management</div>
              <div className="ph-ti">Wound Care & Dressings</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setWoundForm((s) => ({ ...s, patient_id: patientId, site: "", dressing: "", notes: "" }));
                setShowWound(true);
              }}
            >
              + Record Dressing
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Active Wound Care Plans</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Wound Site</th>
                    <th>Type</th>
                    <th>Dressing</th>
                    <th>Last Done</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Omar Abdullahi</td>
                    <td>Surgical — Abdomen</td>
                    <td>
                      <span className="tag pu">Post-op</span>
                    </td>
                    <td>Non-adherent + iodine</td>
                    <td className="mono">04 Mar 06:00</td>
                    <td className="mono" style={{ color: "var(--am)" }}>
                      TODAY 14:00
                    </td>
                    <td>
                      <span className="tag am">Due Soon</span>
                    </td>
                    <td>
                      <button
                        className="btn-p btn-sm"
                        type="button"
                        onClick={() => {
                          setWoundForm((s) => ({ ...s, patient_id: "P002", site: "Abdomen", wound_type: "Post-op", dressing: "Non-adherent + iodine" }));
                          setShowWound(true);
                        }}
                      >
                        Record
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Mary Kamau</td>
                    <td>L) Leg — laceration</td>
                    <td>
                      <span className="tag b">Traumatic</span>
                    </td>
                    <td>Moist wound dressing</td>
                    <td className="mono">03 Mar 14:00</td>
                    <td className="mono" style={{ color: "var(--g)" }}>
                      05 Mar 14:00
                    </td>
                    <td>
                      <span className="tag g">Current</span>
                    </td>
                    <td>
                      <button
                        className="btn-s btn-sm"
                        type="button"
                        onClick={() => {
                          setWoundForm((s) => ({ ...s, patient_id: "P005", site: "L) Leg", wound_type: "Traumatic", dressing: "Moist wound dressing" }));
                          setShowWound(true);
                        }}
                      >
                        Record
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean UI: keep endpoints working, hide system tables/badges */}
        </div>

        <div className={pgOn(page === "handover")} id="pg-handover">

          {/* ── Page header ── */}
          <div className="ph">
            <div>
              <div className="ph-ey">Shift Documentation · NCK Standard</div>
              <div className="ph-ti">Shift Handover</div>
              <div className="ph-su">Morning Shift · Ward 4B · 07:00–15:00 · SBAR format</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-s" type="button" onClick={() => window.print()}>🖨 Print Report</button>
              <button className="btn-p" type="button" onClick={() => setShowHandover(true)}>✍ Sign Handover</button>
            </div>
          </div>

          {/* ── Shift summary banner ── */}
          <div className="ho-banner">
            <div className="ho-banner-accent" />
            <div className="ho-banner-in">
              <div className="ho-banner-left">
                <div className="ho-banner-icon">📋</div>
                <div>
                  <div className="ho-banner-ti">Morning Shift — Ward 4B</div>
                  <div className="ho-banner-su">Nurse Atieno Achieng (NCK/RN/2021/08432) · Handing to Nurse Omondi · 15:00</div>
                </div>
              </div>
              <div className="ho-banner-stats">
                {([
                  { v: "12", l: "Patients",     c: "#ddf0ff" },
                  { v: "2",  l: "Critical",      c: "#ff6699" },
                  { v: "3",  l: "Pending",        c: "#ffc84a" },
                  { v: "18", l: "Completed",      c: "#00e5a0" },
                  { v: "0",  l: "Missed doses",   c: "#00e5a0" },
                ] as const).map(({ v, l, c }) => (
                  <div key={l} className="ho-stat-cell">
                    <div className="ho-stat-v" style={{ color: c }}>{v}</div>
                    <div className="ho-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SBAR body + right column ── */}
          <div className="ho-grid-main">

            {/* Left: SBAR cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div className="sbar-card sbar-s">
                <div className="sbar-label">S — Situation</div>
                <div className="sbar-content">
                  {[
                    { ico: "🏢", text: <><strong>Ward 4B</strong> · Morning shift 07:00–15:00 · General Medicine</> },
                    { ico: "👩‍⚕️", text: <>Outgoing: <strong>Nurse Atieno Achieng</strong> · NCK/RN/2021/08432</> },
                    { ico: "🔄", text: <>Incoming: <strong>Nurse Omondi</strong> (Night, 15:00–23:00)</> },
                  ].map(({ ico, text }, i) => (
                    <div key={i} className="sbar-row"><span className="sbar-row-ico">{ico}</span><div>{text}</div></div>
                  ))}
                </div>
              </div>

              <div className="sbar-card sbar-b">
                <div className="sbar-label">B — Background</div>
                <div className="sbar-content">
                  {[
                    { ico: "📊", text: <><strong>Ward status:</strong> 12 of 14 beds occupied. 1 discharge planned (Bed 07). Bed 09 reserved for A&amp;E transfer.</> },
                    { ico: "💊", text: <><strong>Medications:</strong> 36 administered, 0 missed doses, 2 PRN given. IV lines patent on all patients.</> },
                    { ico: "🧪", text: <><strong>Labs:</strong> FBC/U&amp;E pending for Bed 01 (13:00). Culture results expected for Bed 05 (17:00).</> },
                  ].map(({ ico, text }, i) => (
                    <div key={i} className="sbar-row"><span className="sbar-row-ico">{ico}</span><div>{text}</div></div>
                  ))}
                </div>
              </div>

              <div className="sbar-card sbar-a">
                <div className="sbar-label">A — Assessment · Patient Status</div>
                <div className="sbar-content">
                  {[
                    { bed: "01", name: "Wangui Njoroge",  status: "CRITICAL", note: "K⁺ 6.8 on 03:00 bloods. Dr. Mutuku notified. ECG continuous. Fluid restriction 1.5L.", level: "red" as const },
                    { bed: "02", name: "Omar Abdullahi",  status: "STABLE",   note: "Abdominal pain managed. NBM for theatre today. Morphine PCA running.",                  level: "amber" as const },
                    { bed: "05", name: "Akinyi Adhiambo", status: "STABLE",   note: "Post-op Day 2 appendectomy. Tolerating oral fluids. Pain 3/10.",                        level: "green" as const },
                    { bed: "09", name: "(Reserved)",       status: "INCOMING", note: "Transfer from A&E expected 16:00. Prep bed, IV access, monitoring.",                    level: "blue" as const },
                  ].map(({ bed, name, status, note, level }) => (
                    <div key={bed} className="ho-patient-row">
                      <div className={`ho-patient-bed ho-bed-${level}`}>Bed {bed}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ho-patient-name">{name}</div>
                        <div className="ho-patient-note">{note}</div>
                      </div>
                      <span className={`ho-status-tag ho-tag-${level}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sbar-card sbar-r">
                <div className="sbar-label">R — Recommendations for Next Shift</div>
                <div className="sbar-content">
                  {[
                    { ico: "🔴", text: "BED 01: Repeat K⁺ at 13:00 — notify Dr. Mutuku immediately if > 6.0. Continue ECG & fluid restriction." },
                    { ico: "🟡", text: "BED 02: Theatre team to confirm time. Keep NBM, update consent forms pre-transfer." },
                    { ico: "🔵", text: "BED 09: Prepare monitoring bay — O₂, IV trolley, drug chart ready before A&E transfer arrives." },
                    { ico: "📋", text: "Ward: Complete drug round at 14:30 before handover. Document all PRN given in MAR." },
                  ].map(({ ico, text }, i) => (
                    <div key={i} className="sbar-row"><span className="sbar-row-ico">{ico}</span><div>{text}</div></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: incoming notes + AI + pending tasks + CTA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div className="panel">
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">📥 Incoming Handover</div>
                    <div className="pnl-su">From Night Shift · Nurse Osei</div>
                  </div>
                  <span className="tag am">00:00–07:00</span>
                </div>
                <div className="pnl-bd" style={{ padding: "12px 16px" }}>
                  {[
                    { bed: "01", name: "Wangui Njoroge",  note: "Critical — K⁺ 6.8 at 03:00. Dr. Mutuku on call notified. Continuous ECG." },
                    { bed: "02", name: "Omar Abdullahi",  note: "Abdominal pain managed with morphine. Kept NBM for theatre today." },
                    { bed: "09", name: "General",          note: "Bed 09 reserved for incoming patient from A&E, expected 16:00." },
                  ].map(({ bed, name, note }) => (
                    <div key={bed} style={{ padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: "rgba(0,210,255,0.60)", flexShrink: 0, marginTop: 2 }}>BED {bed}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.82)" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, lineHeight: 1.5 }}>{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ai-widget amber">
                <div className="ai-widget-hd">
                  <div>
                    <div className="ai-widget-ti">🤖 AI Shift Summary</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2, fontWeight: 600 }}>Auto-generated · Vitals + MAR + Tasks</div>
                  </div>
                  <span className="tag am">07:00–15:00</span>
                </div>
                {[
                  { ico: "📊", ti: "Shift Stats",        su: "12 patients · 48 vitals recorded · 36 meds administered · 0 missed" },
                  { ico: "⚠️",  ti: "1 Critical Alert",  su: "Bed 01 — Hyperkalaemia. Escalated to on-call physician at 03:15." },
                  { ico: "✅", ti: "All Tasks Logged",   su: "18 of 21 tasks complete. 3 deferred to next shift (documented)." },
                ].map(({ ico, ti, su }) => (
                  <div key={ti} className="ai-row">
                    <span className="ai-row-ico">{ico}</span>
                    <div className="ai-row-body">
                      <div className="ai-row-ti">{ti}</div>
                      <div className="ai-row-su">{su}</div>
                    </div>
                  </div>
                ))}
                <div className="audit-notice">⛓️ FHIR synced · Shift audit trail verified</div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div className="pnl-ti">Deferred to Next Shift</div>
                  <span className="tag r">3 pending</span>
                </div>
                <div className="pnl-bd" style={{ padding: 0 }}>
                  <table className="tbl">
                    <thead><tr><th>Task</th><th>Bed</th><th>Due</th><th>Priority</th></tr></thead>
                    <tbody>
                      {[
                        { task: "K⁺ blood draw repeat", bed: "01", due: "13:00", pri: "URGENT", pc: "r" },
                        { task: "Theatre consent form",  bed: "02", due: "14:00", pri: "HIGH",   pc: "am" },
                        { task: "Bed 09 incoming setup", bed: "09", due: "15:30", pri: "HIGH",   pc: "am" },
                      ].map(({ task, bed, due, pri, pc }) => (
                        <tr key={task}>
                          <td style={{ fontWeight: 600 }}>{task}</td>
                          <td className="mono">Bed {bed}</td>
                          <td className="mono" style={{ color: "rgba(0,210,255,0.70)" }}>{due}</td>
                          <td><span className={`tag ${pc}`}>{pri}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ho-sign-cta">
                <div className="ho-sign-cta-text">
                  <span className="ho-sign-cta-ico">✍</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#ddf0ff", fontSize: 13 }}>Ready to sign off?</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Complete SBAR and submit your digital handover to the incoming nurse.</div>
                  </div>
                </div>
                <button className="btn-p" type="button" onClick={() => setShowHandover(true)}>✍ Sign & Submit</button>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "incidents")} id="pg-incidents">
          <div className="ph">
            <div>
              <div className="ph-ey">Safety</div>
              <div className="ph-ti">Incident Reports</div>
            </div>
            <button className="btn-p" type="button" onClick={() => openIncidentModal()}>
              + Report Incident
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Recent Incident Reports</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Incident Type</th>
                    <th className="mono">Patient</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {((incidentsPoll.data ?? []) as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.id)}>
                      <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
                        {formatRowTime(row.created_at as number | string | undefined)}
                      </td>
                      <td>{String(row.type ?? "—")}</td>
                      <td className="mono">{String(row.patient_id ?? "—")}</td>
                      <td>
                        <span className="tag am">{String(row.severity ?? "—")}</span>
                      </td>
                      <td>
                        <span
                          className={`tag ${
                            String(row.status).toLowerCase() === "resolved" ? "g" : "b"
                          }`}
                        >
                          {String(row.status ?? "Under Review")}
                        </span>
                      </td>
                      <td>
                        <CrudRowActions
                          onEdit={() => openIncidentModal(row)}
                          onDelete={async () => {
                            if (!window.confirm(`Delete incident ${row.id}?`)) return;
                            try {
                              await api.nurseIncidentDelete(String(row.id));
                              incidentsPoll.refresh();
                              toast("Incident deleted.");
                            } catch (e) {
                              toast(e instanceof Error ? e.message : "Delete failed");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {!incidentsPoll.loading && (incidentsPoll.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                        No incidents yet. Use + Report Incident to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "esign")} id="pg-esign">
          <div className="ph">
            <div>
              <div className="ph-ey">Legal &amp; Consent</div>
              <div className="ph-ti">E-Signatures</div>
              <div className="ph-su">
                Emergency consent, surgical witness signatures, and POA for patient{" "}
                <span className="mono">{patientId}</span>
              </div>
            </div>
          </div>
          <ESignModulePanel
            patientId={patientId}
            role="nurse"
            allowCreate={["emergency_consent", "surgical_consent"]}
            active={page === "esign"}
            onToast={toast}
          />
        </div>

        <div className={pgOn(page === "supplies")} id="pg-supplies">
          <div className="ph">
            <div>
              <div className="ph-ey">Ward 4B</div>
              <div className="ph-ti">Supplies & Inventory</div>
              <div className="ph-su">Stock levels and reorder requests</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setSupplyForm({ ward: "4B", item: "", qty: "10", priority: "Routine", notes: "" });
                setShowSupply(true);
              }}
            >
              + Request Supplies
            </button>
          </div>
          <div className="notice am">
            <span className="notice-e">⚠️</span>
            <div className="notice-tx">
              <strong>Low stock alert:</strong> Normal Saline 0.9% (500ml) — only 4 bags remaining. Paracetamol IV — 2 vials.
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Ward 4B — Current Stock</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>In Stock</th>
                    <th>Min Level</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Normal Saline 0.9% 500ml</td>
                    <td>IV Fluids</td>
                    <td style={{ fontWeight: 700, color: "var(--r)" }}>4</td>
                    <td>20</td>
                    <td>
                      <span className="tag r">Critical Low</span>
                    </td>
                    <td>
                      <button
                        className="btn-p btn-sm"
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.nurseSupplyRequest({ item: "Normal Saline 0.9% 500ml", qty: 10, ward: "4B" });
                            toast(`Supply request submitted (${res.id ?? "created"}).`);
                          } catch (e) {
                            toast(`Supply request failed: ${String(e)}`);
                          }
                        }}
                      >
                        Order
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Nitrile Gloves (M)</td>
                    <td>PPE</td>
                    <td>120</td>
                    <td>50</td>
                    <td>
                      <span className="tag g">Adequate</span>
                    </td>
                    <td>
                      <button
                        className="btn-s btn-sm"
                        type="button"
                        onClick={() => {
                          setInventoryItem({ name: "Nitrile Gloves (M)", category: "PPE", inStock: "120", min: "50" });
                          setShowInventory(true);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Recent supply requests</div>
                <div className="pnl-su">Latest submissions for Ward 4B</div>
              </div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">Request</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Priority</th>
                    <th>Ward</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplyRequests.data ?? []).slice(0, 12).map((r: any) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td style={{ fontWeight: 800 }}>{r.item ?? "—"}</td>
                      <td className="mono">{r.qty ?? "—"}</td>
                      <td>
                        <span className={`tag ${r.priority === "STAT" ? "r" : r.priority === "Urgent" ? "am" : "g"}`}>
                          {r.priority ?? "Routine"}
                        </span>
                      </td>
                      <td className="mono">{r.ward ?? "—"}</td>
                    </tr>
                  ))}
                  {!supplyRequests.loading && (supplyRequests.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, color: "var(--t2)", fontSize: 12.5, fontWeight: 650 }}>
                        No supply requests submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function NurseAppointmentsWidget() {
  const [appts, setAppts] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const load = () => {
      api.appointments({ status: "pending", limit: 20 })
        .then(setAppts)
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const pending = appts.filter((a) => a.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div
      style={{
        margin: "0 0 16px",
        background: "rgba(255,184,48,0.05)",
        border: "1px solid rgba(255,184,48,0.20)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--am)" }}>
              Pending Patient Appointments ({pending.length})
            </div>
            <div style={{ fontSize: 10.5, color: "var(--t3)" }}>Booked via portal — awaiting confirmation</div>
          </div>
        </div>
        <span style={{ color: "var(--t3)", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 16px 12px" }}>
          <table className="tbl">
            <thead>
              <tr><th>Patient</th><th>Date</th><th>Time</th><th>Dept</th><th>Facility</th></tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.patient_name}</td>
                  <td className="mono">{a.date}</td>
                  <td className="mono">{a.time}</td>
                  <td>{a.department}</td>
                  <td style={{ fontSize: 10.5, color: "var(--t3)" }}>{a.facility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
