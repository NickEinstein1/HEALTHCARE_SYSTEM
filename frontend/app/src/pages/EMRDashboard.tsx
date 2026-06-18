import { useMemo, useState } from "react";
import { ApiRefPanel } from "../components/dashboard/ApiRefPanel";
import { DashboardShell, useDashboardToast } from "../components/dashboard/DashboardShell";
import { DashboardSubTabs } from "../components/dashboard/DashboardSubTabs";
import { FormModal } from "../components/FormModal";
import { buildV2ModuleNav } from "../lib/moduleNav";
import "../styles/emr-module.css";

const API_ENDPOINTS = [
  { method: "GET", path: "/api/emr/patients?query=", desc: "Search patients by name/ID" },
  { method: "GET", path: "/api/emr/patient/{id}", desc: "Get patient details & full record" },
  { method: "POST", path: "/api/emr/patient", desc: "Create new patient record" },
  { method: "PUT", path: "/api/emr/patient/{id}", desc: "Update patient record" },
  { method: "POST", path: "/api/emr/patient/{id}/note", desc: "Add SOAP clinical note" },
  { method: "GET", path: "/fhir/Patient/{id}", desc: "FHIR R5 patient resource" },
];

type ChartTab = "notes" | "labs" | "meds" | "history" | "orders" | "api";

type PatientRow = {
  initials: string;
  name: string;
  id: string;
  age: number;
  gender: string;
  condition: string;
  status: string;
  dob: string;
  bloodType: string;
  location: string;
  weight: number;
};

const PATIENTS: PatientRow[] = [
  { initials: "MW", name: "Mary Wanjiku", id: "KE-00847", age: 32, gender: "F", condition: "Hypertension", status: "High Risk", dob: "12 Mar 1993", bloodType: "B+", location: "Nairobi", weight: 68 },
  { initials: "JO", name: "James Omondi", id: "KE-00848", age: 45, gender: "M", condition: "Diabetes T2", status: "Follow-up", dob: "03 Jun 1980", bloodType: "O+", location: "Kisumu", weight: 82 },
  { initials: "GK", name: "Grace Kamau", id: "KE-00849", age: 28, gender: "F", condition: "ANC Visit", status: "Stable", dob: "18 Jan 1997", bloodType: "A+", location: "Nakuru", weight: 64 },
  { initials: "PN", name: "Peter Njoroge", id: "KE-00850", age: 62, gender: "M", condition: "Cardiac", status: "Critical", dob: "22 Sep 1963", bloodType: "AB+", location: "Mombasa", weight: 76 },
  { initials: "AM", name: "Alice Muthoni", id: "KE-00851", age: 55, gender: "F", condition: "Oncology", status: "In Treatment", dob: "05 Apr 1970", bloodType: "B-", location: "Nairobi", weight: 61 },
  { initials: "SK", name: "Samuel Kariuki", id: "KE-00852", age: 8, gender: "M", condition: "Paediatric", status: "Stable", dob: "14 Nov 2017", bloodType: "O-", location: "Eldoret", weight: 28 },
];

const CHART_TABS: { id: ChartTab; label: string }[] = [
  { id: "notes", label: "SOAP Notes" },
  { id: "labs", label: "Lab Results" },
  { id: "meds", label: "Medications" },
  { id: "history", label: "History" },
  { id: "orders", label: "Orders" },
  { id: "api", label: "API Ref" },
];

function statusTagClass(status: string) {
  if (status === "High Risk" || status === "Critical") return "r";
  if (status === "Stable") return "g";
  return "am";
}

