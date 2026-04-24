import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  reg?: string | null;
  facility?: string | null;
  auth?: string | null;
  status?: string | null;
  last_login?: string | null;
};

type AdminFacility = {
  id: string;
  name: string;
  level?: string | null;
  county?: string | null;
  status?: string | null;
  latency?: string | null;
};

type AdminPatient = {
  id: string;
  afl_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  facility?: string | null;
  status?: string | null;
};

export function AdminDashboard() {
  const toast = useDashboardToast();
  const metrics = usePolling(() => api.metricsJson(), { intervalMs: 5000 });
  const top = (metrics.data?.routes ?? [])
    .slice()
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5);

  const [page, setPage] = useState<
    | "overview"
    | "users"
    | "facilities"
    | "counties"
    | "patients"
    | "unihealth"
    | "reports"
    | "audit"
    | "settings"
    | "ai"
    | "rbac"
    | "health"
  >("overview");

  const todayFull = useMemo(() => {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const feedItems = useMemo(
    () => [
      { tone: "g" as const, title: "Patient registered — AFL-2026-KE-00312", sub: "Machakos Level 5 · ID verified", time: "4m ago" },
      { tone: "b" as const, title: "Claim approved — Ksh 12,400", sub: "UniHealth Cover · AFL-2024-884321", time: "1m ago" },
      { tone: "am" as const, title: "NEWS2 escalated — Bed 01", sub: "Nurse Achieng → Dr. Mutuku · Ward 4B", time: "3m ago" },
      { tone: "r" as const, title: "Duplicate lab order blocked", sub: "Dedup engine prevented repeat order", time: "5m ago" },
    ],
    []
  );

  const nodes = useMemo(
    () => [
      { tone: "g" as const, name: "KNH Nairobi", id: "edge-ke-nbo-01", latency: "22ms" },
      { tone: "g" as const, name: "MTRH Eldoret", id: "edge-ke-eld-02", latency: "31ms" },
      { tone: "am" as const, name: "Nakuru Level 5", id: "edge-ke-nkr-01", latency: "88ms" },
      { tone: "g" as const, name: "Coast General", id: "edge-ke-mba-01", latency: "28ms" },
    ],
    []
  );

  const uiAction = async (label: string) => {
    try {
      await api.uiAction({ role: "admin", page, label });
    } catch (e) {
      // Keep the UX clean even if the API is offline.
    }
    toast(label);
  };

  // ----- Users (CRUD) -----
  const [userQ, setUserQ] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userFacility, setUserFacility] = useState("");
  const [userStatus, setUserStatus] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [showUserEditor, setShowUserEditor] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "Doctor",
    reg: "",
    facility: "KNH Nairobi",
    auth: "OTP",
    status: "Pending",
  });

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const rows = (await api.adminUsers({
        q: userQ.trim() || undefined,
        role: userRole || undefined,
        facility: userFacility || undefined,
        status: userStatus || undefined,
        limit: 200,
      })) as AdminUser[];
      setUsers(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load users";
      setUsersError(msg);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (page !== "users") return;
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, userQ, userRole, userFacility, userStatus]);

  const openCreateUser = () => {
    setEditingUserId(null);
    setUserForm({
      name: "",
      email: "",
      role: "Doctor",
      reg: "",
      facility: "KNH Nairobi",
      auth: "OTP",
      status: "Pending",
    });
    setShowUserEditor(true);
  };

  const openEditUser = (u: AdminUser) => {
    setEditingUserId(u.id);
    setUserForm({
      name: u.name ?? "",
      email: u.email ?? "",
      role: u.role ?? "Doctor",
      reg: u.reg ?? "",
      facility: u.facility ?? "",
      auth: u.auth ?? "OTP",
      status: u.status ?? "Pending",
    });
    setShowUserEditor(true);
  };

  const saveUser = async () => {
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    if (!name) return toast("Name is required.");
    if (!email) return toast("Email is required.");

    try {
      if (editingUserId) {
        const res = await api.adminUserUpdate(editingUserId, {
          name,
          email,
          role: userForm.role,
          reg: userForm.reg.trim(),
          facility: userForm.facility.trim(),
          auth: userForm.auth,
          status: userForm.status,
        });
        const updated = (res as any).user as AdminUser | undefined;
        if (updated) setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast("User updated.");
      } else {
        const res = await api.adminUserCreate({
          name,
          email,
          role: userForm.role,
          reg: userForm.reg.trim(),
          facility: userForm.facility.trim(),
          auth: userForm.auth,
          status: userForm.status,
        });
        const created = (res as any).user as AdminUser | undefined;
        if (created) setUsers((prev) => [created, ...prev]);
        toast("User created.");
      }
      setShowUserEditor(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast(msg);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    const ok = window.confirm(`Delete ${u.name} (${u.email})?`);
    if (!ok) return;
    try {
      await api.adminUserDelete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast("User deleted.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast(msg);
    }
  };

  // ----- Facilities (CRUD) -----
  const [facQ, setFacQ] = useState("");
  const [facCounty, setFacCounty] = useState("");
  const [facStatus, setFacStatus] = useState("");
  const [facilities, setFacilities] = useState<AdminFacility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);

  const [showFacilityEditor, setShowFacilityEditor] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [facilityForm, setFacilityForm] = useState({
    name: "",
    level: "Level 5",
    county: "Nairobi",
    status: "ONLINE",
    latency: "",
  });

  const loadFacilities = async () => {
    setFacilitiesLoading(true);
    setFacilitiesError(null);
    try {
      const rows = (await api.adminFacilities({
        q: facQ.trim() || undefined,
        county: facCounty || undefined,
        status: facStatus || undefined,
        limit: 500,
      })) as AdminFacility[];
      setFacilities(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load facilities";
      setFacilitiesError(msg);
    } finally {
      setFacilitiesLoading(false);
    }
  };

  useEffect(() => {
    if (page !== "facilities") return;
    void loadFacilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, facQ, facCounty, facStatus]);

  const openCreateFacility = () => {
    setEditingFacilityId(null);
    setFacilityForm({ name: "", level: "Level 5", county: "Nairobi", status: "ONLINE", latency: "" });
    setShowFacilityEditor(true);
  };

  const openEditFacility = (f: AdminFacility) => {
    setEditingFacilityId(f.id);
    setFacilityForm({
      name: f.name ?? "",
      level: f.level ?? "Level 5",
      county: f.county ?? "Nairobi",
      status: f.status ?? "ONLINE",
      latency: f.latency ?? "",
    });
    setShowFacilityEditor(true);
  };

  const saveFacility = async () => {
    const name = facilityForm.name.trim();
    if (!name) return toast("Facility name is required.");
    try {
      if (editingFacilityId) {
        const res = await api.adminFacilityUpdate(editingFacilityId, {
          name,
          level: facilityForm.level,
          county: facilityForm.county,
          status: facilityForm.status,
          latency: facilityForm.latency.trim(),
        });
        const updated = (res as any).facility as AdminFacility | undefined;
        if (updated) setFacilities((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast("Facility updated.");
      } else {
        const res = await api.adminFacilityCreate({
          name,
          level: facilityForm.level,
          county: facilityForm.county,
          status: facilityForm.status,
          latency: facilityForm.latency.trim(),
        });
        const created = (res as any).facility as AdminFacility | undefined;
        if (created) setFacilities((prev) => [created, ...prev]);
        toast("Facility registered.");
      }
      setShowFacilityEditor(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteFacility = async (f: AdminFacility) => {
    const ok = window.confirm(`Delete facility "${f.name}"?`);
    if (!ok) return;
    try {
      await api.adminFacilityDelete(f.id);
      setFacilities((prev) => prev.filter((x) => x.id !== f.id));
      toast("Facility deleted.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // ----- Patients (CRUD) -----
  const [patQ, setPatQ] = useState("");
  const [patFacility, setPatFacility] = useState("");
  const [patStatus, setPatStatus] = useState("");
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  const [showPatientEditor, setShowPatientEditor] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientForm, setPatientForm] = useState({
    afl_id: "",
    name: "",
    email: "",
    phone: "",
    facility: "KNH Nairobi",
    status: "Active",
  });

  const loadPatients = async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const rows = (await api.adminPatients({
        q: patQ.trim() || undefined,
        facility: patFacility || undefined,
        status: patStatus || undefined,
        limit: 500,
      })) as AdminPatient[];
      setPatients(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load patients";
      setPatientsError(msg);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (page !== "patients") return;
    void loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, patQ, patFacility, patStatus]);

  const openCreatePatient = () => {
    setEditingPatientId(null);
    setPatientForm({ afl_id: "", name: "", email: "", phone: "", facility: "KNH Nairobi", status: "Active" });
    setShowPatientEditor(true);
  };

  const openEditPatient = (p: AdminPatient) => {
    setEditingPatientId(p.id);
    setPatientForm({
      afl_id: p.afl_id ?? "",
      name: p.name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      facility: p.facility ?? "KNH Nairobi",
      status: p.status ?? "Active",
    });
    setShowPatientEditor(true);
  };

  const savePatient = async () => {
    const afl_id = patientForm.afl_id.trim();
    const name = patientForm.name.trim();
    if (!afl_id) return toast("AFL ID is required.");
    if (!name) return toast("Patient name is required.");
    try {
      if (editingPatientId) {
        const res = await api.adminPatientUpdate(editingPatientId, {
          afl_id,
          name,
          email: patientForm.email.trim(),
          phone: patientForm.phone.trim(),
          facility: patientForm.facility,
          status: patientForm.status,
        });
        const updated = (res as any).patient as AdminPatient | undefined;
        if (updated) setPatients((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast("Patient updated.");
      } else {
        const res = await api.adminPatientCreate({
          afl_id,
          name,
          email: patientForm.email.trim(),
          phone: patientForm.phone.trim(),
          facility: patientForm.facility,
          status: patientForm.status,
        });
        const created = (res as any).patient as AdminPatient | undefined;
        if (created) setPatients((prev) => [created, ...prev]);
        toast("Patient registered.");
      }
      setShowPatientEditor(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deletePatient = async (p: AdminPatient) => {
    const ok = window.confirm(`Delete patient "${p.name}" (${p.afl_id})?`);
    if (!ok) return;
    try {
      await api.adminPatientDelete(p.id);
      setPatients((prev) => prev.filter((x) => x.id !== p.id));
      toast("Patient deleted.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <DashboardShell
      title={
        page === "overview"
          ? "Overview"
          : page === "users"
            ? "User Management"
            : page === "facilities"
              ? "Facility Management"
              : page === "counties"
                ? "County Coverage"
                : page === "patients"
                  ? "Patient Registry"
                  : page === "unihealth"
                    ? "UniHealth Integration"
                    : page === "reports"
                      ? "Reports"
                      : page === "audit"
                        ? "Audit Log"
                        : page === "ai"
                          ? "AI Monitor"
                          : page === "rbac"
                            ? "RBAC & Roles"
                            : page === "health"
                              ? "System Health"
                              : "Settings"
      }
      crumb={page === "overview" ? "Dashboard" : `Admin › ${page.charAt(0).toUpperCase()}${page.slice(1)}`}
      portalSubtitle="Admin Portal · MOH Kenya"
      userInitials="MK"
      userName="M. Kamau"
      userEmail="m.kamau@moh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as any)}
      onTopbarNotificationsClick={() => {
        setPage("audit");
        void uiAction("Opened notifications.");
      }}
      onTopbarStatusClick={() => {
        setPage("health");
        void uiAction("Opened live status.");
      }}
      nav={[
        {
          label: "Main",
          items: [
            { id: "overview", icon: "📊", label: "Overview" },
            { id: "users", icon: "👥", label: "User Management", badge: { text: "12", tone: "red" } },
            { id: "facilities", icon: "🏥", label: "Facilities" },
            { id: "counties", icon: "🗺️", label: "County Coverage" },
          ],
        },
        {
          label: "Clinical",
          items: [
            { id: "patients", icon: "🧑‍⚕️", label: "Patient Registry" },
            { id: "unihealth", icon: "🛡️", label: "UniHealth Integration", badge: { text: "3", tone: "amber" } },
          ],
        },
        {
          label: "Security & Intelligence",
          items: [
            { id: "ai", icon: "🤖", label: "AI Monitor", badge: { text: "3", tone: "red" } },
            { id: "rbac", icon: "🔐", label: "RBAC & Roles" },
            { id: "audit", icon: "⛓️", label: "Audit Log" },
          ],
        },
        {
          label: "System",
          items: [
            { id: "health", icon: "💾", label: "System Health", badge: { text: "1", tone: "amber" } },
            { id: "reports", icon: "📋", label: "Reports" },
            { id: "settings", icon: "⚙️", label: "Settings" },
          ],
        },
      ]}
    >
      {/* OVERVIEW */}
      <div className={`pg${page === "overview" ? " on" : ""}`} id="pg-overview">
        <div className="alert-strip" id="alertStrip">
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span className="alert-msg">
            Nakuru Level 5 Hospital node is <strong>degraded</strong> — 3 pending UniHealth approvals may be affected.
            <span
              style={{ textDecoration: "underline", cursor: "pointer", marginLeft: 6 }}
              onClick={() => setPage("facilities")}
            >
              View facility status →
            </span>
          </span>
          <button className="alert-x" type="button" onClick={() => (document.getElementById("alertStrip")!.style.display = "none")}>
            ✕
          </button>
        </div>

        <div className="ph">
          <div>
            <div className="ph-eyebrow">Ministry of Health Kenya · 2026</div>
            <div className="ph-title">Good morning, Administrator 👋</div>
            <div className="ph-sub">
              System overview for <span style={{ color: "var(--g)", fontWeight: 700 }}>{todayFull}</span>
            </div>
          </div>
          <div className="ph-right">
            <button className="btn-s" type="button" onClick={() => void uiAction("Export report queued.")}>
              📥 Export Report
            </button>
            <button className="btn-p" type="button" onClick={() => { setPage("users"); void uiAction("Opening user creation."); }}>
              + Add User
            </button>
          </div>
        </div>

        <div className="qa">
          <div
            className="qa-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setPage("users");
              openCreateUser();
            }}
          >
            <span className="qa-e">👤</span>
            <span className="qa-t">Add Staff</span>
          </div>
          <div
            className="qa-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setPage("patients");
              openCreatePatient();
            }}
          >
            <span className="qa-e">🧑‍⚕️</span>
            <span className="qa-t">Register Patient</span>
          </div>
          <div
            className="qa-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setPage("facilities");
              openCreateFacility();
            }}
          >
            <span className="qa-e">🏥</span>
            <span className="qa-t">New Facility</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("unihealth")}>
            <span className="qa-e">🏛️</span>
            <span className="qa-t">UniHealth Claims</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("reports")}>
            <span className="qa-e">📋</span>
            <span className="qa-t">Generate Report</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("audit")}>
            <span className="qa-e">⛓️</span>
            <span className="qa-t">Audit Log</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("counties")}>
            <span className="qa-e">🗺️</span>
            <span className="qa-t">County Map</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("settings")}>
            <span className="qa-e">⚙️</span>
            <span className="qa-t">Settings</span>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="kpi-bar g" />
            <div className="kpi-ico">🏥</div>
            <div className="kpi-lbl">Registered Patients</div>
            <div className="kpi-val">55.2M</div>
            <div className="kpi-meta up">▲ 2.1% this month</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar b" />
            <div className="kpi-ico">👥</div>
            <div className="kpi-lbl">Active Staff</div>
            <div className="kpi-val">48,914</div>
            <div className="kpi-meta up">▲ 340 new this week</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar am" />
            <div className="kpi-ico">🏥</div>
            <div className="kpi-lbl">Facilities Online</div>
            <div className="kpi-val">2,387</div>
            <div className="kpi-meta fl">— 13 degraded</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar r" />
            <div className="kpi-ico">⚠️</div>
            <div className="kpi-lbl">Pending Approvals</div>
            <div className="kpi-val">127</div>
            <div className="kpi-meta dn">▼ Needs attention</div>
          </div>
        </div>

        <div className="g2">
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">UniHealth Claims by Facility Level</div>
                <div className="pnl-sub">Last 30 days · All 12 regions</div>
              </div>
              <span className="pnl-link" onClick={() => setPage("unihealth")}>
                View all →
              </span>
            </div>
            <div className="pnl-body">
              <div className="bc">
                {[
                  { lbl: "Level 6 — National Referral", w: 92, v: "14,823", tone: "g" as const },
                  { lbl: "Level 5 — County Referral", w: 78, v: "32,441", tone: "g" as const },
                  { lbl: "Level 4 — District Hospital", w: 65, v: "67,890", tone: "b" as const },
                  { lbl: "Level 3 — Health Centre", w: 48, v: "124,332", tone: "am" as const },
                  { lbl: "Level 2 — Dispensary", w: 32, v: "89,201", tone: "r" as const },
                ].map((row) => (
                  <div className="bc-row" key={row.lbl}>
                    <span className="bc-lbl" style={{ width: 190 }}>
                      {row.lbl}
                    </span>
                    <div className="bc-track">
                      <div className={`bc-fill ${row.tone}`} style={{ width: `${row.w}%` }} />
                    </div>
                    <span className="bc-val">{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">Live System Activity</div>
                <div className="pnl-sub">Updating…</div>
              </div>
              <span className="pnl-link" onClick={() => setPage("audit")}>
                Audit log →
              </span>
            </div>
            <div style={{ padding: "0 20px" }}>
              <div className="feed">
                {feedItems.map((it, idx) => (
                  <div className="feed-item" key={idx}>
                    <div className="feed-dot-col">
                      <div className={`feed-dot ${it.tone}`} />
                      {idx !== feedItems.length - 1 ? <div className="feed-connector" /> : null}
                    </div>
                    <div className="feed-main">
                      <div className="feed-title">{it.title}</div>
                      <div className="feed-sub">{it.sub}</div>
                    </div>
                    <div className="feed-time">{it.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="g3" style={{ marginBottom: 0 }}>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Edge Node Status</div>
              <span className="pnl-link" onClick={() => setPage("facilities")}>
                All →
              </span>
            </div>
            {nodes.map((n) => (
              <div className="node-row" key={n.id}>
                <div className={`node-pulse ${n.tone}`} />
                <div className="node-info">
                  <div className="node-name">{n.name}</div>
                  <div className="node-id">{n.id}</div>
                </div>
                <div className="node-right">
                  <div className="node-lat" style={{ color: n.tone === "am" ? "var(--am)" : "var(--g)" }}>
                    {n.latency}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Staff by Role</div>
            </div>
            <div className="pnl-body">
              <div className="donut-wrap">
                <div
                  className="donut"
                  style={{
                    background:
                      "conic-gradient(var(--b) 0% 38%,var(--g) 38% 67%,var(--am) 67% 82%,var(--pu) 82% 100%)",
                  }}
                />
                <div className="donut-legend">
                  <div className="dl">
                    <div className="dl-dot" style={{ background: "var(--b)" }} />
                    Nurses / COs — 38%
                  </div>
                  <div className="dl">
                    <div className="dl-dot" style={{ background: "var(--g)" }} />
                    Doctors — 29%
                  </div>
                  <div className="dl">
                    <div className="dl-dot" style={{ background: "var(--am)" }} />
                    Admins — 15%
                  </div>
                  <div className="dl">
                    <div className="dl-dot" style={{ background: "var(--pu)" }} />
                    Other — 18%
                  </div>
                </div>
              </div>
            </div>
            <div className="stat-strip">
              <div className="stat-cell">
                <div className="stat-v" style={{ color: "var(--b)" }}>
                  18,587
                </div>
                <div className="stat-l">Nurses</div>
              </div>
              <div className="stat-cell">
                <div className="stat-v" style={{ color: "var(--g)" }}>
                  14,185
                </div>
                <div className="stat-l">Doctors</div>
              </div>
              <div className="stat-cell">
                <div className="stat-v" style={{ color: "var(--am)" }}>
                  7,340
                </div>
                <div className="stat-l">Admins</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Gateway Metrics (Live)</div>
              <span className="tag g dot">LIVE</span>
            </div>
            <div className="pnl-body">
              {metrics.error ? (
                <div className="errbanner is-visible" role="alert">
                  <span>⚠️</span>
                  <span>
                    Cannot reach API. Start the backend, or configure <code>VITE_API_BASE_URL</code>.
                    <br />
                    {metrics.error}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 700 }}>
                    Routes tracked: <span className="mono">{metrics.data?.routes.length ?? 0}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>Top endpoints by request count</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {top.map((r) => (
                      <div
                        key={`${r.method}:${r.path}`}
                        style={{
                          border: "1.5px solid var(--bdr)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: "#fff",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)" }}>
                            {r.method} {r.path}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--t2)", fontWeight: 700 }}>
                            avg {r.avg_latency_ms} ms
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gd)", fontWeight: 700 }}>
                          {r.requests}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* USERS */}
      <div className={`pg${page === "users" ? " on" : ""}`} id="pg-users">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Administration</div>
            <div className="ph-title">User Management</div>
            <div className="ph-sub">Manage staff accounts, roles and access permissions</div>
          </div>
          <div className="ph-right">
            <button className="btn-s" type="button" onClick={() => void uiAction("CSV import started.")}>
              📥 Import CSV
            </button>
            <button className="btn-p" type="button" onClick={openCreateUser}>
              + Add User
            </button>
          </div>
        </div>

        {showUserEditor && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">{editingUserId ? "Manage user" : "Add user"}</div>
                <div className="pnl-sub">Create staff accounts and assign role/facility access.</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-s btn-sm" type="button" onClick={() => setShowUserEditor(false)}>
                  Cancel
                </button>
                <button className="btn-p btn-sm" type="button" onClick={() => void saveUser()}>
                  {editingUserId ? "Save changes" : "Create user"}
                </button>
              </div>
            </div>
            <div className="pnl-body">
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>Full name</label>
                  <input value={userForm.name} onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Jane Doe" />
                </div>
                <div className="ff">
                  <label>Email</label>
                  <input
                    className="mono"
                    value={userForm.email}
                    onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="e.g. jane.doe@hospital.go.ke"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>Role</label>
                  <select value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}>
                    <option>Doctor</option>
                    <option>Nurse / CO</option>
                    <option>Administrator</option>
                    <option>System Admin</option>
                    <option>Security Admin</option>
                    <option>Data Manager</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Facility</label>
                  <select value={userForm.facility} onChange={(e) => setUserForm((s) => ({ ...s, facility: e.target.value }))}>
                    <option>KNH Nairobi</option>
                    <option>Coast General</option>
                    <option>MTRH Eldoret</option>
                    <option>MOH HQ</option>
                    <option>UniHealth SecOps</option>
                    <option>Data Hub</option>
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Registration / ID</label>
                  <input className="mono" value={userForm.reg} onChange={(e) => setUserForm((s) => ({ ...s, reg: e.target.value }))} placeholder="e.g. DR-1032" />
                </div>
                <div className="ff">
                  <label>Status</label>
                  <select value={userForm.status} onChange={(e) => setUserForm((s) => ({ ...s, status: e.target.value }))}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Pending</option>
                  </select>
                </div>
              </div>
              <div className="g2" style={{ marginTop: 10 }}>
                <div className="ff">
                  <label>Auth method</label>
                  <select value={userForm.auth} onChange={(e) => setUserForm((s) => ({ ...s, auth: e.target.value }))}>
                    <option>OTP</option>
                    <option>Practice 360</option>
                    <option>Biometric</option>
                  </select>
                </div>
                <div className="ff" />
              </div>
            </div>
          </div>
        )}

        <div className="filter-row">
          <div className="fsearch">
            <span aria-hidden>🔎</span>
            <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search name, email, reg. number…" />
          </div>
          <select className="fsel" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="Doctor">Doctor</option>
            <option value="Nurse / CO">Nurse / CO</option>
            <option value="Administrator">Administrator</option>
            <option value="System Admin">System Admin</option>
            <option value="Security Admin">Security Admin</option>
            <option value="Data Manager">Data Manager</option>
          </select>
          <select className="fsel" value={userFacility} onChange={(e) => setUserFacility(e.target.value)}>
            <option value="">All Facilities</option>
            <option value="KNH Nairobi">KNH Nairobi</option>
            <option value="Coast General">Coast General</option>
            <option value="MTRH Eldoret">MTRH Eldoret</option>
            <option value="MOH HQ">MOH HQ</option>
            <option value="UniHealth SecOps">UniHealth SecOps</option>
            <option value="Data Hub">Data Hub</option>
          </select>
          <select className="fsel" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div className="panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Reg. / ID</th>
                <th>Facility</th>
                <th>Last Login</th>
                <th>Auth Method</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usersError && (
                <tr>
                  <td colSpan={8} style={{ padding: 14 }}>
                    <div className="errbanner is-visible" role="alert">
                      <span>⚠️</span>
                      <span style={{ lineHeight: 1.6 }}>
                        Failed to load users.
                        <br />
                        <span className="mono">{usersError}</span>
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        <button className="btn-s btn-sm" type="button" onClick={() => void loadUsers()}>
                          Retry
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {!usersError && usersLoading && (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: "var(--t2)", fontWeight: 700 }}>
                    Loading users…
                  </td>
                </tr>
              )}
              {!usersError &&
                !usersLoading &&
                users.map((u) => {
                  const av = u.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("");
                  const tone = (u.status ?? "").toLowerCase() === "active" ? "g" : (u.status ?? "").toLowerCase() === "pending" ? "am" : "grey";
                  return (
                    <tr key={u.id}>
                  <td>
                    <div className="cell-user">
                      <div className={`av ${tone === "g" ? "" : tone}`}>{av || "U"}</div>
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--t1)" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td className="mono">{u.reg || "—"}</td>
                  <td>{u.facility || "—"}</td>
                  <td className="mono">{u.last_login || "—"}</td>
                  <td>
                    <span
                      className={`tag ${(u.auth || "OTP") === "OTP" ? "am" : (u.auth || "") === "Practice 360" ? "b" : "g"} dot`}
                    >
                      {u.auth || "OTP"}
                    </span>
                  </td>
                  <td>
                    <span className={`tag ${(u.status || "") === "Active" ? "g" : (u.status || "") === "Pending" ? "am" : "grey"}`}>
                      {u.status || "—"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn-s"
                        type="button"
                        style={{ fontSize: 11, padding: "5px 10px" }}
                        onClick={() => openEditUser(u as any)}
                      >
                        Manage
                      </button>
                      <button
                        className="btn-s"
                        type="button"
                        style={{ fontSize: 11, padding: "5px 10px", borderColor: "rgba(239,68,68,.35)", color: "var(--r)" }}
                        onClick={() => void deleteUser(u as any)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })}
              {!usersError && !usersLoading && users.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FACILITIES */}
      <div className={`pg${page === "facilities" ? " on" : ""}`} id="pg-facilities">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Infrastructure</div>
            <div className="ph-title">Facility Management</div>
            <div className="ph-sub">2,387 UniHealth-accredited facilities across 12 regions</div>
          </div>
          <button className="btn-p" type="button" onClick={openCreateFacility}>
            + Register Facility
          </button>
        </div>

        {showFacilityEditor && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">{editingFacilityId ? "Manage facility" : "Register facility"}</div>
                <div className="pnl-sub">Add a UniHealth-accredited facility and track connectivity status.</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-s btn-sm" type="button" onClick={() => setShowFacilityEditor(false)}>
                  Cancel
                </button>
                <button className="btn-p btn-sm" type="button" onClick={() => void saveFacility()}>
                  {editingFacilityId ? "Save changes" : "Register facility"}
                </button>
              </div>
            </div>
            <div className="pnl-body">
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>Facility name</label>
                  <input value={facilityForm.name} onChange={(e) => setFacilityForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Coast General" />
                </div>
                <div className="ff">
                  <label>Status</label>
                  <select value={facilityForm.status} onChange={(e) => setFacilityForm((s) => ({ ...s, status: e.target.value }))}>
                    <option>ONLINE</option>
                    <option>DEGRADED</option>
                    <option>OFFLINE</option>
                  </select>
                </div>
              </div>
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>County</label>
                  <input value={facilityForm.county} onChange={(e) => setFacilityForm((s) => ({ ...s, county: e.target.value }))} placeholder="e.g. Nairobi" />
                </div>
                <div className="ff">
                  <label>Level</label>
                  <input value={facilityForm.level} onChange={(e) => setFacilityForm((s) => ({ ...s, level: e.target.value }))} placeholder="e.g. Level 5" />
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Latency (optional)</label>
                  <input className="mono" value={facilityForm.latency} onChange={(e) => setFacilityForm((s) => ({ ...s, latency: e.target.value }))} placeholder="e.g. 22ms" />
                </div>
                <div className="ff" />
              </div>
            </div>
          </div>
        )}
        <div className="filter-row">
          <div className="fsearch">
            <span aria-hidden>🔎</span>
            <input value={facQ} onChange={(e) => setFacQ(e.target.value)} placeholder="Search facility name or ID…" />
          </div>
          <select className="fsel" value={facCounty} onChange={(e) => setFacCounty(e.target.value)}>
            <option value="">All Counties</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Uasin Gishu">Uasin Gishu</option>
            <option value="Mombasa">Mombasa</option>
          </select>
          <select className="fsel" value={facStatus} onChange={(e) => setFacStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ONLINE">ONLINE</option>
            <option value="DEGRADED">DEGRADED</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>
        <div className="panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Facility</th>
                <th>County</th>
                <th>Level</th>
                <th>Status</th>
                <th>Latency</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {facilitiesError && (
                <tr>
                  <td colSpan={6} style={{ padding: 14 }}>
                    <div className="errbanner is-visible" role="alert">
                      <span>⚠️</span>
                      <span style={{ lineHeight: 1.6 }}>
                        Failed to load facilities.
                        <br />
                        <span className="mono">{facilitiesError}</span>
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        <button className="btn-s btn-sm" type="button" onClick={() => void loadFacilities()}>
                          Retry
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {!facilitiesError && facilitiesLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "var(--t2)", fontWeight: 700 }}>
                    Loading facilities…
                  </td>
                </tr>
              )}
              {!facilitiesError &&
                !facilitiesLoading &&
                facilities.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 850, color: "var(--t1)" }}>{f.name}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--t3)" }}>
                        {f.id}
                      </div>
                    </td>
                    <td>{f.county || "—"}</td>
                    <td>{f.level || "—"}</td>
                    <td>
                      <span className={`tag ${(f.status || "") === "DEGRADED" ? "am" : (f.status || "") === "OFFLINE" ? "r" : "g"} dot`}>
                        {f.status || "—"}
                      </span>
                    </td>
                    <td className="mono">{f.latency || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-s btn-sm" type="button" onClick={() => openEditFacility(f)}>
                          Manage
                        </button>
                        <button
                          className="btn-s btn-sm"
                          type="button"
                          style={{ borderColor: "rgba(239,68,68,.35)", color: "var(--r)" }}
                          onClick={() => void deleteFacility(f)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!facilitiesError && !facilitiesLoading && facilities.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                    No facilities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* COUNTIES */}
      <div className={`pg${page === "counties" ? " on" : ""}`} id="pg-counties">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Coverage</div>
            <div className="ph-title">County Coverage Map</div>
            <div className="ph-sub">All 12 regions · Real-time connectivity</div>
          </div>
        </div>
        <div className="g2e">
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Coverage Heatmap — 47 Counties</div>
            </div>
            <div className="pnl-body">
              <div className="county-grid">
                {Array.from({ length: 47 }).map((_, i) => {
                  const cls = i % 11 === 0 ? "off" : i % 7 === 0 ? "lo" : i % 5 === 0 ? "med" : i % 3 === 0 ? "hi" : "full";
                  return (
                    <div className={`cc ${cls}`} key={i} title={`County ${i + 1}`}>
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Top Counties by Connectivity</div>
            </div>
            <div className="pnl-body">
              <div className="bc">
                {[
                  { lbl: "Nairobi", w: 96, v: "96%", tone: "g" as const },
                  { lbl: "Mombasa", w: 91, v: "91%", tone: "g" as const },
                  { lbl: "Kisumu", w: 84, v: "84%", tone: "am" as const },
                  { lbl: "Nakuru", w: 73, v: "73%", tone: "b" as const },
                ].map((c) => (
                  <div className="bc-row" key={c.lbl}>
                    <span className="bc-lbl" style={{ width: 120 }}>
                      {c.lbl}
                    </span>
                    <div className="bc-track">
                      <div className={`bc-fill ${c.tone}`} style={{ width: `${c.w}%` }} />
                    </div>
                    <span className="bc-val">{c.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PATIENTS */}
      <div className={`pg${page === "patients" ? " on" : ""}`} id="pg-patients">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Clinical</div>
            <div className="ph-title">Patient Registry</div>
            <div className="ph-sub">55.2M UniHealth-registered patients across 12 regions</div>
          </div>
          <button className="btn-p" type="button" onClick={openCreatePatient}>
            + Register Patient
          </button>
        </div>

        {showPatientEditor && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">{editingPatientId ? "Manage patient" : "Register patient"}</div>
                <div className="pnl-sub">Register a patient in the UniHealth directory and link them to a facility.</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn-s btn-sm" type="button" onClick={() => setShowPatientEditor(false)}>
                  Cancel
                </button>
                <button className="btn-p btn-sm" type="button" onClick={() => void savePatient()}>
                  {editingPatientId ? "Save changes" : "Register patient"}
                </button>
              </div>
            </div>
            <div className="pnl-body">
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>AFL ID</label>
                  <input
                    className="mono"
                    value={patientForm.afl_id}
                    onChange={(e) => setPatientForm((s) => ({ ...s, afl_id: e.target.value }))}
                    placeholder="e.g. AFL-2026-KE-00312"
                  />
                </div>
                <div className="ff">
                  <label>Full name</label>
                  <input value={patientForm.name} onChange={(e) => setPatientForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Wangui Njoroge" />
                </div>
              </div>
              <div className="g2" style={{ marginBottom: 10 }}>
                <div className="ff">
                  <label>Email (optional)</label>
                  <input className="mono" value={patientForm.email} onChange={(e) => setPatientForm((s) => ({ ...s, email: e.target.value }))} placeholder="e.g. patient@example.com" />
                </div>
                <div className="ff">
                  <label>Phone (optional)</label>
                  <input className="mono" value={patientForm.phone} onChange={(e) => setPatientForm((s) => ({ ...s, phone: e.target.value }))} placeholder="e.g. +2547…" />
                </div>
              </div>
              <div className="g2">
                <div className="ff">
                  <label>Facility</label>
                  <select value={patientForm.facility} onChange={(e) => setPatientForm((s) => ({ ...s, facility: e.target.value }))}>
                    <option>KNH Nairobi</option>
                    <option>Coast General</option>
                    <option>MTRH Eldoret</option>
                    <option>MOH HQ</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Status</label>
                  <select value={patientForm.status} onChange={(e) => setPatientForm((s) => ({ ...s, status: e.target.value }))}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Pending</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="filter-row">
          <div className="fsearch">
            <span aria-hidden>🔎</span>
            <input value={patQ} onChange={(e) => setPatQ(e.target.value)} placeholder="Search patient name, AFL ID, email, phone…" />
          </div>
          <select className="fsel" value={patFacility} onChange={(e) => setPatFacility(e.target.value)}>
            <option value="">All Facilities</option>
            <option value="KNH Nairobi">KNH Nairobi</option>
            <option value="Coast General">Coast General</option>
            <option value="MTRH Eldoret">MTRH Eldoret</option>
            <option value="MOH HQ">MOH HQ</option>
          </select>
          <select className="fsel" value={patStatus} onChange={(e) => setPatStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div className="panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Patient</th>
                <th className="mono">AFL ID</th>
                <th>Facility</th>
                <th>Contact</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patientsError && (
                <tr>
                  <td colSpan={6} style={{ padding: 14 }}>
                    <div className="errbanner is-visible" role="alert">
                      <span>⚠️</span>
                      <span style={{ lineHeight: 1.6 }}>
                        Failed to load patients.
                        <br />
                        <span className="mono">{patientsError}</span>
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        <button className="btn-s btn-sm" type="button" onClick={() => void loadPatients()}>
                          Retry
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {!patientsError && patientsLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "var(--t2)", fontWeight: 700 }}>
                    Loading patients…
                  </td>
                </tr>
              )}
              {!patientsError &&
                !patientsLoading &&
                patients.map((p) => {
                  const av = p.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase() ?? "")
                    .join("");
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-user">
                          <div className="av">{av || "P"}</div>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--t1)" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "var(--t3)" }} className="mono">
                              {p.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{p.afl_id}</td>
                      <td>{p.facility || "—"}</td>
                      <td style={{ color: "var(--t2)" }}>
                        <div className="mono" style={{ fontSize: 11.5 }}>
                          {p.phone || "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--t3)" }}>{p.email || "—"}</div>
                      </td>
                      <td>
                        <span className={`tag ${(p.status || "") === "Active" ? "g" : (p.status || "") === "Pending" ? "am" : "grey"} dot`}>
                          {p.status || "—"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="btn-s btn-sm" type="button" onClick={() => openEditPatient(p)}>
                            Manage
                          </button>
                          <button
                            className="btn-s btn-sm"
                            type="button"
                            style={{ borderColor: "rgba(239,68,68,.35)", color: "var(--r)" }}
                            onClick={() => void deletePatient(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!patientsError && !patientsLoading && patients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* UNIHEALTH */}
      <div className={`pg${page === "unihealth" ? " on" : ""}`} id="pg-unihealth">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">UniHealth Health Cover</div>
            <div className="ph-title">UniHealth Integration Hub</div>
            <div className="ph-sub">Claims management, biometric verification, Practice 360 approvals</div>
          </div>
          <button className="btn-p" type="button" onClick={() => void uiAction("UniHealth sync triggered.")}>
            ↺ Sync UniHealth
          </button>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="kpi">
            <div className="kpi-bar g" />
            <div className="kpi-ico">🏛️</div>
            <div className="kpi-lbl">Claims Today</div>
            <div className="kpi-val">14,823</div>
            <div className="kpi-meta up">▲ Ksh 47.5B disbursed</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar am" />
            <div className="kpi-ico">⏳</div>
            <div className="kpi-lbl">Pending Claims</div>
            <div className="kpi-val">127</div>
            <div className="kpi-meta dn">▼ Avg wait 4.2h</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar r" />
            <div className="kpi-ico">❌</div>
            <div className="kpi-lbl">Rejected Claims</div>
            <div className="kpi-val">23</div>
            <div className="kpi-meta fl">— fraud prevention active</div>
          </div>
        </div>
      </div>

      {/* REPORTS */}
      <div className={`pg${page === "reports" ? " on" : ""}`} id="pg-reports">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Reporting</div>
            <div className="ph-title">Reports</div>
            <div className="ph-sub">Generate operational and compliance reports</div>
          </div>
        </div>
        <div className="g3" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {[
            { ico: "📊", name: "Operational Summary", desc: "Facility uptime, KPIs, service volumes", tone: "g" as const },
            { ico: "🔐", name: "Security & RBAC", desc: "Role changes, access audits, AI alerts", tone: "b" as const },
            { ico: "⛓️", name: "Blockchain Audit Export", desc: "Append-only ledger events (KDPA compliant)", tone: "am" as const },
          ].map((r) => (
            <div className="rep-card" key={r.name}>
              <div className="rep-ico" style={{ background: r.tone === "g" ? "var(--gl)" : r.tone === "b" ? "var(--bl)" : "var(--al)" }}>
                {r.ico}
              </div>
              <div style={{ flex: 1 }}>
                <div className="rep-name">{r.name}</div>
                <div className="rep-desc">{r.desc}</div>
                <div className="rep-meta">
                  <span className="tag g">PDF</span>
                  <span className="tag grey">CSV</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AUDIT */}
      <div className={`pg${page === "audit" ? " on" : ""}`} id="pg-audit">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Hyperledger Fabric Blockchain · Append-Only</div>
            <div className="ph-title">Audit Log</div>
            <div className="ph-sub">Immutable blockchain-recorded system events · KDPA 2019 compliant</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div>
              <div className="pnl-title">🔗 Blockchain Audit Ledger</div>
              <div className="pnl-sub">Append-only · Tamper-evident</div>
            </div>
            <span className="tag g dot">INTACT</span>
          </div>
          <div style={{ padding: "0 20px" }}>
            <div className="feed">
              {feedItems.map((it, idx) => (
                <div className="feed-item" key={idx} style={{ padding: "9px 0" }}>
                  <div className="feed-dot-col">
                    <div className={`feed-dot ${it.tone}`} />
                    {idx !== feedItems.length - 1 ? <div className="feed-connector" /> : null}
                  </div>
                  <div className="feed-main">
                    <div className="feed-title">{it.title}</div>
                    <div className="feed-sub">{it.sub}</div>
                  </div>
                  <div className="feed-time">{it.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS */}
      <div className={`pg${page === "settings" ? " on" : ""}`} id="pg-settings">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">System</div>
            <div className="ph-title">Settings</div>
            <div className="ph-sub">Global system settings and policies</div>
          </div>
          <button className="btn-p" type="button" onClick={() => void uiAction("Settings saved.")}>
            Save Changes
          </button>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Policy Toggles</div>
            <span className="tag g">ENFORCED</span>
          </div>
          <div className="pnl-body">
            {[
              { name: "Require biometric at L4–L6", desc: "OTP disallowed at high-level facilities", on: true },
              { name: "Audit all admin actions", desc: "Append to blockchain ledger (Hyperledger)", on: true },
              { name: "Strict RBAC guard", desc: "Block access to AI Monitor without Security Admin role", on: true },
            ].map((t) => (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  border: "1.5px solid var(--bdr)",
                  borderRadius: 9,
                  background: "var(--bg)",
                  marginBottom: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--t1)" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{t.desc}</div>
                </div>
                <span className={`tag ${t.on ? "g" : "grey"}`}>{t.on ? "ON" : "OFF"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI */}
      <div className={`pg${page === "ai" ? " on" : ""}`} id="pg-ai">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Security & Intelligence</div>
            <div className="ph-title">AI Monitor</div>
            <div className="ph-sub">Anomaly detection, access guardrails, and automated response</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Alerts</div>
            <span className="tag am">3 alerts</span>
          </div>
          <div className="pnl-body">
            <div className="tag r" style={{ marginBottom: 10 }}>
              Critical
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--t1)" }}>
              Unauthorised access attempt blocked · IP 197.232.xx.xx
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
              Blocked at gateway. Review RBAC + MFA policy.
            </div>
          </div>
        </div>
      </div>

      {/* RBAC */}
      <div className={`pg${page === "rbac" ? " on" : ""}`} id="pg-rbac">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Security</div>
            <div className="ph-title">RBAC & Roles</div>
            <div className="ph-sub">Role-based access control overview</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Role Directory</div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Role</th>
                <th>Users</th>
                <th>Scope</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>System Administrator</td>
                <td className="mono">3</td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>Full access</td>
                <td>
                  <button className="btn-s" type="button" style={{ fontSize: 11, padding: "5px 10px" }}>
                    Edit Role
                  </button>
                </td>
              </tr>
              <tr>
                <td>Security Administrator</td>
                <td className="mono">2</td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>Audit, RBAC, blocks</td>
                <td>
                  <button className="btn-s" type="button" style={{ fontSize: 11, padding: "5px 10px" }}>
                    Edit Role
                  </button>
                </td>
              </tr>
              <tr>
                <td>Data Manager</td>
                <td className="mono">5</td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>Data exports, reports</td>
                <td>
                  <button className="btn-s" type="button" style={{ fontSize: 11, padding: "5px 10px" }}>
                    Edit Role
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* HEALTH */}
      <div className={`pg${page === "health" ? " on" : ""}`} id="pg-health">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">System</div>
            <div className="ph-title">System Health</div>
            <div className="ph-sub">Backups, latency, cache, and node status</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Backup Status</div>
            <span className="tag g">HEALTHY</span>
          </div>
          <div className="pnl-body">
            <div className="bc">
              <div className="bc-row">
                <span className="bc-lbl" style={{ width: 170 }}>
                  Last full backup
                </span>
                <div className="bc-track">
                  <div className="bc-fill g" style={{ width: "90%" }} />
                </div>
                <span className="bc-val">✓ 2h</span>
              </div>
              <div className="bc-row">
                <span className="bc-lbl" style={{ width: 170 }}>
                  Incremental
                </span>
                <div className="bc-track">
                  <div className="bc-fill g" style={{ width: "96%" }} />
                </div>
                <span className="bc-val">✓ 15m</span>
              </div>
              <div className="bc-row">
                <span className="bc-lbl" style={{ width: 170 }}>
                  Storage used
                </span>
                <div className="bc-track">
                  <div className="bc-fill am" style={{ width: "63%" }} />
                </div>
                <span className="bc-val">63%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

