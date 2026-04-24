import { useEffect, useMemo, useState } from "react";
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

  type AdmittedRow = { bed: string; name: string; aflId: string; team: string; fhirId: string };
  type LabOrderRow = { id: string; when: string; patientFhirId: string; panel: string; priority: string; notes: string };

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

  const [showAdmit, setShowAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState<AdmittedRow>({ bed: "", name: "", aflId: "", team: "IM", fhirId: patientId });

  const [showLab, setShowLab] = useState(false);
  const [labForm, setLabForm] = useState<{ panel: string; priority: string; notes: string; patientFhirId: string }>({
    panel: "U&E",
    priority: "Routine",
    notes: "",
    patientFhirId: patientId,
  });

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
      title={DOC_TITLES[page]}
      crumb={page === "home" ? "Home" : DOC_TITLES[page]}
      portalSubtitle="Clinical Workstation"
      userInitials="JM"
      userName="Dr. James Mutuku"
      userEmail="dr.mutuku@knh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as DocPage)}
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
                  onClick={() => {
                    const pid = labForm.patientFhirId.trim();
                    if (!pid) {
                      toast("Please provide a FHIR Patient ID.");
                      return;
                    }
                    const now = new Date();
                    const row: LabOrderRow = {
                      id: `LAB-${now.getTime()}`,
                      when: now.toISOString(),
                      patientFhirId: pid,
                      panel: labForm.panel,
                      priority: labForm.priority,
                      notes: labForm.notes.trim(),
                    };
                    setLabOrders((cur) => [row, ...cur]);
                    setShowLab(false);
                    toast(`Lab order created for ${pid}: ${labForm.panel} (${labForm.priority}).`);
                  }}
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
              <button className="btn-s" type="button" onClick={() => { setPage("notes"); toast("Opening note composer (demo)."); }}>
                📋 New Note
              </button>
              <button className="btn-p" type="button" onClick={() => toast("Order entry coming soon (demo).")}>
                + New Order
              </button>
            </div>
          </div>
          {patientIdPanel}
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
              <button className="btn-s btn-sm" type="button" onClick={() => toast("Discharge workflow coming soon (demo).")}>
                🏠 Discharge
              </button>
              <button className="btn-s btn-sm" type="button" onClick={() => { setPage("referrals"); toast("Opening referral form (demo)."); }}>
                📋 Refer
              </button>
              <button className="btn-p" type="button" onClick={() => { setPage("notes"); toast("Add clinical note (demo)."); }}>
                📝 Add Note
              </button>
            </div>
          </div>
          {patientIdPanel}
          <div className="notice r" style={{ marginBottom: 14 }}>
            <span className="notice-e">🚨</span>
            <div className="notice-tx">
              <strong>Allergies on file (demo):</strong> <span className="allergy">Penicillin — Anaphylaxis</span>
              <span className="allergy">Sulfa drugs — Rash</span>
            </div>
          </div>
          {liveChart}
          <div className="gcol3" style={{ marginTop: 14 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Care Plan</div>
                <button className="btn-s btn-sm" type="button" onClick={() => toast("Edit care plan coming soon (demo).")}>
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
                    <strong>Review:</strong> Ward round — demo UI
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Diagnoses</div>
                <button className="btn-s btn-sm" type="button" onClick={() => toast("Add diagnosis coming soon (demo).")}>
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
            <button className="btn-p" type="button" onClick={() => toast("Walk-in registration coming soon (demo).")}>
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
                  <label>Patient</label>
                  <select>
                    <option>Selected ID: {patientId}</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Test Panel</label>
                  <select>
                    <option>U&amp;E</option>
                    <option>FBC</option>
                    <option>LFT</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Priority</label>
                  <select>
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Clinical Notes</label>
                  <textarea placeholder="Clinical indication…" style={{ minHeight: 70 }} />
                </div>
                <button className="btn-p" type="button" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Lab order submitted (demo).")}>
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
            <strong>Audit Trail Active:</strong> prescription actions are logged to the patient record (demo).
          </div>
          <div className="ph">
            <div>
              <div className="ph-ey">Pharmacy</div>
              <div className="ph-ti">Prescriptions &amp; Medication Orders</div>
            </div>
            <button className="btn-p" type="button" onClick={() => toast("Create prescription coming soon (demo).")}>
              + New Prescription
            </button>
          </div>
          {patientIdPanel}
          {liveChart}
        </div>

        <div className={`pg${page === "imaging" ? " on" : ""}`} id="pg-imaging">
          <div className="ph">
            <div>
              <div className="ph-ey">Diagnostics</div>
              <div className="ph-ti">Imaging &amp; Reports</div>
              <div className="ph-su">Radiology orders and report inbox (demo layout)</div>
            </div>
            <button className="btn-p" type="button" onClick={() => toast("Imaging order created (demo).")}>
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
            <button className="btn-p" type="button" onClick={() => toast("New note created (demo).")}>
              + New Note
            </button>
          </div>
          {patientIdPanel}
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Progress Note</div>
            </div>
            <div className="pnl-bd">
              <div className="ff">
                <label>Note type</label>
                <select>
                  <option>Progress Note</option>
                  <option>Assessment</option>
                  <option>Discharge Summary</option>
                </select>
              </div>
              <div className="ff">
                <label>Note</label>
                <textarea placeholder="SOAP note, assessment, plan…" style={{ minHeight: 90 }} />
              </div>
              <button className="btn-p" type="button" style={{ width: "100%", justifyContent: "center" }} onClick={() => toast("Note saved to record (demo).")}>
                Save Note to FHIR Record
              </button>
            </div>
          </div>
        </div>

        <div className={`pg${page === "referrals" ? " on" : ""}`} id="pg-referrals">
          <div className="ph">
            <div>
              <div className="ph-ey">Referral Management</div>
              <div className="ph-ti">Referrals</div>
            </div>
            <button className="btn-p" type="button" onClick={() => toast("Referral created (demo).")}>
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
            <button className="btn-p" type="button" onClick={() => toast("Procedure scheduled (demo).")}>
              + Schedule Procedure
            </button>
          </div>
          <div className="panel">
            <div className="pnl-bd" style={{ fontSize: 12, color: "var(--t3)" }}>
              Procedure scheduling and consents — demo UI matching HTML layout. Wire to backend when available.
            </div>
          </div>
        </div>

        <div className={`pg${page === "claims" ? " on" : ""}`} id="pg-claims">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth</div>
              <div className="ph-ti">Claims &amp; Authorisations</div>
            </div>
            <button className="btn-s" type="button" onClick={() => toast("Claims synced (demo).")}>
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
              <div className="ph-ti">My Schedule</div>
            </div>
            <button className="btn-p" type="button" onClick={() => toast("Blocking time coming soon (demo).")}>
              + Block Time
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Today</div>
            </div>
            <div className="pnl-bd">
              <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.8 }}>
                <div>
                  <strong>08:00</strong> — Ward round 4B
                </div>
                <div>
                  <strong>11:30</strong> — Outpatient clinic
                </div>
                <div>
                  <strong>14:00</strong> — MDT — Cardiology
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
