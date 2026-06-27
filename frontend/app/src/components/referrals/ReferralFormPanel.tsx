import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type { ReferralRecord } from "../../lib/apiTypes";

const PRIORITIES = ["Routine", "Urgent", "Emergency"] as const;

type PatientOption = { id: string; label: string };

type HospitalOption = { id: string; name: string; county?: string };

type Props = {
  defaultPatientId?: string;
  extraPatients?: PatientOption[];
  role?: "doctor" | "nurse" | "admin";
  active?: boolean;
  onToast?: (message: string) => void;
  onPatientSelect?: (patientId: string) => void;
};

export function ReferralFormPanel({
  defaultPatientId = "P001",
  extraPatients = [],
  role = "doctor",
  active = true,
  onToast,
  onPatientSelect,
}: Props) {
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [patientId, setPatientId] = useState(defaultPatientId);
  const [hospitalId, setHospitalId] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("Routine");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [hospitalSearch, setHospitalSearch] = useState("");

  const refresh = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const [adminPts, simPts, depts, refs, kmhfl] = await Promise.all([
        api.adminPatients({ limit: 300 }).catch(() => []),
        api.aiSimPatients({ limit: 100 }, role).catch(() => []),
        api.referralDepartments(role).catch(() => ({ departments: [] })),
        api.referralList({ limit: 100 }, role).catch(() => ({ referrals: [], count: 0 })),
        api.kmhflKenyaFacilities({ search: hospitalSearch || undefined, limit: 50 }).catch(() => ({ results: [] })),
      ]);

      const merged = new Map<string, PatientOption>();
      for (const p of extraPatients) merged.set(p.id, p);
      for (const p of adminPts as Array<{ id?: string; name?: string; afl_id?: string }>) {
        const id = String(p.id || p.afl_id || "");
        if (id) merged.set(id, { id, label: `${p.name ?? id} (${id})` });
      }
      for (const p of simPts as Array<{ sim_id?: string; name?: string; patient_id?: string }>) {
        const id = String(p.sim_id || p.patient_id || "");
        if (id) merged.set(id, { id, label: `${p.name ?? id} (${id})` });
      }
      if (!merged.has(defaultPatientId)) {
        merged.set(defaultPatientId, { id: defaultPatientId, label: defaultPatientId });
      }
      setPatients(Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label)));

      const facResults = (kmhfl as { results?: Array<{ id?: string; name?: string; county?: string }> }).results ?? [];
      setHospitals(
        facResults.map((f) => ({
          id: String(f.id || f.name || ""),
          name: String(f.name || "Unknown"),
          county: f.county,
        })),
      );

      setDepartments(depts.departments ?? []);
      setReferrals(refs.referrals ?? []);
    } catch (e: unknown) {
      onToastRef.current?.(`Could not load referral data: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setLoading(false);
    }
  }, [active, role, defaultPatientId, extraPatients, hospitalSearch]);

  useEffect(() => {
    if (!active) return;
    void refresh();
  }, [refresh, active]);

  useEffect(() => {
    setPatientId(defaultPatientId);
  }, [defaultPatientId]);

  const selectedHospital = hospitals.find((h) => h.id === hospitalId);
  const selectedPatient = patients.find((p) => p.id === patientId);

  const submitReferral = async () => {
    if (!hospitalId || !department) {
      onToastRef.current?.("Select a hospital and department.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.referralCreate(
        {
          patient_id: patientId,
          patient_name: selectedPatient?.label.split(" (")[0] ?? patientId,
          hospital_id: hospitalId,
          hospital_name: selectedHospital?.name ?? hospitalId,
          department,
          priority,
          clinical_summary: clinicalSummary.trim() || undefined,
        },
        role,
      );
      onToastRef.current?.(`Referral ${res.referral.id} sent to ${res.referral.hospital_name}.`);
      setClinicalSummary("");
      onPatientSelect?.(patientId);
      await refresh();
    } catch (e: unknown) {
      onToastRef.current?.(`Referral failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const priorityTone = (p: string) => {
    if (p === "Emergency") return "r";
    if (p === "Urgent") return "am";
    return "b";
  };

  return (
    <div className="doc-section">
      <div className="panel">
        <div className="pnl-hd">
          <div>
            <div className="pnl-ti">New Referral</div>
            <div className="pnl-su">Select patient, destination hospital, and specialty department</div>
          </div>
          <button type="button" className="btn-s btn-sm" disabled={loading} onClick={() => void refresh()}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div className="pnl-bd">
          <div className="referral-form-grid">
            <div className="ff">
              <label>Patient (from registry)</label>
              <select
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  onPatientSelect?.(e.target.value);
                }}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="ff">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="ff">
              <label>Search hospitals (KMHFL)</label>
              <input
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                placeholder="e.g. Kenyatta, Moi, Coast"
                onBlur={() => void refresh()}
              />
            </div>
            <div className="ff">
              <label>Refer to hospital</label>
              <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
                <option value="">— Select hospital —</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.county ? ` · ${h.county}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="ff ff-full">
              <label>Department / specialty</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="ff ff-full">
              <label>Clinical summary & reason for referral</label>
              <textarea
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                placeholder="Diagnosis, investigations done, reason for referral, urgency notes…"
                style={{ minHeight: 88 }}
              />
            </div>
          </div>
          <div className="doc-patient-actions">
            <button type="button" className="btn-p" disabled={busy} onClick={() => void submitReferral()}>
              {busy ? "Sending…" : "📋 Send Referral"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel doc-section">
        <div className="pnl-hd">
          <div className="pnl-ti">Active referrals</div>
        </div>
        <div className="pnl-bd pnl-bd--flush">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Hospital</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.patient_name}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)" }}>{r.patient_id}</div>
                    </td>
                    <td>{r.hospital_name}</td>
                    <td>{r.department}</td>
                    <td><span className={`tag ${priorityTone(r.priority)}`}>{r.priority}</span></td>
                    <td><span className="tag g">{r.status}</span></td>
                  </tr>
                ))}
                {!loading && referrals.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                      No referrals yet. Complete the form above to send your first referral.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