export function EMRDashboard() {
  const toast = useDashboardToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("KE-00847");
  const [chartTab, setChartTab] = useState<ChartTab>("notes");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ first: "", last: "", dob: "", sex: "Female" });

  const selectedPatient = useMemo(
    () => PATIENTS.find((p) => p.id === selectedId) ?? PATIENTS[0],
    [selectedId],
  );

  const filteredPatients = PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const nav = buildV2ModuleNav([
    {
      label: "EMR",
      items: [{ id: "records", icon: "📋", label: "Patient Records" }],
    },
  ]);

  return (
    <DashboardShell
      shellVariant="doctor"
      title="Electronic Medical Records"
      crumb="Patient Records"
      portalSubtitle="EMR Module"
      userInitials="DW"
      userName="Dr. Wanjiku"
      userEmail="dr.wanjiku@knh.go.ke"
      activeNavId="records"
      nav={nav}
      topbarSearchPlaceholder="Search patients by name or ID…"
      topbarSearchValue={searchTerm}
      onTopbarSearchChange={setSearchTerm}
      onTopbarNotificationsClick={() => toast("3 clinical alerts — review high-risk patients.")}
      onTopbarStatusClick={() => toast("EMR module online · FHIR R5 sync active.")}
    >
      <div className="doc emr-mod">
        <div className="pg on" id="pg-emr-records">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth 360 · EMR</div>
              <div className="ph-ti">Patient Records</div>
              <div className="ph-su">
                {filteredPatients.length} patients · FHIR-linked charts · SOAP, labs, meds & orders
              </div>
            </div>
            <div className="ph-r">
              <button className="btn-p btn-sm" type="button" onClick={() => setShowNewPatient(true)}>
                ➕ New Patient
              </button>
            </div>
          </div>

          <div className="emr-layout">
            <div className="pat-list panel" style={{ padding: 0 }}>
              <div className="pl-hd">
                <div className="pl-title">Patient List</div>
                <div className="pl-srch">
                  <span aria-hidden>🔍</span>
                  <input
                    placeholder="Search name / ID…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search patients"
                  />
                </div>
              </div>
              <div className="pl-body">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className={`pat-item${selectedPatient.id === patient.id ? " sel" : ""}`}
                    onClick={() => setSelectedId(patient.id)}
                  >
                    <div className="pat-av">{patient.initials}</div>
                    <div>
                      <div className="pat-nm">{patient.name}</div>
                      <div className="pat-id">
                        {patient.id} · {patient.gender} · {patient.age}y
                      </div>
                      <span className={`tag ${statusTagClass(patient.status)}`} style={{ marginTop: 4 }}>
                        {patient.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="emr-main">
              <div className="panel" style={{ marginBottom: 14 }}>
                <div className="pnl-body" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{selectedPatient.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--t2)", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12 }}>
                        <span>📅 DOB: {selectedPatient.dob}</span>
                        <span className="mono"># {selectedPatient.id}</span>
                        <span>📍 {selectedPatient.location}</span>
                        <span>🩸 {selectedPatient.bloodType}</span>
                        <span>⚖️ {selectedPatient.weight} kg</span>
                      </div>
                      <div className="emr-alerts">
                        <span className="emr-chip r">⚠️ Penicillin Allergy</span>
                        <span className="emr-chip a">💓 Hypertension Active</span>
                        {selectedPatient.condition.includes("Diabetes") && (
                          <span className="emr-chip r">⚡ Diabetic</span>
                        )}
                      </div>
                    </div>
                    <div className="emr-vitals" style={{ marginTop: 0, minWidth: 280 }}>
                      <div className="emr-vital">
                        <div className="emr-vital-v">72</div>
                        <div className="emr-vital-l">HR bpm</div>
                      </div>
                      <div className="emr-vital">
                        <div className="emr-vital-v" style={{ color: "var(--b)" }}>140/90</div>
                        <div className="emr-vital-l">BP mmHg</div>
                      </div>
                      <div className="emr-vital">
                        <div className="emr-vital-v" style={{ color: "var(--am)" }}>36.8</div>
                        <div className="emr-vital-l">Temp °C</div>
                      </div>
                      <div className="emr-vital">
                        <div className="emr-vital-v" style={{ color: "var(--g)" }}>98</div>
                        <div className="emr-vital-l">SpO₂ %</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="notice b" style={{ marginBottom: 14 }}>
                <span className="notice-e">🤖</span>
                <div className="notice-tx">
                  <strong>AI Clinical Summary:</strong> Patient {selectedPatient.name} — cardiovascular risk elevated.
                  BP avg 142/91 over 30 days. Review glycaemic control if diabetic. Penicillin allergy flagged on all orders.
                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--t3)" }}>Risk score: 72% · UniHealth AI v4.2</div>
                </div>
              </div>

              <DashboardSubTabs tabs={CHART_TABS} active={chartTab} onChange={(id) => setChartTab(id as ChartTab)} />

              {chartTab === "notes" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">SOAP Clinical Note</div>
                    <button className="btn-p btn-sm" type="button" onClick={() => toast("Clinical note saved.")}>
                      💾 Save Note
                    </button>
                  </div>
                  <div className="pnl-body">
                    <div className="g2">
                      <div className="ff">
                        <label>Subjective</label>
                        <textarea rows={3} placeholder="Patient symptoms and complaints…" />
                      </div>
                      <div className="ff">
                        <label>Objective</label>
                        <textarea rows={3} placeholder="Physical examination findings…" />
                      </div>
                      <div className="ff">
                        <label>Assessment</label>
                        <textarea rows={3} placeholder="Clinical assessment…" />
                      </div>
                      <div className="ff">
                        <label>Plan</label>
                        <textarea rows={3} placeholder="Treatment plan…" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {chartTab === "labs" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Recent Lab Results</div>
                  </div>
                  <div className="pnl-body">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Result</th>
                          <th>Ref Range</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>HbA1c</td>
                          <td>7.8%</td>
                          <td>&lt;5.7%</td>
                          <td><span className="tag r">High</span></td>
                          <td>2024-01-15</td>
                        </tr>
                        <tr>
                          <td>Creatinine</td>
                          <td>1.2 mg/dL</td>
                          <td>0.7–1.3</td>
                          <td><span className="tag g">Normal</span></td>
                          <td>2024-01-15</td>
                        </tr>
                        <tr>
                          <td>Glucose</td>
                          <td>145 mg/dL</td>
                          <td>70–100</td>
                          <td><span className="tag r">High</span></td>
                          <td>2024-01-15</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chartTab === "meds" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Active Medications</div>
                  </div>
                  <div className="pnl-body">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Medication</th>
                          <th>Dose</th>
                          <th>Route</th>
                          <th>Indication</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Lisinopril</td>
                          <td>10 mg · Once daily</td>
                          <td>Oral</td>
                          <td>Hypertension</td>
                        </tr>
                        <tr>
                          <td>Metformin</td>
                          <td>500 mg · Twice daily</td>
                          <td>Oral</td>
                          <td>Type 2 Diabetes</td>
                        </tr>
                        <tr>
                          <td>Atorvastatin</td>
                          <td>20 mg · Once daily</td>
                          <td>Oral</td>
                          <td>Cholesterol</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chartTab === "history" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Medical History</div>
                  </div>
                  <div className="pnl-body">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Event</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>2023-11</td>
                          <td>Hypertension Diagnosis</td>
                          <td>Stage II hypertension confirmed</td>
                        </tr>
                        <tr>
                          <td>2023-09</td>
                          <td>Diabetes Screening</td>
                          <td>Type 2 Diabetes diagnosis confirmed</td>
                        </tr>
                        <tr>
                          <td>2023-06</td>
                          <td>Annual Physical</td>
                          <td>Routine examination completed</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chartTab === "orders" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Clinical Orders</div>
                    <button className="btn-p btn-sm" type="button" onClick={() => toast("New order form opened.")}>
                      ➕ New Order
                    </button>
                  </div>
                  <div className="pnl-body">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Detail</th>
                          <th>Priority</th>
                          <th>Ordered By</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Laboratory</td>
                          <td>HbA1c, Lipid Profile, eGFR</td>
                          <td><span className="tag am">Routine</span></td>
                          <td>Dr. Wanjiku</td>
                          <td><span className="tag b">Pending</span></td>
                        </tr>
                        <tr>
                          <td>Radiology</td>
                          <td>Chest X-Ray (PA view)</td>
                          <td><span className="tag am">Routine</span></td>
                          <td>Dr. Wanjiku</td>
                          <td><span className="tag g">Completed</span></td>
                        </tr>
                        <tr>
                          <td>Referral</td>
                          <td>Cardiology — HTN management</td>
                          <td><span className="tag r">Urgent</span></td>
                          <td>Dr. Wanjiku</td>
                          <td><span className="tag b">Scheduled</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chartTab === "api" && (
                <ApiRefPanel
                  title="API Reference — EMR Module"
                  endpoints={API_ENDPOINTS}
                  footnote="All endpoints require Bearer token authentication. FHIR resources available at /fhir/*."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <FormModal
        open={showNewPatient}
        title="Register New Patient"
        subtitle="Creates a FHIR Patient resource and EMR chart."
        onClose={() => setShowNewPatient(false)}
        footer={
          <>
            <button className="btn-s" type="button" onClick={() => setShowNewPatient(false)}>
              Cancel
            </button>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setShowNewPatient(false);
                toast(`Patient ${newPatient.first} ${newPatient.last} registered.`);
              }}
            >
              Register Patient
            </button>
          </>
        }
      >
        <div className="g2">
          <div className="ff">
            <label>First Name</label>
            <input
              value={newPatient.first}
              onChange={(e) => setNewPatient((s) => ({ ...s, first: e.target.value }))}
              placeholder="First name"
            />
          </div>
          <div className="ff">
            <label>Last Name</label>
            <input
              value={newPatient.last}
              onChange={(e) => setNewPatient((s) => ({ ...s, last: e.target.value }))}
              placeholder="Last name"
            />
          </div>
          <div className="ff">
            <label>Date of Birth</label>
            <input
              type="date"
              value={newPatient.dob}
              onChange={(e) => setNewPatient((s) => ({ ...s, dob: e.target.value }))}
            />
          </div>
          <div className="ff">
            <label>Sex</label>
            <select value={newPatient.sex} onChange={(e) => setNewPatient((s) => ({ ...s, sex: e.target.value }))}>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </FormModal>
    </DashboardShell>
  );
}
