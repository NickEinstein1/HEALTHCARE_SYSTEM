import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell } from "../../components/dashboard/DashboardShell";

type NursePage =
  | "home"
  | "patients"
  | "triage"
  | "vitals"
  | "mar"
  | "tasks"
  | "fluids"
  | "wounds"
  | "handover"
  | "incidents"
  | "supplies";

const NURSE_TITLES: Record<NursePage, string> = {
  home: "Shift Overview",
  patients: "My Patients",
  triage: "Triage Queue",
  vitals: "Record Vitals",
  mar: "Medication Administration",
  tasks: "Tasks & Care Plans",
  fluids: "Fluid Balance",
  wounds: "Wound Care",
  handover: "Shift Handover",
  incidents: "Incident Reports",
  supplies: "Supplies & Inventory",
};

const NURSE_CRUMBS: Record<NursePage, string> = {
  home: "Home",
  patients: "Nursing › Patients",
  triage: "Nursing › Triage",
  vitals: "Nursing › Vitals",
  mar: "Nursing › MAR",
  tasks: "Nursing › Tasks",
  fluids: "Nursing › Fluids",
  wounds: "Nursing › Wounds",
  handover: "Docs › Handover",
  incidents: "Docs › Incidents",
  supplies: "Docs › Supplies",
};

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

