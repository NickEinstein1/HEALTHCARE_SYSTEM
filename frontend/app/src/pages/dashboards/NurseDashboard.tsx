import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

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
  const toast = useDashboardToast();
  const [patientId, setPatientId] = useState("P001");
  const obs = usePolling(() => api.observations(patientId, 20), { intervalMs: 4000 });
  const summary = usePolling(() => api.patientSummary(patientId, 5), { intervalMs: 8000 });
  const meds = usePolling(() => api.medicationRequests(patientId, 20), { intervalMs: 8000 });
  const supplyRequests = usePolling(() => api.nurseSupplies(50), { intervalMs: 5000 });
  const [page, setPage] = useState<NursePage>("home");
  const [searchQuery, setSearchQuery] = useState("");

  const uiAction = async (label: string, extra?: Record<string, unknown>) => {
    try {
      await api.uiAction({ role: "nurse", page, label, ...extra });
    } catch (e) {
      // Keep the UX clean even if the API is offline.
    }
    toast(label);
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
  const [incidentForm, setIncidentForm] = useState<{ type: string; severity: string; patient_id: string; notes: string }>({
    type: "Patient fall",
    severity: "Moderate",
    patient_id: patientId,
    notes: "",
  });

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
        toast(q ? `Searching “${q}” (demo filter) — showing patient list.` : "Showing patient list.");
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
              <div style={{ fontWeight: 950, color: "var(--t1)" }}>Sign & submit handover</div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowHandover(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div className="g2">
                <div className="ff">
                  <label>Ward</label>
                  <input value={handoverForm.ward} onChange={(e) => setHandoverForm((s) => ({ ...s, ward: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>Shift</label>
                  <input value={handoverForm.shift} onChange={(e) => setHandoverForm((s) => ({ ...s, shift: e.target.value }))} />
                </div>
              </div>
              <div className="ff">
                <label>Author</label>
                <input value={handoverForm.author} onChange={(e) => setHandoverForm((s) => ({ ...s, author: e.target.value }))} />
              </div>
              <div className="ff">
                <label>Ward summary</label>
                <textarea value={handoverForm.summary} onChange={(e) => setHandoverForm((s) => ({ ...s, summary: e.target.value }))} style={{ minHeight: 90 }} />
              </div>
              <div className="ff">
                <label>Patients requiring special attention</label>
                <textarea
                  value={handoverForm.special_attention}
                  onChange={(e) => setHandoverForm((s) => ({ ...s, special_attention: e.target.value }))}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="ff">
                <label>
                  <input
                    type="checkbox"
                    checked={handoverForm.signed}
                    onChange={(e) => setHandoverForm((s) => ({ ...s, signed: e.target.checked }))}
                    style={{ marginRight: 8 }}
                  />
                  Signed
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-s" type="button" onClick={() => setShowHandover(false)}>
                  Cancel
                </button>
                <button
                  className="btn-p"
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.nurseHandoverSubmit(handoverForm);
                      setShowHandover(false);
                      toast(`Handover submitted (${res.id ?? "ok"}).`);
                    } catch (e) {
                      toast(`Handover submit failed: ${String(e)}`);
                    }
                  }}
                >
                  Submit handover
                </button>
              </div>
            </div>
          </div>
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

        {showIncident && (
          <>
            <div
              role="presentation"
              onClick={() => setShowIncident(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.38)", zIndex: 999 }}
            />
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
                <div style={{ fontWeight: 950, color: "var(--t1)" }}>Report incident</div>
                <button className="btn-s btn-sm" type="button" onClick={() => setShowIncident(false)}>
                  Close
                </button>
              </div>
              <div style={{ padding: 16 }}>
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
                  <label>Notes</label>
                  <textarea value={incidentForm.notes} onChange={(e) => setIncidentForm((s) => ({ ...s, notes: e.target.value }))} style={{ minHeight: 90 }} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn-s" type="button" onClick={() => setShowIncident(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn-p"
                    type="button"
                    onClick={async () => {
                      try {
                        const pid = incidentForm.patient_id.trim() || patientId;
                        const res = await api.nurseIncident({
                          patient_id: pid,
                          type: incidentForm.type,
                          severity: incidentForm.severity,
                          notes: incidentForm.notes.trim(),
                        });
                        setShowIncident(false);
                        toast(`Incident submitted (${res.id ?? "created"}).`);
                      } catch (e) {
                        toast(`Incident submit failed: ${String(e)}`);
                      }
                    }}
                  >
                    Submit incident
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

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
            <button type="button" onClick={() => toast("Sync triggered.")}>
              Sync Now
            </button>
          </div>

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
                onClick={() => toast("Escalation queued.")}
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
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button" onClick={() => toast("Call doctor request sent.")}>
                      📞 Call Doctor
                    </button>
                    <button className="btn-s" style={{ justifyContent: "center" }} type="button" onClick={() => toast("Transfer request submitted.")}>
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
            <button className="btn-p" type="button" onClick={() => toast("Admit patient request sent.")}>
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
              <button className="btn-p btn-sm" type="button" onClick={() => setPage("vitals")}>
                💗 Vitals
              </button>
              <button className="btn-pg btn-sm" type="button" onClick={() => setPage("mar")}>
                💊 MAR
              </button>
            </div>
          </div>

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

        <div className={pgOn(page === "triage")} id="pg-triage">
          <div className="ph">
            <div>
              <div className="ph-ey">A&E / Emergency</div>
              <div className="ph-ti">Triage Queue</div>
              <div className="ph-su">Emergency and walk-in patients awaiting triage assessment</div>
            </div>
            <button className="btn-p" type="button" onClick={() => toast("Triage entry opened.")}>
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
                          onClick={() => void uiAction("Triage opened.", { triage_patient: r.name, triage_id: r.id })}
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
        </div>

        <div className={pgOn(page === "vitals")} id="pg-vitals">
          <div className="ph">
            <div>
              <div className="ph-ey">Observation Chart</div>
              <div className="ph-ti">Record Vitals</div>
              <div className="ph-su">Ward 4B · 4-hourly observations schedule</div>
            </div>
            <button className="btn-vitals" type="button" onClick={() => toast("Vitals entry ready.")}>
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
            <div className="panel">
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
          <div className="ph">
            <div>
              <div className="ph-ey">Shift Documentation</div>
              <div className="ph-ti">Shift Handover</div>
              <div className="ph-su">Morning handover notes — Ward 4B · 07:00 to 15:00</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setShowHandover(true);
              }}
            >
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
                    <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 3, fontWeight: 650 }}>
                      Based on vitals, MAR and tasks for this shift
                    </div>
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
                <button
                  className="btn-p"
                  style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
                  type="button"
                  onClick={() => setShowHandover(true)}
                >
                  Sign & Submit Handover
                </button>
              </div>
            </div>
          </div>

          {/* Clean UI: keep endpoints working, hide system tables/badges */}
        </div>

        <div className={pgOn(page === "incidents")} id="pg-incidents">
          <div className="ph">
            <div>
              <div className="ph-ey">Safety</div>
              <div className="ph-ti">Incident Reports</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setIncidentForm((s) => ({ ...s, patient_id: patientId }));
                setShowIncident(true);
              }}
            >
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
                    <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
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
                    <td className="mono" style={{ color: "var(--t2)", fontWeight: 700 }}>
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
