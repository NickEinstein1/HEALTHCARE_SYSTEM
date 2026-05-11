import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

type DocPage =
  | "home"
  | "chart"
  | "queue"
  | "patient"
  | "ward"
  | "labs"
  | "prescriptions"
  | "imaging"
  | "notes"
  | "referrals"
  | "procedures"
  | "claims"
  | "schedule";

const DOC_TITLES: Record<DocPage, string> = {
  home: "Today's Overview",
  chart: "Patient Chart",
  queue: "Patient Queue",
  patient: "Patient Workup",
  ward: "Ward / Beds",
  labs: "Lab Orders & Results",
  prescriptions: "Prescriptions",
  imaging: "Imaging & Reports",
  notes: "Clinical Notes",
  referrals: "Referrals",
  procedures: "Procedures",
  claims: "UniHealth Claims",
  schedule: "My Schedule",
};

export function DoctorDashboard() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<DocPage>("home");
  const [patientId, setPatientId] = useState("P001");
  const summary = usePolling(() => api.patientSummary(patientId, 5), { intervalMs: 5000 });
  const obs = usePolling(() => api.observations(patientId, 10), { intervalMs: 5000 });
  const meds = usePolling(() => api.medicationRequests(patientId, 10), { intervalMs: 7000 });

  const apiErr = summary.error ?? obs.error ?? meds.error;

  // ── Phase 3: AI Hints state ────────────────────────────────────────
  const [aiHints, setAiHints] = useState<any | null>(null);
  const [aiHintsLoading, setAiHintsLoading] = useState(false);
  const [aiHintsOpen, setAiHintsOpen] = useState(false);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket: receive real-time anomaly alerts
  useEffect(() => {
    const wsBase = (import.meta as any).env?.VITE_API_BASE_URL || "";
    const wsUrl = (wsBase.replace(/^http/, "ws") || `ws://${window.location.host}`) +
      "/ai/ws/alerts/doctor?token=dev-token-1";
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.event === "anomaly_alert") {
            setAiAlerts(prev => [msg.data, ...prev].slice(0, 20));
            toast(`🚨 Alert: ${msg.data.msg}`);
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => { /* silent in dev */ };
      return () => { ws.close(); };
    } catch { return undefined; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll active anomalies from REST (fallback when WS not connected)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await api.aiAnomalies({ ack: false, limit: 10 }, "doctor");
        if (!cancelled) setAiAlerts(rows);
      } catch { /* api offline */ }
    };
    void load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const fetchAiHints = useCallback(async () => {
    setAiHintsLoading(true);
    try {
      // Build features from current observations + summary
      const latestVitals = obs.data ?? [];
      const vitalMap: Record<string, number> = {};
      for (const o of latestVitals) {
        const code = (o.code ?? "").toLowerCase();
          const val  = parseFloat((o as any).valueQuantity?.value ?? (o as any).value ?? "");
        if (!isNaN(val)) {
          if (code.includes("respiratory") || code.includes("8867-4")) vitalMap.rr   = val;
          if (code.includes("oxygen")      || code.includes("59408-5")) vitalMap.spo2 = val;
          if (code.includes("systolic")    || code.includes("8480-6"))  vitalMap.sbp  = val;
          if (code.includes("heart")       || code.includes("8867"))    vitalMap.hr   = val;
          if (code.includes("temp")        || code.includes("8310-5"))  vitalMap.temp = val;
          if (code.includes("glucose")     || code.includes("2339-0"))  vitalMap.glucose = val;
          if (code.includes("creatinine")  || code.includes("2160-0"))  vitalMap.creatinine = val;
          if (code.includes("potassium")   || code.includes("6298-4"))  vitalMap.potassium = val;
        }
      }
      const activeMeds = (meds.data ?? []).map((m: any) =>
        m.medicationCodeableConcept?.text ?? m.medication ?? ""
      ).filter(Boolean);

      const result = await api.aiDiagnosisHints(
        { features: vitalMap, medications: activeMeds, patient_id: patientId },
        "doctor",
      );
      setAiHints(result);
      setAiHintsOpen(true);
    } catch (e: any) {
      toast(`AI hints unavailable: ${e?.message ?? "API offline"}`);
    } finally {
      setAiHintsLoading(false);
    }
  }, [obs.data, meds.data, patientId]);

  const ackAlert = async (id: string) => {
    try {
      await api.aiAckAnomaly(id, "Reviewed by doctor", "doctor");
      setAiAlerts(prev => prev.filter(a => a.id !== id));
      toast("Alert acknowledged.");
    } catch { /* offline */ }
  };

  // ── AI Hints Panel UI ─────────────────────────────────────────────
  const aiHintsPanel = aiHintsOpen && aiHints ? (
    <div style={{
      background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.22)",
      borderRadius: 14, padding: "18px 20px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontWeight: 700, color: "var(--p, #00d4ff)", fontSize: 14 }}>
            AI Diagnosis Hints
          </span>
          <span style={{ marginLeft: 10, fontSize: 11, color: "var(--t3)", background: "rgba(0,212,255,0.10)",
            border: "1px solid rgba(0,212,255,0.2)", borderRadius: 5, padding: "2px 7px" }}>
            {aiHints.model_version}
          </span>
        </div>
        <button onClick={() => setAiHintsOpen(false)}
          style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {aiHints.differentials?.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {aiHints.differentials.map((dx: any, i: number) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: "rgba(8,18,42,0.6)", borderRadius: 10,
              border: `1px solid ${dx.confidence >= 90 ? "rgba(255,51,102,0.3)" : "rgba(0,212,255,0.12)"}`,
            }}>
              <div style={{ minWidth: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800,
                  color: dx.confidence >= 90 ? "#ff3366" : dx.confidence >= 80 ? "#ffb830" : "#00d4ff" }}>
                  {dx.confidence}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--t1, #ddf0ff)" }}>
                  {dx.diagnosis}
                </div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                  ICD-10 {dx.icd10} · {dx.rationale}
                </div>
              </div>
              <button onClick={() => {
                  void api.aiSubmitFeedback(aiHints.audit_id, "accepted", dx.diagnosis, "doctor");
                  toast(`Accepted: ${dx.diagnosis}`);
                }}
                style={{ padding: "4px 10px", background: "rgba(0,229,160,0.12)",
                  border: "1px solid rgba(0,229,160,0.3)", borderRadius: 6,
                  color: "#00e5a0", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                Accept
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--t3)", fontSize: 13 }}>
          No differential diagnoses matched from current vitals/labs. Add more values to improve results.
        </p>
      )}

      {aiHints.drug_interactions?.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,184,48,0.2)", paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#ffb830", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Drug Interaction Alerts
          </div>
          {aiHints.drug_interactions.map((ix: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px",
              background: "rgba(255,184,48,0.06)", border: "1px solid rgba(255,184,48,0.2)",
              borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: ix.severity === "HIGH" ? "#ff3366" : "#ffb830", fontWeight: 700, flexShrink: 0 }}>
                {ix.severity}
              </span>
              <span style={{ color: "var(--t2, #7ab8d8)" }}>
                <strong style={{ color: "var(--t1)" }}>{ix.drug_a}</strong> + <strong style={{ color: "var(--t1)" }}>{ix.drug_b}</strong>
                {" — "}{ix.detail}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 11, color: "var(--t3)", fontStyle: "italic" }}>
        {aiHints.disclaimer}
      </div>
    </div>
  ) : null;

  // ── Active Alerts Strip ───────────────────────────────────────────
  const alertsStrip = aiAlerts.length > 0 ? (
    <div style={{ marginBottom: 14 }}>
      {aiAlerts.slice(0, 3).map((a: any) => (
        <div key={a.id} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", borderRadius: 10, marginBottom: 6,
          background: a.severity === "CRITICAL" ? "rgba(255,51,102,0.08)" : "rgba(255,184,48,0.07)",
          border: `1px solid ${a.severity === "CRITICAL" ? "rgba(255,51,102,0.3)" : "rgba(255,184,48,0.25)"}`,
        }}>
          <span style={{ fontSize: 16 }}>{a.severity === "CRITICAL" ? "🚨" : "⚠️"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: a.severity === "CRITICAL" ? "#ff3366" : "#ffb830" }}>
              {a.severity} · {(a.metric ?? "").toUpperCase()} = {a.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{a.msg} · Patient {a.patient_id}</div>
          </div>
          <button onClick={() => void ackAlert(a.id)}
            style={{ padding: "4px 10px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
              color: "var(--t3)", fontSize: 11, cursor: "pointer" }}>
            Ack
          </button>
        </div>
      ))}
    </div>
  ) : null;

  const uiAction = async (label: string) => {
    try {
      await api.uiAction({ role: "doctor", page, patient_id: patientId, label });
    } catch (e) {
      // Keep the UX clean even if the API is offline.
    }
    toast(label);
  };

  type AdmittedRow = { bed: string; name: string; aflId: string; team: string; fhirId: string };
  type LabOrderRow = { id: string; when: string; patientFhirId: string; panel: string; priority: string; notes: string };
  type ImagingOrderRow = { id: string; when: string; study: string; patientId: string; status: string };
  type RxDraftRow = { id: string; drug: string; dose: string; route: string; when: string };
  type ReferralRowX = { to: string; patient: string; priority: string; status: string };
  type ProcRowX = { id: string; label: string; when: string };

  const [admitted, setAdmitted] = useState<AdmittedRow[]>(() => {
    try {
      const raw = localStorage.getItem("doc.admitted.v1");
      if (!raw) {
        return [
          { bed: "01", name: "Wangui Njoroge", aflId: "AFL-78841209", team: "IM", fhirId: "P001" },
          { bed: "02", name: "Omar Abdullahi", aflId: "AFL-87654321", team: "Surgery", fhirId: "P002" },
        ];
      }
      const parsed = JSON.parse(raw) as AdmittedRow[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [
        { bed: "01", name: "Wangui Njoroge", aflId: "AFL-78841209", team: "IM", fhirId: "P001" },
        { bed: "02", name: "Omar Abdullahi", aflId: "AFL-87654321", team: "Surgery", fhirId: "P002" },
      ];
    }
  });

  const [labOrders, setLabOrders] = useState<LabOrderRow[]>(() => {
    try {
      const raw = localStorage.getItem("doc.labOrders.v1");
      const parsed = raw ? (JSON.parse(raw) as LabOrderRow[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("doc.admitted.v1", JSON.stringify(admitted));
    } catch {
      // ignore
    }
  }, [admitted]);

  useEffect(() => {
    try {
      localStorage.setItem("doc.labOrders.v1", JSON.stringify(labOrders));
    } catch {
      // ignore
    }
  }, [labOrders]);

  const [imagingOrders, setImagingOrders] = useState<ImagingOrderRow[]>(() => {
    try {
      const raw = localStorage.getItem("doc.imagingOrders.v1");
      const p = raw ? (JSON.parse(raw) as ImagingOrderRow[]) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("doc.imagingOrders.v1", JSON.stringify(imagingOrders));
    } catch {
      // ignore
    }
  }, [imagingOrders]);

  const [rxDrafts, setRxDrafts] = useState<RxDraftRow[]>(() => {
    try {
      const raw = localStorage.getItem("doc.rxDrafts.v1");
      const p = raw ? (JSON.parse(raw) as RxDraftRow[]) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("doc.rxDrafts.v1", JSON.stringify(rxDrafts));
    } catch {
      // ignore
    }
  }, [rxDrafts]);

  const [rxForm, setRxForm] = useState({ drug: "", dose: "", route: "PO" });
  const [referralAdds, setReferralAdds] = useState<ReferralRowX[]>([]);
  const [procedureAdds, setProcedureAdds] = useState<ProcRowX[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<{ t: string; label: string }[]>([]);

  // ── Clinical note state ────────────────────────────────────────────
  const [noteType, setNoteType] = useState("Progress Note");
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<Array<{ id: string; type: string; text: string; patient: string; at: string }>>([]);

  const saveNote = async () => {
    if (!noteText.trim()) { toast("Enter a note before saving."); return; }
    setNoteSaving(true);
    try {
      await api.ingestObservation({
        resourceType: "Observation",
        patient_id: patientId,
        code: noteType.toLowerCase().replace(/\s+/g, "-"),
        value_text: noteText.trim(),
        effective_time: new Date().toISOString(),
      });
    } catch { /* offline */ }
    try {
      await api.uiAction({ role: "doctor", patient_id: patientId, label: `${noteType}: ${noteText.slice(0, 80)}`, type: "clinical_note" });
    } catch { /* offline */ }
    setSavedNotes((prev) => [{
      id: `NOTE-${Date.now()}`,
      type: noteType,
      text: noteText.trim(),
      patient: patientId,
      at: new Date().toLocaleString("en-GB"),
    }, ...prev]);
    setNoteText("");
    toast(`${noteType} saved to FHIR record.`);
    setNoteSaving(false);
  };

  // ── Discharge state ────────────────────────────────────────────────
  const [showDischarge, setShowDischarge] = useState(false);
  const [dischargePatient, setDischargePatient] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [dischargeBusy, setDischargeBusy] = useState(false);

  const submitDischarge = async () => {
    if (!dischargePatient.trim()) { toast("Select a patient for discharge."); return; }
    setDischargeBusy(true);
    try {
      await api.uiAction({ role: "doctor", patient_id: dischargePatient, label: `Discharge initiated: ${dischargeNotes.slice(0, 80)}`, type: "discharge" });
      setAdmitted((prev) => prev.filter((a) => a.fhirId !== dischargePatient));
      toast(`Patient ${dischargePatient} discharged successfully.`);
      setShowDischarge(false); setDischargeNotes("");
    } catch { toast("Discharge request failed — please try again."); } finally {
      setDischargeBusy(false);
    }
  };

  // ── Walk-in state ──────────────────────────────────────────────────
  const [showWalkin, setShowWalkin] = useState(false);
  const [walkinForm, setWalkinForm] = useState({ name: "", gender: "male", dob: "", phone: "", facility_id: "FAC-0001", mrn: "", chief_complaint: "", triage_level: "3" });
  const [walkinBusy, setWalkinBusy] = useState(false);

  const submitWalkin = async () => {
    if (!walkinForm.name.trim()) { toast("Patient name is required."); return; }
    setWalkinBusy(true);
    try {
      const res = await api.walkinCreate({
        full_name: walkinForm.name.trim(),
        gender: walkinForm.gender,
        dob: walkinForm.dob || undefined,
        phone: walkinForm.phone || undefined,
        facility_id: walkinForm.facility_id,
        mrn: walkinForm.mrn || undefined,
        chief_complaint: walkinForm.chief_complaint || undefined,
        triage_level: Number(walkinForm.triage_level),
        registered_by: "doctor",
      });
      toast(`Walk-in registered: UHID ${res.patient?.uhid ?? "—"}`);
      setShowWalkin(false);
      setWalkinForm({ name: "", gender: "male", dob: "", phone: "", facility_id: "FAC-0001", mrn: "", chief_complaint: "", triage_level: "3" });
    } catch (e) { toast(e instanceof Error ? e.message : "Walk-in registration failed."); } finally {
      setWalkinBusy(false);
    }
  };

  const [showAdmit, setShowAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState<AdmittedRow>({ bed: "", name: "", aflId: "", team: "IM", fhirId: patientId });

  const [showLab, setShowLab] = useState(false);
  const [labForm, setLabForm] = useState<{ panel: string; priority: string; notes: string; patientFhirId: string }>({
    panel: "U&E",
    priority: "Routine",
    notes: "",
    patientFhirId: patientId,
  });

  useEffect(() => {
    setLabForm((s) => ({ ...s, patientFhirId: patientId }));
  }, [patientId]);

  const commitLabOrder = (pid: string, panel: string, priority: string, notes: string, closeModal: boolean) => {
    const trimmed = pid.trim();
    if (!trimmed) {
      toast("Please provide a FHIR Patient ID.");
      return;
    }
    const now = new Date();
    const row: LabOrderRow = {
      id: `LAB-${now.getTime()}`,
      when: now.toISOString(),
      patientFhirId: trimmed,
      panel,
      priority,
      notes: notes.trim(),
    };
    setLabOrders((cur) => [row, ...cur]);
    if (closeModal) setShowLab(false);
    toast(`Lab order created for ${trimmed}: ${panel} (${priority}).`);
  };

  const queueRows = useMemo(
    () => [
      { t: "09:15", name: "Wangui Njoroge", id: "AFL-78841209", fhirId: "P001", reason: "Follow-up HTN", status: "Waiting", pri: "am" as const },
      { t: "09:40", name: "Omar Abdullahi", id: "AFL-87654321", fhirId: "P002", reason: "Post-op review", status: "In consult", pri: "g" as const },
      { t: "10:05", name: "Mary K.", id: "AFL-90123456", fhirId: "P005", reason: "Chest tightness", status: "Waiting", pri: "r" as const },
    ],
    []
  );

  const beds = useMemo(
    () => [
      { cls: "occ" as const, id: "01", pt: "Wangui N." },
      { cls: "occ" as const, id: "02", pt: "Omar A." },
      { cls: "free" as const, id: "03", pt: "Available" },
      { cls: "occ" as const, id: "04", pt: "Grace A." },
      { cls: "res" as const, id: "05", pt: "Reserved" },
      { cls: "occ" as const, id: "06", pt: "Fatuma A." },
      { cls: "free" as const, id: "07", pt: "Available" },
      { cls: "main" as const, id: "08", pt: "Isolation" },
      { cls: "occ" as const, id: "09", pt: "Samuel W." },
      { cls: "free" as const, id: "10", pt: "Available" },
    ],
    []
  );

  const patientIdPanel = (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="pnl-hd">
        <div>
          <div className="pnl-ti">Selected Patient</div>
          <div className="pnl-su">Change patient ID to load live chart panels</div>
        </div>
        <span className="tag te dot">LIVE</span>
      </div>
      <div className="pnl-bd">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end" }}>
          <div>
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
                fontFamily: "var(--mono)",
              }}
            />
            <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 6 }}>
              Auto-refreshes every 5–7 seconds from the edge gateway.
            </div>
          </div>
          <div className="g4" style={{ margin: 0 }}>
            <div className="kpi">
              <div className="kpi-l">Encounters</div>
              <div className="kpi-v">{summary.data?.encounters.length ?? 0}</div>
              <div className="kpi-su">recent</div>
            </div>
            <div className="kpi">
              <div className="kpi-l">Observations</div>
              <div className="kpi-v">{obs.data?.length ?? 0}</div>
              <div className="kpi-su">latest</div>
            </div>
            <div className="kpi">
              <div className="kpi-l">Med Requests</div>
              <div className="kpi-v">{meds.data?.length ?? 0}</div>
              <div className="kpi-su">active</div>
            </div>
            <div className="kpi">
              <div className="kpi-l">Status</div>
              <div className="kpi-v" style={{ fontSize: 18 }}>
                {apiErr ? "—" : "OK"}
              </div>
              <div className="kpi-su">gateway</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <button
            className="btn-s btn-sm"
            type="button"
            onClick={() => {
              setPage("chart");
              toast(`Opened patient chart for ${patientId}.`);
            }}
          >
            🗂️ Open Patient Chart →
          </button>
        </div>
      </div>
    </div>
  );

  const liveChart = (
    <>
      {apiErr && (
        <div className="errbanner is-visible" role="alert">
          <span>⚠️</span>
          <span>
            API not reachable or patient missing. Start FastAPI and seed data, then try <code>P001</code>.
            <br />
            {apiErr}
          </span>
        </div>
      )}

      {summary.data && (
        <div className="pt-banner">
          <div className="pt-in">
            <div className="pt-av" aria-hidden>
              👤
            </div>
            <div>
              <div className="pt-name">
                {summary.data.patient.given_name ?? ""} {summary.data.patient.family_name ?? ""}
              </div>
              <div className="pt-meta">
                NHI: <strong>{summary.data.patient.nhi_number}</strong> · Gender: {summary.data.patient.gender ?? "—"}
              </div>
            </div>
            <div className="pt-ids">
              <div className="pt-id-pill">Patient ID: {patientId}</div>
              <div className="pt-id-pill">FHIR: {summary.data.patient.id}</div>
            </div>
          </div>
          <div className="pt-stats">
            <div className="pt-stat">
              <div className="pt-sv">{summary.data.encounters.length}</div>
              <div className="pt-sl">Encounters</div>
            </div>
            <div className="pt-stat">
              <div className="pt-sv">{obs.data?.length ?? 0}</div>
              <div className="pt-sl">Obs</div>
            </div>
            <div className="pt-stat">
              <div className="pt-sv">{meds.data?.length ?? 0}</div>
              <div className="pt-sl">Meds</div>
            </div>
            <div className="pt-stat">
              <div className="pt-sv">4B</div>
              <div className="pt-sl">Ward</div>
            </div>
            <div className="pt-stat">
              <div className="pt-sv">{apiErr ? "—" : "OK"}</div>
              <div className="pt-sl">Status</div>
            </div>
          </div>
        </div>
      )}

      <div className="gcol3">
        <div className="panel">
          <div className="pnl-hd">
            <div>
              <div className="pnl-ti">Recent Encounters</div>
              <div className="pnl-su">From patient summary</div>
            </div>
            <span className="tag te dot">FHIR</span>
          </div>
          <div className="pnl-bd">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Status</th>
                  <th className="mono">Encounter</th>
                </tr>
              </thead>
              <tbody>
                {(summary.data?.encounters ?? []).map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 800, color: "var(--t1)" }}>{e.facility_name ?? e.facility_id}</td>
                    <td>
                      <span className={`tag ${e.status === "finished" ? "g" : "am"} dot`}>{e.status}</span>
                    </td>
                    <td className="mono">{e.id}</td>
                  </tr>
                ))}
                {!summary.loading && (summary.data?.encounters?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} style={{ fontSize: 11.5, color: "var(--t3)" }}>
                      No encounters found for this patient.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Latest Observations</div>
                <div className="pnl-su">Auto-refresh</div>
              </div>
              <span className="tag te dot">LIVE</span>
            </div>
            <div className="pnl-bd">
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
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 900, color: "var(--te)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No observations found.</div>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Medication Requests</div>
                <div className="pnl-su">From gateway</div>
              </div>
              <span className="tag te dot">FHIR</span>
            </div>
            <div className="pnl-bd">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(meds.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      border: "1.5px solid var(--bdr)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, color: "var(--t2)" }}>{m.medication_code ?? "Medication"}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)" }}>{m.status ?? "—"}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 4 }}>{m.dosage_text ?? "—"}</div>
                  </div>
                ))}
                {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No medication requests found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <DashboardShell
      shellVariant="doctor"
      title={DOC_TITLES[page]}
      crumb={page === "home" ? "Home" : DOC_TITLES[page]}
      portalSubtitle="Clinical Workstation"
      userInitials="JM"
      userName="Dr. James Mutuku"
      userEmail="dr.mutuku@knh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as DocPage)}
      onTopbarNotificationsClick={() => {
        setPage("notes");
        void uiAction("Opened notifications.");
      }}
      onTopbarStatusClick={() => {
        setPage("claims");
        void uiAction("Opened live status.");
      }}
      nav={[
        {
          label: "Clinical",
          items: [
            { id: "home", icon: "🏠", label: "Today's Overview" },
            { id: "chart", icon: "🗂️", label: "Patient Chart", badge: { text: patientId, tone: "amber" } },
            { id: "queue", icon: "👥", label: "Patient Queue", badge: { text: "8", tone: "red" } },
            { id: "patient", icon: "🩺", label: "Patient Workup" },
            { id: "ward", icon: "🛏️", label: "Ward / Beds", badge: { text: "3", tone: "amber" } },
            { id: "labs", icon: "🧪", label: "Lab Orders & Results", badge: { text: "5", tone: "green" } },
            { id: "prescriptions", icon: "💊", label: "Prescriptions" },
            { id: "imaging", icon: "🔬", label: "Imaging & Reports" },
          ],
        },
        {
          label: "Workflow",
          items: [
            { id: "notes", icon: "📝", label: "Clinical Notes" },
            { id: "referrals", icon: "📋", label: "Referrals" },
            { id: "procedures", icon: "🏥", label: "Procedures" },
            { id: "claims", icon: "🛡️", label: "UniHealth Claims" },
            { id: "schedule", icon: "📅", label: "My Schedule" },
          ],
        },
      ]}
    >
      <div className="doc">
        {(showAdmit || showLab) && (
          <div
            role="presentation"
            onClick={() => {
              setShowAdmit(false);
              setShowLab(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,.38)",
              zIndex: 999,
            }}
          />
        )}

        {showAdmit && (
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
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Admit patient</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowAdmit(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>FHIR Patient ID</label>
                  <input
                    className="mono"
                    value={admitForm.fhirId}
                    onChange={(e) => setAdmitForm((s) => ({ ...s, fhirId: e.target.value }))}
                    placeholder="e.g. P001"
                  />
                </div>
                <div className="ff">
                  <label>Bed</label>
                  <input value={admitForm.bed} onChange={(e) => setAdmitForm((s) => ({ ...s, bed: e.target.value }))} placeholder="e.g. 12" />
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Patient name</label>
                  <input value={admitForm.name} onChange={(e) => setAdmitForm((s) => ({ ...s, name: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="ff">
                  <label>AFL ID</label>
                  <input
                    className="mono"
                    value={admitForm.aflId}
                    onChange={(e) => setAdmitForm((s) => ({ ...s, aflId: e.target.value }))}
                    placeholder="e.g. AFL-12345678"
                  />
                </div>
              </div>
              <div className="ff">
                <label>Team</label>
                <select value={admitForm.team} onChange={(e) => setAdmitForm((s) => ({ ...s, team: e.target.value }))}>
                  <option value="IM">Internal Medicine</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Paeds">Paediatrics</option>
                  <option value="OBGYN">OB/GYN</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button className="btn-s" type="button" onClick={() => setShowAdmit(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={() => {
                    const bed = admitForm.bed.trim();
                    const name = admitForm.name.trim();
                    const aflId = admitForm.aflId.trim();
                    const fhirId = admitForm.fhirId.trim();
                    if (!bed || !name || !aflId || !fhirId) {
                      toast("Please fill Bed, Name, AFL ID and FHIR Patient ID.");
                      return;
                    }
                    setAdmitted((cur) => [{ ...admitForm, bed, name, aflId, fhirId }, ...cur]);
                    setShowAdmit(false);
                    toast(`Admitted ${name} to bed ${bed}.`);
                  }}
                >
                  Admit
                </button>
              </div>
            </div>
          </div>
        )}

        {showLab && (
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
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Order lab test</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowLab(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>FHIR Patient ID</label>
                  <input
                    className="mono"
                    value={labForm.patientFhirId}
                    onChange={(e) => setLabForm((s) => ({ ...s, patientFhirId: e.target.value }))}
                    placeholder="e.g. P001"
                  />
                </div>
                <div className="ff">
                  <label>Priority</label>
                  <select value={labForm.priority} onChange={(e) => setLabForm((s) => ({ ...s, priority: e.target.value }))}>
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Test panel</label>
                  <select value={labForm.panel} onChange={(e) => setLabForm((s) => ({ ...s, panel: e.target.value }))}>
                    <option>U&amp;E</option>
                    <option>FBC</option>
                    <option>LFT</option>
                    <option>CRP</option>
                    <option>HbA1c</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Notes</label>
                  <input value={labForm.notes} onChange={(e) => setLabForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Clinical indication (optional)" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button className="btn-s" type="button" onClick={() => setShowLab(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={() => commitLabOrder(labForm.patientFhirId, labForm.panel, labForm.priority, labForm.notes, true)}
                >
                  Create order
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`pg${page === "home" ? " on" : ""}`} id="pg-home">
          <div className="ph">
            <div>
              <div className="ph-ey">Internal Medicine · KNH</div>
              <div className="ph-ti">Good morning, Dr. Mutuku 👋</div>
              <div className="ph-su">Live view (polling) from the UniHealth edge gateway.</div>
            </div>
            <div className="ph-r">
              <button className="btn-s" type="button" onClick={() => { setPage("notes"); void uiAction("Opening note composer."); }}>
                📋 New Note
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={() => {
                  setPage("patient");
                  void uiAction("New order started.");
                }}
              >
                + New Order
              </button>
            </div>
          </div>
          {patientIdPanel}
          {alertsStrip}
          {liveChart}
        </div>

        <div className={`pg${page === "chart" ? " on" : ""}`} id="pg-chart">
          <div className="ph">
            <div>
              <div className="ph-ey">Unified Patient Record</div>
              <div className="ph-ti">Patient Chart</div>
              <div className="ph-su">
                Linked to FHIR Patient ID <span className="mono">{patientId}</span> · Summary, encounters, vitals and medications
              </div>
            </div>
            <div className="ph-r">
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("queue")}>
                ← Queue
              </button>
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("ward")}>
                🛏️ Ward
              </button>
              <button className="btn-p btn-sm" type="button" onClick={() => setPage("patient")}>
                🩺 Workup
              </button>
            </div>
          </div>
          {patientIdPanel}
          {liveChart}
        </div>

        <div className={`pg${page === "patient" ? " on" : ""}`} id="pg-patient">
          <div className="ph">
            <div>
              <div className="ph-ey">Clinical Workup</div>
              <div className="ph-ti">Patient Workup</div>
            </div>
            <div className="ph-r">
              <button
                className="btn-s btn-sm"
                type="button"
                onClick={() => { setDischargePatient(patientId); setShowDischarge(true); }}
              >
                🏠 Discharge
              </button>
              <button className="btn-s btn-sm" type="button" onClick={() => { setPage("referrals"); void uiAction("Opening referral form."); }}>
                📋 Refer
              </button>
              <button
                className="btn-s btn-sm"
                type="button"
                disabled={aiHintsLoading}
                onClick={() => void fetchAiHints()}
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.35)", color: "#00d4ff" }}
              >
                {aiHintsLoading ? "Analysing…" : "🤖 AI Hints"}
              </button>
              <button className="btn-p" type="button" onClick={() => { setPage("notes"); void uiAction("Add clinical note."); }}>
                📝 Add Note
              </button>
            </div>
          </div>
          {patientIdPanel}
          <div className="notice r" style={{ marginBottom: 14 }}>
            <span className="notice-e">🚨</span>
            <div className="notice-tx">
              <strong>Allergies on file:</strong> <span className="allergy">Penicillin — Anaphylaxis</span>
              <span className="allergy">Sulfa drugs — Rash</span>
            </div>
          </div>
          {alertsStrip}
          {aiHintsPanel}
          {liveChart}
          <div className="gcol3" style={{ marginTop: 14 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Care Plan</div>
                <button
                  className="btn-s btn-sm"
                  type="button"
                  onClick={() => {
                    setPage("notes");
                    void uiAction("Edit care plan.");
                  }}
                >
                  Edit
                </button>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 11.5, color: "var(--t2)", lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Monitoring:</strong> 4-hourly vitals, fluid balance chart
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Labs:</strong> Repeat U&amp;E; review observation stream from gateway
                  </div>
                  <div>
                    <strong>Review:</strong> Ward round
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Diagnoses</div>
                <button
                  className="btn-s btn-sm"
                  type="button"
                  onClick={() => {
                    setPage("notes");
                    void uiAction("Add diagnosis.");
                  }}
                >
                  + Add
                </button>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No coded diagnoses in demo — link FHIR Condition when available.</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`pg${page === "queue" ? " on" : ""}`} id="pg-queue">
          <div className="ph">
            <div>
              <div className="ph-ey">Outpatient</div>
              <div className="ph-ti">Patient Queue</div>
              <div className="ph-su">Today · Dr. James Mutuku · Ward 4B</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => setShowWalkin(true)}
            >
              + Add Walk-in
            </button>
          </div>
          <div className="g3" style={{ marginBottom: 14 }}>
            <div className="kpi" style={{ borderTop: "3px solid var(--r)" }}>
              <div className="kpi-l">Waiting</div>
              <div className="kpi-v" style={{ color: "var(--r)" }}>
                5
              </div>
              <div className="kpi-su">Avg wait: 22 min</div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--g)" }}>
              <div className="kpi-l">Seen Today</div>
              <div className="kpi-v" style={{ color: "var(--g)" }}>
                3
              </div>
              <div className="kpi-su">First patient: 08:15</div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--am)" }}>
              <div className="kpi-l">Follow-ups</div>
              <div className="kpi-v" style={{ color: "var(--am)" }}>
                1
              </div>
              <div className="kpi-su">Hypertension review</div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">All Patients — Today</div>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th className="mono">ID</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.t}</td>
                      <td style={{ fontWeight: 800 }}>{r.name}</td>
                      <td className="mono">{r.id}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span className={`tag ${r.pri} dot`}>{r.status}</span>
                      </td>
                      <td>
                        <button
                          className="btn-s btn-sm"
                          type="button"
                          onClick={() => {
                            setPatientId(r.fhirId);
                            setPage("chart");
                            toast(`Opened chart for ${r.name} (${r.fhirId}).`);
                          }}
                        >
                          Open chart →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`pg${page === "ward" ? " on" : ""}`} id="pg-ward">
          <div className="ph">
            <div>
              <div className="ph-ey">Ward Management</div>
              <div className="ph-ti">Ward 4B — Internal Medicine</div>
              <div className="ph-su">KNH Nairobi · Floor 4 · 16 beds total</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setAdmitForm({ bed: "", name: "", aflId: "", team: "IM", fhirId: patientId });
                setShowAdmit(true);
              }}
            >
              + Admit Patient
            </button>
          </div>
          <div className="g4" style={{ marginBottom: 14 }}>
            <div className="kpi" style={{ borderTop: "3px solid var(--r)" }}>
              <div className="kpi-l">Occupied</div>
              <div className="kpi-v" style={{ color: "var(--r)" }}>
                12
              </div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--g)" }}>
              <div className="kpi-l">Available</div>
              <div className="kpi-v" style={{ color: "var(--g)" }}>
                3
              </div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--am)" }}>
              <div className="kpi-l">Maintenance</div>
              <div className="kpi-v" style={{ color: "var(--am)" }}>
                1
              </div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--pu)" }}>
              <div className="kpi-l">Discharges</div>
              <div className="kpi-v" style={{ color: "var(--pu)" }}>
                3
              </div>
            </div>
          </div>
          <div className="g2" style={{ marginBottom: 14 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Bed Map — Ward 4B</div>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, fontSize: 11, color: "var(--t3)" }}>
                  <span>🔴 Occupied</span>
                  <span>🟢 Available</span>
                  <span>🟡 Reserved</span>
                  <span>🟣 Maintenance</span>
                </div>
                <div className="bed-grid">
                  {beds.map((b) => (
                    <div className={`bed ${b.cls}`} key={b.id}>
                      <div className="bed-e">{b.cls === "free" ? "🟢" : b.cls === "res" ? "🟡" : b.cls === "main" ? "🟣" : "🔴"}</div>
                      <div className="bed-id">Bed {b.id}</div>
                      <div className="bed-pt">{b.pt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Admitted Patients</div>
              </div>
              <div className="pnl-bd">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Bed</th>
                      <th>Patient</th>
                      <th className="mono">ID</th>
                      <th>Team</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {admitted.map((p) => (
                      <tr key={`${p.bed}-${p.aflId}`}>
                        <td className="mono">{p.bed}</td>
                        <td style={{ fontWeight: 800 }}>{p.name}</td>
                        <td className="mono">{p.aflId}</td>
                        <td>{p.team}</td>
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
                            Open chart →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={`pg${page === "labs" ? " on" : ""}`} id="pg-labs">
          <div className="ph">
            <div>
              <div className="ph-ey">Laboratory</div>
              <div className="ph-ti">Lab Orders &amp; Results</div>
              <div className="ph-su">Order, track and review investigations — observation stream below is live from gateway</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setLabForm((s) => ({ ...s, patientFhirId: patientId }));
                setShowLab(true);
              }}
            >
              + Order Lab Test
            </button>
          </div>
          <div className="notice r" style={{ marginBottom: 14 }}>
            <span className="notice-e">🚨</span>
            <div className="notice-tx">
              <strong>Demo alert:</strong> Review critical results in your LIS; below lists FHIR Observations for the selected patient.
            </div>
          </div>
          {patientIdPanel}
          <div className="g2">
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Recent results (Observations)</div>
              </div>
              <div className="pnl-bd">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th className="mono">Time</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(obs.data ?? []).map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700 }}>{o.code ?? "—"}</td>
                        <td className="mono">{o.effective_time ?? "—"}</td>
                        <td className="mono">{(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}</td>
                      </tr>
                    ))}
                    {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "var(--t3)" }}>
                          No observations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Order a Lab Test</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>FHIR Patient ID</label>
                  <input
                    className="mono"
                    value={labForm.patientFhirId}
                    onChange={(e) => setLabForm((s) => ({ ...s, patientFhirId: e.target.value }))}
                    placeholder="e.g. P001"
                  />
                </div>
                <div className="ff">
                  <label>Test Panel</label>
                  <select value={labForm.panel} onChange={(e) => setLabForm((s) => ({ ...s, panel: e.target.value }))}>
                    <option>U&amp;E</option>
                    <option>FBC</option>
                    <option>LFT</option>
                    <option>CRP</option>
                    <option>HbA1c</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Priority</label>
                  <select value={labForm.priority} onChange={(e) => setLabForm((s) => ({ ...s, priority: e.target.value }))}>
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Clinical Notes</label>
                  <textarea
                    placeholder="Clinical indication…"
                    style={{ minHeight: 70 }}
                    value={labForm.notes}
                    onChange={(e) => setLabForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                </div>
                <button
                  className="btn-p"
                  type="button"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => commitLabOrder(labForm.patientFhirId, labForm.panel, labForm.priority, labForm.notes, false)}
                >
                  Submit Lab Order
                </button>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Created lab orders</div>
                <div className="pnl-su">Stored locally (until backend order endpoints are added)</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowLab(true)}>
                + New
              </button>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">Order</th>
                    <th className="mono">When</th>
                    <th className="mono">Patient</th>
                    <th>Panel</th>
                    <th>Priority</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {labOrders.slice(0, 12).map((o) => (
                    <tr key={o.id}>
                      <td className="mono">{o.id}</td>
                      <td className="mono" style={{ color: "var(--t3)" }}>
                        {o.when.replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="mono">{o.patientFhirId}</td>
                      <td style={{ fontWeight: 700 }}>{o.panel}</td>
                      <td>
                        <span className={`tag ${o.priority === "STAT" ? "r" : o.priority === "Urgent" ? "am" : "g"}`}>{o.priority}</span>
                      </td>
                      <td style={{ color: "var(--t2)" }}>{o.notes || "—"}</td>
                    </tr>
                  ))}
                  {labOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                        No lab orders created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`pg${page === "prescriptions" ? " on" : ""}`} id="pg-prescriptions">
          <div
            style={{
              padding: "10px 14px",
              background: "var(--al)",
              border: "1px solid var(--amm)",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 11.5,
              color: "#78350f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>⛓️</span>
            <strong>Audit Trail Active:</strong> prescription actions are logged to the patient record.
          </div>
          <div className="ph">
            <div>
              <div className="ph-ey">Pharmacy</div>
              <div className="ph-ti">Prescriptions &amp; Medication Orders</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                void uiAction("Create prescription started.");
                window.requestAnimationFrame(() =>
                  document.getElementById("doc-rx-composer")?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }}
            >
              + New Prescription
            </button>
          </div>
          <div className="panel" id="doc-rx-composer" style={{ marginBottom: 14 }}>
            <div className="pnl-hd">
              <div className="pnl-ti">Prescription draft</div>
              <span className="tag te dot">LOCAL</span>
            </div>
            <div className="pnl-bd">
              <div className="g2">
                <div className="ff">
                  <label>Drug</label>
                  <input value={rxForm.drug} onChange={(e) => setRxForm((s) => ({ ...s, drug: e.target.value }))} placeholder="e.g. Amlodipine" />
                </div>
                <div className="ff">
                  <label>Dose</label>
                  <input value={rxForm.dose} onChange={(e) => setRxForm((s) => ({ ...s, dose: e.target.value }))} placeholder="e.g. 10mg OD" />
                </div>
              </div>
              <div className="ff">
                <label>Route</label>
                <select value={rxForm.route} onChange={(e) => setRxForm((s) => ({ ...s, route: e.target.value }))}>
                  <option value="PO">PO</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="TOP">Topical</option>
                </select>
              </div>
              <button
                className="btn-p"
                type="button"
                style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                onClick={() => {
                  if (!rxForm.drug.trim()) {
                    toast("Enter a drug name.");
                    return;
                  }
                  const id = `RX-${Date.now()}`;
                  setRxDrafts((cur) => [
                    { id, drug: rxForm.drug.trim(), dose: rxForm.dose.trim() || "—", route: rxForm.route, when: new Date().toISOString() },
                    ...cur,
                  ]);
                  toast(`Added draft prescription ${id}.`);
                }}
              >
                Add to draft list
              </button>
              {rxDrafts.length > 0 && (
                <table className="tbl" style={{ marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th className="mono">ID</th>
                      <th>Drug</th>
                      <th>Dose</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rxDrafts.slice(0, 12).map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.id}</td>
                        <td style={{ fontWeight: 700 }}>{r.drug}</td>
                        <td>{r.dose}</td>
                        <td>{r.route}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {patientIdPanel}
          {liveChart}
        </div>

        <div className={`pg${page === "imaging" ? " on" : ""}`} id="pg-imaging">
          <div className="ph">
            <div>
              <div className="ph-ey">Diagnostics</div>
              <div className="ph-ti">Imaging &amp; Reports</div>
              <div className="ph-su">Radiology orders and report inbox</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                const id = `IMG-${Date.now()}`;
                setImagingOrders((cur) => [
                  {
                    id,
                    when: new Date().toISOString(),
                    study: "CXR — PA (new order)",
                    patientId,
                    status: "Ordered",
                  },
                  ...cur,
                ]);
                void uiAction(`Imaging order ${id} created for ${patientId}.`);
              }}
            >
              + Order Imaging
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Pending reads</div>
              <span className="tag am dot">2</span>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Study</th>
                    <th>Patient</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {imagingOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700 }}>{o.study}</td>
                      <td className="mono">{o.patientId}</td>
                      <td>
                        <span className="tag am">{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>CXR — PA</td>
                    <td>Wangui Njoroge</td>
                    <td>
                      <span className="tag am">Awaiting report</span>
                    </td>
                  </tr>
                  <tr>
                    <td>CT Chest</td>
                    <td>Omar Abdullahi</td>
                    <td>
                      <span className="tag g">Reported</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`pg${page === "notes" ? " on" : ""}`} id="pg-notes">
          <div className="ph">
            <div>
              <div className="ph-ey">Documentation</div>
              <div className="ph-ti">Clinical Notes</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                void uiAction("New note created.");
                window.requestAnimationFrame(() =>
                  document.getElementById("doc-note-composer")?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }}
            >
              + New Note
            </button>
          </div>
          {patientIdPanel}
            <div className="panel" id="doc-note-composer">
            <div className="pnl-hd">
              <div className="pnl-ti">New Clinical Note</div>
            </div>
            <div className="pnl-bd">
              <div className="ff">
                <label>Note type</label>
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  <option>Progress Note</option>
                  <option>Assessment</option>
                  <option>Discharge Summary</option>
                  <option>Procedure Note</option>
                  <option>Referral Note</option>
                </select>
              </div>
              <div className="ff">
                <label>Note content</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="SOAP note, assessment, plan…"
                  style={{ minHeight: 120 }}
                />
              </div>
              <button
                className="btn-p"
                type="button"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={noteSaving || !noteText.trim()}
                onClick={() => void saveNote()}
              >
                {noteSaving ? "Saving…" : "Save Note to FHIR Record"}
              </button>
            </div>
          </div>

          {savedNotes.length > 0 && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="pnl-hd"><div className="pnl-ti">Saved Notes — This Session</div></div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead><tr><th>Type</th><th>Patient</th><th>Note</th><th>Time</th></tr></thead>
                  <tbody>
                    {savedNotes.map((n) => (
                      <tr key={n.id}>
                        <td><span className="tag b" style={{ fontSize: 9 }}>{n.type}</span></td>
                        <td className="mono" style={{ fontSize: 11 }}>{n.patient}</td>
                        <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{n.text}</td>
                        <td style={{ fontSize: 10, color: "var(--t3)" }}>{n.at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className={`pg${page === "referrals" ? " on" : ""}`} id="pg-referrals">
          <div className="ph">
            <div>
              <div className="ph-ey">Referral Management</div>
              <div className="ph-ti">Referrals</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setReferralAdds((r) => [
                  {
                    to: "Specialty — draft",
                    patient: patientId,
                    priority: "Routine",
                    status: "Draft",
                  },
                  ...r,
                ]);
                void uiAction("Referral draft added to the table.");
              }}
            >
              + New Referral
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Active referrals</div>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>To</th>
                    <th>Patient</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referralAdds.map((ref, idx) => (
                    <tr key={`nr-${idx}`}>
                      <td>{ref.to}</td>
                      <td className="mono">{ref.patient}</td>
                      <td>
                        <span className="tag am">{ref.priority}</span>
                      </td>
                      <td>
                        <span className="tag b">{ref.status}</span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>Cardiology — KNH</td>
                    <td>Wangui Njoroge</td>
                    <td>
                      <span className="tag am">Routine</span>
                    </td>
                    <td>
                      <span className="tag g">Sent</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={`pg${page === "procedures" ? " on" : ""}`} id="pg-procedures">
          <div className="ph">
            <div>
              <div className="ph-ey">Theatre / Procedures</div>
              <div className="ph-ti">Procedures</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                const id = `PROC-${Date.now()}`;
                setProcedureAdds((p) => [
                  { id, label: "Procedure hold — draft (consent pending)", when: new Date().toISOString().replace("T", " ").slice(0, 16) },
                  ...p,
                ]);
                void uiAction(`Procedure ${id} scheduled (draft).`);
              }}
            >
              + Schedule Procedure
            </button>
          </div>
          <div className="panel">
            <div className="pnl-bd" style={{ fontSize: 12, color: "var(--t3)" }}>
              {procedureAdds.length > 0 && (
                <ul style={{ marginBottom: 12, paddingLeft: 18, color: "var(--t2)", fontWeight: 650 }}>
                  {procedureAdds.map((p) => (
                    <li key={p.id} style={{ marginBottom: 6 }}>
                      <span className="mono">{p.id}</span> · {p.label} · <span className="mono">{p.when}</span>
                    </li>
                  ))}
                </ul>
              )}
              Procedure scheduling and consents.
            </div>
          </div>
        </div>

        <div className={`pg${page === "claims" ? " on" : ""}`} id="pg-claims">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth</div>
              <div className="ph-ti">Claims &amp; Authorisations</div>
            </div>
            <button
              className="btn-s"
              type="button"
              onClick={async () => {
                try {
                  await api.metricsJson();
                  void uiAction("Claims gateway sync OK.");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Sync failed — API unreachable.");
                }
              }}
            >
              ↺ Sync
            </button>
          </div>
          <div className="g3">
            <div className="kpi" style={{ borderTop: "3px solid var(--g)" }}>
              <div className="kpi-l">Approved Today</div>
              <div className="kpi-v" style={{ color: "var(--g)" }}>
                14
              </div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--am)" }}>
              <div className="kpi-l">Pending</div>
              <div className="kpi-v" style={{ color: "var(--am)" }}>
                3
              </div>
            </div>
            <div className="kpi" style={{ borderTop: "3px solid var(--r)" }}>
              <div className="kpi-l">Rejected</div>
              <div className="kpi-v" style={{ color: "var(--r)" }}>
                0
              </div>
            </div>
          </div>
        </div>

        <div className={`pg${page === "schedule" ? " on" : ""}`} id="pg-schedule">
          <div className="ph">
            <div>
              <div className="ph-ey">Calendar</div>
              <div className="ph-ti">My Schedule & Appointments</div>
              <div className="ph-su">Patient-booked appointments sync in real-time</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                const label = `Blocked — clinician hold (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
                setScheduleBlocks((b) => [{ t: "Hold", label }, ...b]);
                void uiAction("Calendar block added for today.");
              }}
            >
              + Block Time
            </button>
          </div>

          <div className="notice g">
            <span className="notice-ico">📅</span>
            <div className="notice-txt">Appointments booked by patients appear here automatically and sync with the nursing team.</div>
          </div>

          <div className="g2">
            <div>
              <PatientAppointmentsPanel />
            </div>
            <div>
              <div className="panel">
                <div className="pnl-hd"><div className="pnl-ti">Blocked / Fixed Schedule</div></div>
                <div className="pnl-bd">
                  <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.8 }}>
                    {scheduleBlocks.map((b, i) => (
                      <div key={`${b.label}-${i}`}>
                        <strong>{b.t}</strong> — {b.label}
                      </div>
                    ))}
                    <div><strong>08:00</strong> — Ward round 4B</div>
                    <div><strong>11:30</strong> — Outpatient clinic</div>
                    <div><strong>14:00</strong> — MDT — Cardiology</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Discharge Modal ─────────────────────────────────────────── */}
      {showDischarge && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowDischarge(false); }}>
          <div className="modal" style={{ maxWidth: 460, width: "95vw" }} role="dialog" aria-modal>
            <div className="modal-hd">
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)" }}>🏠 Discharge Patient</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>Complete the discharge summary</div>
              </div>
              <button type="button" className="sb-close" style={{ position: "static", marginLeft: "auto" }} onClick={() => setShowDischarge(false)}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Patient (FHIR ID)</label>
                <select
                  value={dischargePatient}
                  onChange={(e) => setDischargePatient(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}
                >
                  <option value="">— Select patient —</option>
                  {admitted.map((a) => <option key={a.fhirId} value={a.fhirId}>{a.name} (Bed {a.bed})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Discharge summary / instructions</label>
                <textarea
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  rows={4}
                  placeholder="Discharge diagnosis, follow-up plan, medications on discharge…"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-s btn-sm" onClick={() => setShowDischarge(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn-p btn-sm"
                  disabled={dischargeBusy || !dischargePatient}
                  onClick={() => void submitDischarge()}
                  style={{ minWidth: 130, justifyContent: "center" }}
                >
                  {dischargeBusy ? "Processing…" : "Confirm Discharge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Walk-in Registration Modal ──────────────────────────────── */}
      {showWalkin && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowWalkin(false); }}>
          <div className="modal" style={{ maxWidth: 500, width: "95vw" }} role="dialog" aria-modal>
            <div className="modal-hd">
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)" }}>🚶 Register Walk-in Patient</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>Quick registration + correlation across facilities</div>
              </div>
              <button type="button" className="sb-close" style={{ position: "static", marginLeft: "auto" }} onClick={() => setShowWalkin(false)}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 4 }}>Full name *</label>
                  <input value={walkinForm.name} onChange={(e) => setWalkinForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 4 }}>Gender</label>
                  <select value={walkinForm.gender} onChange={(e) => setWalkinForm((f) => ({ ...f, gender: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 4 }}>Phone</label>
                  <input value={walkinForm.phone} onChange={(e) => setWalkinForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+254…" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 4 }}>Chief complaint</label>
                  <input value={walkinForm.chief_complaint} onChange={(e) => setWalkinForm((f) => ({ ...f, chief_complaint: e.target.value }))}
                    placeholder="e.g. chest pain" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 4 }}>Triage level (1–5)</label>
                  <select value={walkinForm.triage_level} onChange={(e) => setWalkinForm((f) => ({ ...f, triage_level: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}>
                    <option value="1">1 — Resuscitation</option><option value="2">2 — Emergent</option><option value="3">3 — Urgent</option>
                    <option value="4">4 — Semi-urgent</option><option value="5">5 — Non-urgent</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-s btn-sm" onClick={() => setShowWalkin(false)}>Cancel</button>
                <button type="button" className="btn-p btn-sm" disabled={walkinBusy} onClick={() => void submitWalkin()} style={{ minWidth: 130, justifyContent: "center" }}>
                  {walkinBusy ? "Registering…" : "Register Walk-in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function PatientAppointmentsPanel() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api.appointments({ limit: 50 })
        .then(setAppts)
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const id = window.setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const confirm = async (id: string) => {
    await api.appointmentConfirm(id).catch(() => {});
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status: "confirmed" } : a));
  };

  if (loading) return <div className="panel"><div className="pnl-bd" style={{ fontSize: 12, color: "var(--t3)" }}>Loading patient appointments…</div></div>;

  const upcoming = appts.filter((a) => a.status !== "cancelled" && a.status !== "completed");

  return (
    <div className="panel">
      <div className="pnl-hd">
        <div>
          <div className="pnl-ti">Patient Appointments</div>
          <div className="pnl-su">{upcoming.length} upcoming · booked via portal</div>
        </div>
        <span className="tag g dot" style={{ fontSize: 9 }}>LIVE</span>
      </div>
      <div className="pnl-bd" style={{ padding: 0 }}>
        {upcoming.length === 0 ? (
          <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--t3)" }}>No upcoming patient appointments.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Patient</th><th>Date & Time</th><th>Department</th><th>Facility</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.patient_name}</td>
                  <td className="mono">{a.date} {a.time}</td>
                  <td>{a.department}</td>
                  <td style={{ fontSize: 11, color: "var(--t3)" }}>{a.facility}</td>
                  <td>
                    <span className={`tag ${a.status === "confirmed" ? "g" : a.status === "cancelled" ? "r" : "am"}`} style={{ fontSize: 9 }}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === "pending" && (
                      <button type="button" className="btn-s btn-sm" style={{ fontSize: 10, padding: "3px 9px" }} onClick={() => void confirm(a.id)}>
                        Confirm
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