export function NurseDashboard() {
  const [patientId, setPatientId] = useState("P001");
  const obs = usePolling(() => api.observations(patientId, 20), { intervalMs: 4000 });

  const [page, setPage] = useState<NursePage>("home");

  const triageRows = useMemo(
    () => [
      {
        priTone: "r" as const,
        dot: "red" as const,
        priLabel: "Immediate",
        name: "James Otieno",
        id: "AFL-45678901",
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
      { bed: "01", name: "Wangui Njoroge", id: "AFL-78841209", dx: "AKI / hyperkalaemia", tag: "r" as const, tagL: "Critical" },
      { bed: "02", name: "Omar Abdullahi", id: "AFL-87654321", dx: "Post-op abdomen", tag: "b" as const, tagL: "Surgical" },
      { bed: "04", name: "Adhiambo Grace", id: "AFL-11223344", dx: "Meningitis query", tag: "am" as const, tagL: "Neuro obs" },
      { bed: "07", name: "Fatuma Ali", id: "AFL-55667788", dx: "Sepsis — IV abx", tag: "am" as const, tagL: "Antibiotics" },
      { bed: "10", name: "Mary Kamau", id: "AFL-56789012", dx: "Cellulitis", tag: "g" as const, tagL: "Stable" },
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
      title={NURSE_TITLES[page]}
      crumb={NURSE_CRUMBS[page]}
      portalSubtitle="Nurse Station"
      userInitials="AM"
      userName="Nurse Atieno"
      userEmail="n.atieno@knh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as NursePage)}
      nav={[
        {
          label: "Ward",
          items: [
            { id: "home", icon: "🏠", label: "Shift Overview" },
            { id: "patients", icon: "🧑‍⚕️", label: "My Patients", badge: { text: "12", tone: "green" } },
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
            { id: "supplies", icon: "📦", label: "Supplies" },
          ],
        },
      ]}
    >
      <div className="nurse">
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
              <button className="btn-p" type="button" onClick={() => setPage("vitals")}>
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
            <button type="button">Sync Now</button>
          </div>

          <div className="ai-widget teal" style={{ animationDelay: ".08s" }}>
            <div className="ai-widget-hd">
              <div>
                <div className="ai-widget-ti">🤖 AI Early Warning Score (NEWS2)</div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>
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
                    <button className="btn-p" style={{ justifyContent: "center" }} type="button" onClick={() => setPage("vitals")}>
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
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button">
                      📞 Call Doctor
                    </button>
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button">
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
                  <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 6 }}>Observation feed auto-refresh every 4 seconds.</div>
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
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 900, color: "var(--gd)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No observations yet.</div>
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
            <button className="btn-p" type="button">
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
                        <button className="btn-s btn-sm" type="button">
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

        <div className={pgOn(page === "triage")} id="pg-triage">
          <div className="ph">
            <div>
              <div className="ph-ey">A&E / Emergency</div>
              <div className="ph-ti">Triage Queue</div>
              <div className="ph-su">Emergency and walk-in patients awaiting triage assessment</div>
            </div>
            <button className="btn-p" type="button">
              + Triage New Patient
            </button>
          </div>
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
                          color: r.priTone === "r" ? "var(--r)" : r.priTone === "am" ? "var(--am)" : "var(--t3)",
                          fontWeight: r.primary ? 800 : 600,
                        }}
                      >
                        {r.wait}
                      </td>
                      <td>{r.nurse}</td>
                      <td>
                        <button className={`${r.primary ? "btn-p" : "btn-s"} btn-sm`} type="button">
                          Triage →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "vitals")} id="pg-vitals">
          <div className="ph">
            <div>
              <div className="ph-ey">Observation Chart</div>
              <div className="ph-ti">Record Vitals</div>
              <div className="ph-su">Ward 4B · 4-hourly observations schedule</div>
            </div>
            <button className="btn-p" type="button">
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
          <div className="gcol3">
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
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "var(--gd)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No observations for this patient.</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Quick Vitals Entry</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Patient</label>
                  <select defaultValue="">
                    <option value="">Wangui Njoroge — Bed 01</option>
                    <option>Adhiambo Grace — Bed 04</option>
                    <option>Fatuma Ali — Bed 07</option>
                    <option>Mary Kamau — Bed 10</option>
                  </select>
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>BP (mmHg)</label>
                    <input placeholder="e.g. 120/80" />
                  </div>
                  <div className="ff">
                    <label>HR (bpm)</label>
                    <input type="number" placeholder="72" />
                  </div>
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>Temp (°C)</label>
                    <input type="number" step={0.1} placeholder="36.8" />
                  </div>
                  <div className="ff">
                    <label>SpO₂ (%)</label>
                    <input type="number" placeholder="98" />
                  </div>
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>RR (breaths/min)</label>
                    <input type="number" placeholder="16" />
                  </div>
                  <div className="ff">
                    <label>Glucose (mmol/L)</label>
                    <input type="number" step={0.1} placeholder="5.4" />
                  </div>
                </div>
                <div className="ff">
                  <label>AVPU / GCS</label>
                  <select defaultValue="a">
                    <option value="a">A — Alert</option>
                    <option>V — Voice response</option>
                    <option>P — Pain response</option>
                    <option>U — Unresponsive</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Pain Score (0–10)</label>
                  <input type="number" min={0} max={10} placeholder="0" />
                </div>
                <div className="ff">
                  <label>Notes</label>
                  <textarea placeholder="Any concerns or observations…" style={{ minHeight: 60 }} />
                </div>
                <button className="btn-p" style={{ width: "100%", justifyContent: "center" }} type="button">
                  Save Vitals to EHR
                </button>
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
            <button className="btn-p" type="button">
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
        </div>

        <div className={pgOn(page === "fluids")} id="pg-fluids">
          <div className="ph">
            <div>
              <div className="ph-ey">24-hr Fluid Chart</div>
              <div className="ph-ti">Fluid Balance</div>
              <div className="ph-su">Intake vs output monitoring — Ward 4B</div>
            </div>
            <button className="btn-p" type="button">
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
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", marginTop: 2 }}>TOTAL INTAKE</div>
                  </div>
                  <div style={{ background: "var(--gl)", border: "1.5px solid var(--gm)", borderRadius: 9, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>🟢</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>740 ml</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", marginTop: 2 }}>TOTAL OUTPUT</div>
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
                      <td className="mono" style={{ color: "var(--t3)" }}>
                        07:00
                      </td>
                      <td>IV Saline 0.9%</td>
                      <td>
                        <span className="tag b">IV</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>500 ml</td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ color: "var(--t3)" }}>
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
        </div>

        <div className={pgOn(page === "wounds")} id="pg-wounds">
          <div className="ph">
            <div>
              <div className="ph-ey">Wound Management</div>
              <div className="ph-ti">Wound Care & Dressings</div>
            </div>
            <button className="btn-p" type="button">
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
                      <button className="btn-p btn-sm" type="button">
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
                      <button className="btn-s btn-sm" type="button">
                        Record
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "handover")} id="pg-handover">
          <div className="ph">
            <div>
              <div className="ph-ey">Shift Documentation</div>
              <div className="ph-ti">Shift Handover</div>
              <div className="ph-su">Morning handover notes — Ward 4B · 07:00 to 15:00</div>
            </div>
            <button className="btn-p" type="button">
              ✍ Sign Handover
            </button>
          </div>

          <div className="handover-hero">
            <div className="ho-in">
              <div className="ho-ti">Morning Shift Handover — Ward 4B</div>
              <div className="ho-su">Nurse Atieno Achieng (NCK/RN/2021/08432) · Handing over to Nurse Omondi (Night) · 15:00</div>
              <div className="ho-grid">
                <div className="ho-stat">
                  <div className="ho-v">12</div>
                  <div className="ho-l">Patients</div>
                </div>
                <div className="ho-stat">
                  <div className="ho-v" style={{ color: "#f87171" }}>
                    2
                  </div>
                  <div className="ho-l">Critical</div>
                </div>
                <div className="ho-stat">
                  <div className="ho-v" style={{ color: "#fbbf24" }}>
                    3
                  </div>
                  <div className="ho-l">Pending Tasks</div>
                </div>
                <div className="ho-stat">
                  <div className="ho-v" style={{ color: "#86efac" }}>
                    18
                  </div>
                  <div className="ho-l">Completed</div>
                </div>
              </div>
            </div>
          </div>

          <div className="g2">
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Incoming Handover Notes</div>
                <div className="pnl-su">From Night Shift — Nurse Osei</div>
              </div>
              <div className="pnl-bd">
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--t2)",
                    lineHeight: 1.8,
                    background: "var(--bg)",
                    borderRadius: 9,
                    padding: 14,
                    border: "1.5px solid var(--bdr)",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>Bed 01 — Wangui Njoroge:</strong> Critical. K⁺ 6.8 on 03:00 bloods. Dr. Mutuku on call was notified.
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Bed 02 — Omar Abdullahi:</strong> Abdominal pain well managed with morphine. Kept NBM for possible surgery today.
                  </div>
                  <div>
                    <strong>General:</strong> Bed 09 reserved for incoming patient from A&E.
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="ai-widget amber" style={{ marginBottom: 16 }}>
                <div className="ai-widget-hd">
                  <div>
                    <div className="ai-widget-ti">🤖 AI Shift Summary (Auto-generated)</div>
                    <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>Based on vitals, MAR and tasks for this shift</div>
                  </div>
                  <span className="tag am">07:00–15:00</span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico">📊</span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Shift Statistics</div>
                    <div className="ai-row-su">12 patients · 48 vitals · 36 medications given · 0 missed doses</div>
                  </div>
                </div>
                <div className="audit-notice">⛓️ FHIR synced · Shift audit trail verified</div>
              </div>
              <div className="pnl-hd">
                <div className="pnl-ti">My Outgoing Notes</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Ward Summary</label>
                  <textarea style={{ minHeight: 100 }} defaultValue="Ward 4B — 12 patients stable except Bed 01 (critical K⁺). ECG continuous." />
                </div>
                <div className="ff">
                  <label>Patients Requiring Special Attention</label>
                  <textarea style={{ minHeight: 80 }} defaultValue="BED 01: K⁺ repeat due at 13:00. Strict fluid restriction 1.5L." />
                </div>
                <button className="btn-p" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} type="button">
                  Sign & Submit Handover
                </button>
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
            <button className="btn-p" type="button">
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
                    <th>Patient</th>
                    <th>Reported By</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono" style={{ color: "var(--t3)" }}>
                      03 Mar 02:15
                    </td>
                    <td>Near-miss — medication</td>
                    <td>Bed 03 — Kamau J.</td>
                    <td>Nurse Osei</td>
                    <td>
                      <span className="tag am">Moderate</span>
                    </td>
                    <td>
                      <span className="tag b">Under Review</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="mono" style={{ color: "var(--t3)" }}>
                      01 Mar 18:40
                    </td>
                    <td>Patient fall</td>
                    <td>Bed 11 — Ali H.</td>
                    <td>Nurse Atieno</td>
                    <td>
                      <span className="tag am">Moderate</span>
                    </td>
                    <td>
                      <span className="tag g">Resolved</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "supplies")} id="pg-supplies">
          <div className="ph">
            <div>
              <div className="ph-ey">Ward 4B</div>
              <div className="ph-ti">Supplies & Inventory</div>
              <div className="ph-su">Stock levels and reorder requests</div>
            </div>
            <button className="btn-p" type="button">
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
                      <button className="btn-p btn-sm" type="button">
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
                      <button className="btn-s btn-sm" type="button">
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
