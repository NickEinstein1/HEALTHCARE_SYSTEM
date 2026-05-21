import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { BRAND_ICON } from "../../components/brand/brandIcon";
import { DashIcon } from "../../components/brand/DashIcon";
import { SearchBarBrand } from "../../components/brand/SearchBarBrand";
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

const ADMIN_POLICY_KEY = "admin.policyToggles.v1";

const POLICY_DEFS: { name: string; desc: string }[] = [
  { name: "Require biometric at L4–L6", desc: "OTP disallowed at high-level facilities" },
  { name: "Audit all admin actions", desc: "Append to blockchain ledger (Hyperledger)" },
  { name: "Strict RBAC guard", desc: "Block access to AI Monitor without Security Admin role" },
];

function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildWardCensusCsv(wardId: string, rows: any[]): string {
  const sorted = [...rows].sort((a, b) => Number(a.ts_epoch) - Number(b.ts_epoch));
  const headers = ["ts_epoch", "ts_iso", "ward_id", "occupied", "capacity", "pct", "source"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines: string[] = [headers.join(",")];
  for (const r of sorted) {
    const cap = Math.max(1, Number(r.capacity) || 1);
    const occ = Number(r.occupied);
    const pct = Math.round((occ / cap) * 10000) / 100;
    lines.push(
      [
        esc(r.ts_epoch),
        esc(r.ts_iso),
        esc(wardId),
        esc(occ),
        esc(cap),
        esc(pct),
        esc(r.source),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function AdminDashboard() {
  const toast = useDashboardToast();
  const metrics = usePolling(() => api.metricsJson(), { intervalMs: 5000 });
  const top = (metrics.data?.routes ?? [])
    .slice()
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5);

  const [policyToggles, setPolicyToggles] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_POLICY_KEY);
      if (raw) {
        const p = JSON.parse(raw) as unknown;
        if (Array.isArray(p) && p.length === POLICY_DEFS.length && p.every((x) => typeof x === "boolean")) {
          return p as boolean[];
        }
      }
    } catch {
      // ignore
    }
    return POLICY_DEFS.map(() => true);
  });

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

  // ── Phase 3: Capacity Intelligence state ──────────────────────────
  const [aiWards, setAiWards]           = useState<any[]>([]);
  const [aiForecasts, setAiForecasts]   = useState<Record<string, any[]>>({});
  const [aiAnomalies, setAiAnomalies]   = useState<any[]>([]);
  const [aiAudit, setAiAudit]           = useState<any[]>([]);
  const [aiStatus, setAiStatus]         = useState<any | null>(null);
  const [aiRefreshTick, setAiRefreshTick] = useState(0);
  const [aiRecomputeBusy, setAiRecomputeBusy] = useState(false);
  const [censusDraftAdmin, setCensusDraftAdmin] = useState<Record<string, string>>({});
  const [adminHistoryWardId, setAdminHistoryWardId] = useState("");
  const [adminHistoryLimit, setAdminHistoryLimit] = useState(48);
  const [adminHistoryRows, setAdminHistoryRows] = useState<any[]>([]);
  const [adminHistoryLoading, setAdminHistoryLoading] = useState(false);

  useEffect(() => {
    if (page !== "ai") return;
    let cancelled = false;
    const load = async () => {
      try {
        const [wards, anomalies, audit, status] = await Promise.all([
          api.aiWards("admin"),
          api.aiAnomalies({ limit: 30 }, "admin"),
          api.aiAuditLog({ limit: 50 }),
          api.aiStatus(),
        ]);
        if (cancelled) return;
        setAiWards(wards);
        setAiAnomalies(anomalies);
        setAiAudit(audit);
        setAiStatus(status);
        // load forecasts for all wards
        const fc: Record<string, any[]> = {};
        await Promise.all(wards.map(async (w: any) => {
          try {
            fc[w.ward_id] = await api.aiWardForecast(w.ward_id, 24, "admin");
          } catch { /* ward offline */ }
        }));
        if (!cancelled) setAiForecasts(fc);
      } catch { /* api offline */ }
    };
    void load();
    return () => { cancelled = true; };
  }, [page, aiRefreshTick]);

  useEffect(() => {
    if (page !== "ai" || aiWards.length === 0) return;
    setAdminHistoryWardId((prev) => {
      if (prev && aiWards.some((w: any) => w.ward_id === prev)) return prev;
      return String(aiWards[0]?.ward_id ?? "");
    });
  }, [page, aiWards]);

  useEffect(() => {
    if (page !== "ai" || !adminHistoryWardId) return;
    let cancelled = false;
    setAdminHistoryLoading(true);
    void (async () => {
      try {
        const rows = await api.aiWardHistory(adminHistoryWardId, adminHistoryLimit, "admin");
        if (!cancelled) setAdminHistoryRows(rows);
      } catch {
        if (!cancelled) setAdminHistoryRows([]);
      } finally {
        if (!cancelled) setAdminHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, adminHistoryWardId, adminHistoryLimit, aiRefreshTick]);

  const ackAdminAnomaly = async (id: string) => {
    try {
      await api.aiAckAnomaly(id, "Reviewed by admin", "admin");
      setAiAnomalies(prev => prev.filter(a => a.id !== id));
      void uiAction("Anomaly acknowledged.");
    } catch { /* offline */ }
  };

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
    triage_level: "Green",
  });
  const [walkinMatches, setWalkinMatches] = useState<{ uhid: string; score: number; reason: string }[] | null>(null);
  const [lastCreatedWalkin, setLastCreatedWalkin] = useState<{ uhid: string; walkinId: string; action: string } | null>(null);

  // Patient 360 panel
  const [patient360Uhid, setPatient360Uhid] = useState<string | null>(null);
  const [patient360Data, setPatient360Data] = useState<{
    patient?: any;
    aliases?: any[];
    visits?: any[];
    facilities_visited?: string[];
    total_visits?: number;
  } | null>(null);
  const [patient360Loading, setPatient360Loading] = useState(false);

  // Cross-facility patient search
  const [uhidSearch, setUhidSearch] = useState("");
  const [uhidSearchResults, setUhidSearchResults] = useState<any[] | null>(null);
  const [uhidSearchBusy, setUhidSearchBusy] = useState(false);

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

  const submitWalkin = async (chosenUhid?: string) => {
    setWalkinBusy(true);
    try {
      const res = await api.walkinCreate({ ...walkinForm, uhid: chosenUhid });
      const action = res.correlation?.action ?? "";
      const candidates = res.correlation?.candidates ?? [];
      if (action !== "created_new" && candidates.length > 0 && !chosenUhid) {
        setWalkinMatches(candidates);
      } else {
        setWalkinMatches(null);
        setShowWalkin(false);
        setLastCreatedWalkin({
          uhid: res.patient?.uhid ?? "",
          walkinId: res.walkin?.id ?? "",
          action,
        });
        setWalkinForm((s) => ({ ...s, full_name: "", phone: "", dob: "", national_id: "", mrn: "", chief_complaint: "" }));
        void uiAction(`Walk-in registered — UHID ${res.patient?.uhid ?? "—"} (${action}).`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Walk-in failed — is the API running?");
    } finally {
      setWalkinBusy(false);
    }
  };

  const openPatient360 = async (uhid: string) => {
    setPatient360Uhid(uhid);
    setPatient360Data(null);
    setPatient360Loading(true);
    try {
      const data = await api.walkinPatient360(uhid);
      setPatient360Data(data);
    } catch {
      toast("Patient 360 unavailable — is the API running?");
    } finally {
      setPatient360Loading(false);
    }
  };

  const runUhidSearch = async () => {
    if (!uhidSearch.trim()) return;
    setUhidSearchBusy(true);
    try {
      const results = await api.walkinSearch(uhidSearch.trim(), 20);
      setUhidSearchResults(results);
    } catch {
      toast("Search failed — is the API running?");
    } finally {
      setUhidSearchBusy(false);
    }
  };

  const downloadJsonFile = (baseName: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMetricsReport = async () => {
    try {
      const data = await api.metricsJson();
      downloadJsonFile("unihealth-operational-summary", data);
      void uiAction("Operational report downloaded (metrics JSON).");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed — is the API running?");
    }
  };

  const exportSecurityReport = async () => {
    try {
      const actions = await api.uiActionsList(300);
      downloadJsonFile("unihealth-ui-audit-trail", { exported_at: new Date().toISOString(), actions });
      void uiAction("Security & RBAC report downloaded (UI actions).");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed — is the API running?");
    }
  };

  const exportLedgerReport = async () => {
    try {
      const actions = await api.uiActionsList(500);
      downloadJsonFile("unihealth-ledger-export", {
        exported_at: new Date().toISOString(),
        note: "Phase 1: in-memory action log; not a full blockchain export.",
        events: actions,
      });
      void uiAction("Audit ledger package downloaded (action log).");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed — is the API running?");
    }
  };

  const exportOverviewHeader = async () => {
    try {
      const data = await api.metricsJson();
      downloadJsonFile("admin-overview-export", {
        exported_at: new Date().toISOString(),
        page: "overview",
        metrics: data,
      });
      void uiAction("Overview export downloaded.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed — is the API running?");
    }
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

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  const parseUserCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return [] as Array<Record<string, string>>;
    let start = 0;
    const h = lines[0].toLowerCase();
    if (h.includes("email") && h.includes("role") && (h.includes("name") || h.includes("full"))) start = 1;
    const out: Array<Record<string, string>> = [];
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s) => s.replace(/^"|"$/g, "").trim());
      if (parts.length < 3) continue;
      const [name, email, role, facility, reg, status, auth] = parts;
      if (!name || !email || !role) continue;
      const row: Record<string, string> = { name, email, role };
      if (facility) row.facility = facility;
      if (reg) row.reg = reg;
      if (status) row.status = status;
      if (auth) row.auth = auth;
      out.push(row);
    }
    return out;
  };

  const runCsvImport = async () => {
    const rows = parseUserCsv(csvText);
    if (!rows.length) {
      toast("No valid rows. Expected columns: name,email,role[,facility,reg,status,auth] (optional header row).");
      return;
    }
    setCsvBusy(true);
    try {
      const res = await api.adminUsersBulk(rows);
      const n = res.created_count ?? res.created?.length ?? 0;
      const errN = res.errors?.length ?? 0;
      if (n) void loadUsers();
      toast(`Import finished: ${n} created${errN ? `, ${errN} skipped/errors` : ""}.`);
      if (n) {
        setCsvText("");
        setShowCsvImport(false);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bulk import failed");
    } finally {
      setCsvBusy(false);
    }
  };

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

  const [kmhflLoading, setKmhflLoading] = useState(false);
  const [kmhflError, setKmhflError] = useState<string | null>(null);
  const [kmhflPage, setKmhflPage] = useState(1);
  const [kmhflCount, setKmhflCount] = useState<number | null>(null);
  const [kmhflNext, setKmhflNext] = useState<string | null>(null);
  const [kmhflResults, setKmhflResults] = useState<any[]>([]);
  const [kmhflDemoNotice, setKmhflDemoNotice] = useState<string | null>(null);

  const loadKMHFL = async (opts?: { reset?: boolean }) => {
    const reset = opts?.reset ?? false;
    const nextPage = reset ? 1 : kmhflPage;
    setKmhflLoading(true);
    setKmhflError(null);
    setKmhflDemoNotice(null);
    try {
      const res = await api.kmhflKenyaFacilities({
        search: facQ.trim() || undefined,
        limit: 50,
        page: nextPage,
        is_published: true,
        is_classified: false,
      });
      const rows: any[] = Array.isArray(res?.results) ? res.results : [];
      setKmhflCount(typeof res?.count === "number" ? res.count : null);
      setKmhflNext(typeof res?.next === "string" ? res.next : null);
      if (res?.demo_fallback) {
        setKmhflDemoNotice(
          "Showing pilot facility sample data. Set KMHFL_API_TOKEN (or KMHFL_USERNAME/PASSWORD) on the gateway for live MOH directory sync."
        );
      } else if (res?.source === "kmhfl-demo") {
        setKmhflDemoNotice("Pilot KMHFL sample directory (MOH API credentials not configured).");
      }
      setKmhflResults((prev) => (reset ? rows : [...prev, ...rows]));
      setKmhflPage(nextPage + 1);
    } catch (e) {
      setKmhflError(e instanceof Error ? e.message : "KMHFL fetch failed");
    } finally {
      setKmhflLoading(false);
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
    setKmhflResults([]);
    setKmhflPage(1);
    void loadKMHFL({ reset: true });
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
      shellVariant="admin"
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
            { id: "facilities", icon: BRAND_ICON, label: "Facilities" },
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
            <button className="btn-s" type="button" onClick={() => void exportOverviewHeader()}>
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
            <DashIcon icon={BRAND_ICON} idPrefix="qa-facility" className="qa-e" />
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
            <div className="kpi-ico">👥</div>
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
            <div className="kpi-ico"><DashIcon icon={BRAND_ICON} idPrefix="kpi-facilities" /></div>
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
            <button
              className="btn-s"
              type="button"
              onClick={() => setShowCsvImport((s) => !s)}
              aria-expanded={showCsvImport}
            >
              📥 Import CSV
            </button>
            <button className="btn-p" type="button" onClick={openCreateUser}>
              + Add User
            </button>
          </div>
        </div>

        {showCsvImport && (
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">Import users from CSV</div>
                <div className="pnl-sub">
                  One row per user. Columns: <span className="mono">name,email,role</span> and optionally{" "}
                  <span className="mono">facility,reg,status,auth</span>. First row may be a header.
                </div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setShowCsvImport(false)}>
                Close
              </button>
            </div>
            <div className="pnl-body">
              <textarea
                className="mono"
                rows={8}
                style={{ width: "100%", fontSize: 12, padding: 10, borderRadius: 8, border: "1.5px solid var(--bdr)" }}
                placeholder={`Dr Example,dr@hospital.go.ke,Doctor,KNH Nairobi,,Pending,OTP`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                disabled={csvBusy}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn-p btn-sm" type="button" disabled={csvBusy} onClick={() => void runCsvImport()}>
                  {csvBusy ? "Importing…" : "Run import"}
                </button>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>Duplicates (same email) are skipped and reported in the toast.</span>
              </div>
            </div>
          </div>
        )}

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
            <SearchBarBrand idPrefix="admin-fsearch" />
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
          <div className="ph-right">
            <button className="btn-p" type="button" onClick={openCreateFacility}>
              + Register Facility
            </button>
          </div>
        </div>

        {showFacilityEditor && (
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-title">{editingFacilityId ? "Manage facility" : "Add facility manually"}</div>
                  <div className="pnl-sub">Use this if the facility is not yet in KMHFL.</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn-s btn-sm" type="button" onClick={() => setShowFacilityEditor(false)}>
                    Close
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

            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-title">KMHFL Kenya directory</div>
                  <div className="pnl-sub">
                    {kmhflCount !== null ? (
                      <>
                        {kmhflCount.toLocaleString()} facilities · showing {kmhflResults.length.toLocaleString()}
                      </>
                    ) : (
                      <>Browse and select a facility from the national registry.</>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn-s btn-sm" type="button" onClick={() => void loadKMHFL({ reset: true })} disabled={kmhflLoading}>
                    {kmhflLoading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>
              <div className="pnl-body" style={{ paddingTop: 12 }}>
                <div className="fsearch" style={{ maxWidth: "none", marginBottom: 10 }}>
                  <SearchBarBrand idPrefix="admin-fsearch" />
                  <input
                    value={facQ}
                    onChange={(e) => setFacQ(e.target.value)}
                    placeholder="Search KMHFL by facility name, code, or keyword…"
                  />
                </div>

                {kmhflDemoNotice ? (
                  <div className="notice am" style={{ marginBottom: 12 }}>
                    <span className="notice-e">ℹ️</span>
                    <div className="notice-tx">{kmhflDemoNotice}</div>
                  </div>
                ) : null}
                {kmhflError ? (
                  <div className="errbanner is-visible" role="alert">
                    <span>⚠️</span>
                    <span style={{ lineHeight: 1.6 }}>
                      KMHFL lookup failed.
                      <br />
                      <span className="mono">{kmhflError}</span>
                    </span>
                  </div>
                ) : (
                  <div style={{ border: "1.5px solid var(--bdr)", borderRadius: 12, overflow: "hidden" }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Facility</th>
                          <th>County</th>
                          <th>Level</th>
                          <th className="mono">Code</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {kmhflResults.slice(0, 50).map((r, idx) => {
                          const name = String(r.name ?? r.official_name ?? r.display_name ?? "Facility");
                          const county =
                            r.county?.name ??
                            r.county_name ??
                            r.county ??
                            r.sub_county?.county?.name ??
                            r.sub_county?.name ??
                            "—";
                          const level =
                            r.keph_level_name ??
                            r.keph_level?.name ??
                            r.facility_type_name ??
                            r.facility_type?.name ??
                            r.facility_type?.category_name ??
                            "—";
                          const code = String(r.code ?? "—");
                          return (
                            <tr key={`${code}-${idx}`}>
                              <td style={{ fontWeight: 850, color: "var(--t1)" }}>{name}</td>
                              <td>{county}</td>
                              <td>{level}</td>
                              <td className="mono">{code}</td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  className="btn-s btn-sm"
                                  type="button"
                                  onClick={() => {
                                    setFacilityForm((s) => ({
                                      ...s,
                                      name,
                                      county: typeof county === "string" ? county : s.county,
                                      level: typeof level === "string" ? level : s.level,
                                      status: "ONLINE",
                                    }));
                                    toast("Facility selected from KMHFL.");
                                  }}
                                >
                                  Use →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {kmhflResults.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                              {kmhflLoading ? "Loading facilities…" : "No results. Try a different search."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>
                    KMHFL paging is loaded in batches to keep the UI fast.
                  </div>
                  <button className="btn-s btn-sm" type="button" onClick={() => void loadKMHFL()} disabled={kmhflLoading || !kmhflNext}>
                    {kmhflLoading ? "Loading…" : kmhflNext ? "Load more" : "End"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="filter-row">
          <div className="fsearch">
            <SearchBarBrand idPrefix="admin-fsearch" />
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn-s"
              type="button"
              onClick={() => {
                setShowWalkin(true);
                setWalkinMatches(null);
              }}
            >
              + Walk-in
            </button>
            <button className="btn-p" type="button" onClick={openCreatePatient}>
              + Register Patient
            </button>
          </div>
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
                <div className="g2" style={{ gap: 12 }}>
                  <div className="ff">
                    <label>Facility ID</label>
                    <input
                      className="mono"
                      value={walkinForm.facility_id}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, facility_id: e.target.value }))}
                      placeholder="e.g. FAC-0001"
                    />
                  </div>
                  <div className="ff">
                    <label>Triage Level</label>
                    <select value={walkinForm.triage_level} onChange={(e) => setWalkinForm((s) => ({ ...s, triage_level: e.target.value }))}>
                      {["Red", "Orange", "Yellow", "Green"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ff" style={{ gridColumn: "1 / -1" }}>
                    <label>Full name <span style={{ color: "var(--r)" }}>*</span></label>
                    <input value={walkinForm.full_name} onChange={(e) => setWalkinForm((s) => ({ ...s, full_name: e.target.value }))} placeholder="e.g. Jane Wanjiku" />
                  </div>
                  <div className="ff">
                    <label>Phone</label>
                    <input className="mono" value={walkinForm.phone} onChange={(e) => setWalkinForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+2547…" />
                  </div>
                  <div className="ff">
                    <label>Date of birth</label>
                    <input className="mono" value={walkinForm.dob} onChange={(e) => setWalkinForm((s) => ({ ...s, dob: e.target.value }))} placeholder="YYYY-MM-DD" />
                  </div>
                  <div className="ff">
                    <label>Gender</label>
                    <select value={walkinForm.gender} onChange={(e) => setWalkinForm((s) => ({ ...s, gender: e.target.value }))}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label>National ID / Passport</label>
                    <input
                      className="mono"
                      value={walkinForm.national_id}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, national_id: e.target.value }))}
                      placeholder="e.g. 12345678"
                    />
                  </div>
                  <div className="ff">
                    <label>Local MRN (facility record no.)</label>
                    <input
                      className="mono"
                      value={walkinForm.mrn}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, mrn: e.target.value }))}
                      placeholder="e.g. MRN-00482"
                    />
                  </div>
                  <div className="ff">
                    <label>Chief complaint</label>
                    <input
                      value={walkinForm.chief_complaint}
                      onChange={(e) => setWalkinForm((s) => ({ ...s, chief_complaint: e.target.value }))}
                      placeholder="e.g. cough, fever"
                    />
                  </div>
                </div>

                {walkinMatches && walkinMatches.length > 0 && (
                  <div className="notice am" style={{ marginTop: 14 }}>
                    <span className="notice-e">🧬</span>
                    <div className="notice-tx" style={{ width: "100%" }}>
                      <strong>Possible existing records — is this the same patient?</strong>
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
                              <button className="btn-p btn-sm" type="button" disabled={walkinBusy} onClick={() => void submitWalkin(m.uhid)}>
                                ✓ Link to UHID
                              </button>
                              <button className="btn-s btn-sm" type="button" disabled={walkinBusy} onClick={() => { setWalkinMatches(null); void submitWalkin("__create_new__"); }}>
                                No, new patient
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
        {lastCreatedWalkin && (
          <div className="notice g" style={{ marginBottom: 14 }}>
            <span className="notice-e">✅</span>
            <div className="notice-tx" style={{ width: "100%" }}>
              <strong>Walk-in registered</strong> ·{" "}
              {lastCreatedWalkin.action === "created_new" ? "New patient created" : `Linked to existing patient`} ·{" "}
              UHID <span className="mono">{lastCreatedWalkin.uhid}</span>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  className="btn-p btn-sm"
                  type="button"
                  onClick={() => {
                    void openPatient360(lastCreatedWalkin.uhid);
                    setLastCreatedWalkin(null);
                  }}
                >
                  View Patient 360 →
                </button>
                <button className="btn-s btn-sm" type="button" onClick={() => setLastCreatedWalkin(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cross-facility UHID search */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="pnl-hd">
            <div>
              <div className="pnl-ti">Cross-Facility Patient Search</div>
              <div className="pnl-su">Search by name, phone, or national ID across the full UniHealth identity index</div>
            </div>
          </div>
          <div className="pnl-bd">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                style={{ flex: 1 }}
                value={uhidSearch}
                onChange={(e) => setUhidSearch(e.target.value)}
                placeholder="Name, +2547… phone, or National ID"
                onKeyDown={(e) => e.key === "Enter" && void runUhidSearch()}
              />
              <button className="btn-p" type="button" onClick={() => void runUhidSearch()} disabled={uhidSearchBusy || !uhidSearch.trim()}>
                {uhidSearchBusy ? "Searching…" : "Search"}
              </button>
              {uhidSearchResults && (
                <button className="btn-s" type="button" onClick={() => { setUhidSearchResults(null); setUhidSearch(""); }}>
                  Clear
                </button>
              )}
            </div>

            {uhidSearchResults && uhidSearchResults.length === 0 && (
              <div style={{ marginTop: 10, color: "var(--t2)", fontSize: 13 }}>No matching patients found.</div>
            )}

            {uhidSearchResults && uhidSearchResults.length > 0 && (
              <table className="tbl" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th className="mono">UHID</th>
                    <th>Name</th>
                    <th className="mono">Phone</th>
                    <th className="mono">DOB</th>
                    <th>Aliases</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {uhidSearchResults.map((r: any) => (
                    <tr key={r.uhid}>
                      <td className="mono" style={{ fontWeight: 900, color: "var(--p)" }}>{r.uhid}</td>
                      <td style={{ fontWeight: 800 }}>{r.full_name}</td>
                      <td className="mono">{r.phone ?? "—"}</td>
                      <td className="mono">{r.dob ?? "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--t2)" }}>
                        {r.visit_count ?? 0} visits · {(r.aliases ?? []).length} facility alias(es)
                      </td>
                      <td>
                        <button className="btn-p btn-sm" type="button" onClick={() => void openPatient360(r.uhid)}>
                          Patient 360 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Patient 360 panel */}
        {patient360Uhid && (
          <div className="panel" style={{ marginBottom: 14, borderLeft: "4px solid var(--p)" }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">
                  Patient 360 ·{" "}
                  <span className="mono" style={{ color: "var(--p)" }}>
                    {patient360Uhid}
                  </span>
                </div>
                <div className="pnl-su">
                  Cross-facility identity · all MRN aliases · complete visit history
                </div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => { setPatient360Uhid(null); setPatient360Data(null); }}>
                Close
              </button>
            </div>
            <div className="pnl-bd">
              {patient360Loading && <div style={{ color: "var(--t2)", padding: "8px 0" }}>Loading…</div>}
              {!patient360Loading && patient360Data && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Core demographics */}
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                      Core Identity
                    </div>
                    <div className="g2" style={{ gap: 10 }}>
                      {[
                        ["Full Name", patient360Data.patient?.full_name],
                        ["Date of Birth", patient360Data.patient?.dob],
                        ["Gender", patient360Data.patient?.gender],
                        ["Phone", patient360Data.patient?.phone],
                        ["National ID", patient360Data.patient?.national_id],
                        ["Total visits", String(patient360Data.total_visits ?? 0)],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: "var(--s)", borderRadius: 8, padding: "8px 12px" }}>
                          <div style={{ fontSize: 11, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                          <div style={{ fontWeight: 800, marginTop: 2 }}>{value || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Facility aliases */}
                  {patient360Data.aliases && patient360Data.aliases.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Facility MRN Aliases ({patient360Data.aliases.length})
                      </div>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Facility</th>
                            <th className="mono">Facility ID</th>
                            <th className="mono">Local MRN</th>
                            <th className="mono">Linked at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patient360Data.aliases.map((a: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 700 }}>{a.facility_name ?? "—"}</td>
                              <td className="mono">{a.facility_id ?? "—"}</td>
                              <td className="mono" style={{ color: "var(--p)", fontWeight: 900 }}>{a.mrn ?? "—"}</td>
                              <td className="mono" style={{ fontSize: 12 }}>
                                {a.created_at ? new Date(a.created_at * 1000).toLocaleString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Visit history */}
                  {patient360Data.visits && patient360Data.visits.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 13, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                        Walk-in Visit History ({patient360Data.visits.length})
                      </div>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th className="mono">Visit ID</th>
                            <th>Facility</th>
                            <th>Complaint</th>
                            <th>Triage</th>
                            <th className="mono">MRN</th>
                            <th className="mono">Arrived</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patient360Data.visits.map((v: any) => {
                            const level = String(v.triage_level ?? "");
                            const levelColor =
                              level === "Red" ? "var(--r)" : level === "Orange" ? "#f97316" : level === "Yellow" ? "#ca8a04" : "var(--g)";
                            return (
                              <tr key={v.id}>
                                <td className="mono" style={{ fontSize: 12 }}>{v.id}</td>
                                <td style={{ fontWeight: 700 }}>{v.facility_name ?? "—"}</td>
                                <td>{v.chief_complaint ?? "—"}</td>
                                <td style={{ color: levelColor, fontWeight: 800 }}>{level || "—"}</td>
                                <td className="mono">{v.mrn ?? "—"}</td>
                                <td className="mono" style={{ fontSize: 12 }}>{v.arrived_at ?? "—"}</td>
                                <td>
                                  <span className={`tag ${v.status === "Resolved" ? "g" : "am"}`}>
                                    {v.status ?? "Pending"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {(patient360Data.aliases?.length ?? 0) === 0 && (patient360Data.visits?.length ?? 0) === 0 && (
                    <div style={{ color: "var(--t2)", fontSize: 13 }}>
                      No aliases or walk-in visits recorded yet for this patient.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="filter-row">
          <div className="fsearch">
            <SearchBarBrand idPrefix="admin-fsearch" />
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
                          <button
                            className="btn-s btn-sm"
                            type="button"
                            style={{ borderColor: "rgba(99,102,241,.35)", color: "var(--p)" }}
                            onClick={() => void openPatient360(p.afl_id)}
                          >
                            360°
                          </button>
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
          <button
            className="btn-p"
            type="button"
            onClick={async () => {
              try {
                await api.metricsJson();
                void uiAction("UniHealth gateway sync OK (metrics reachable).");
              } catch (e) {
                toast(e instanceof Error ? e.message : "Sync failed — API unreachable.");
              }
            }}
          >
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
            {
              ico: "📊",
              name: "Operational Summary",
              desc: "Facility uptime, KPIs, service volumes",
              tone: "g" as const,
              onExport: () => void exportMetricsReport(),
            },
            {
              ico: "🔐",
              name: "Security & RBAC",
              desc: "Role changes, access audits, AI alerts",
              tone: "b" as const,
              onExport: () => void exportSecurityReport(),
            },
            {
              ico: "⛓️",
              name: "Blockchain Audit Export",
              desc: "Append-only ledger events (KDPA compliant)",
              tone: "am" as const,
              onExport: () => void exportLedgerReport(),
            },
          ].map((r) => (
            <div
              className="rep-card"
              key={r.name}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onClick={() => r.onExport()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  r.onExport();
                }
              }}
            >
              <div className="rep-ico" style={{ background: r.tone === "g" ? "var(--gl)" : r.tone === "b" ? "var(--bl)" : "var(--al)" }}>
                {r.ico}
              </div>
              <div style={{ flex: 1 }}>
                <div className="rep-name">{r.name}</div>
                <div className="rep-desc">{r.desc}</div>
                <div className="rep-meta">
                  <span className="tag g">JSON</span>
                  <span className="tag grey">Click to download</span>
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
          <button
            className="btn-p"
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(ADMIN_POLICY_KEY, JSON.stringify(policyToggles));
                void uiAction("Settings saved.");
              } catch {
                toast("Could not save settings to this browser.");
              }
            }}
          >
            Save Changes
          </button>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Policy Toggles</div>
            <span className="tag g">ENFORCED</span>
          </div>
          <div className="pnl-body">
            {POLICY_DEFS.map((t, idx) => (
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
                <button
                  type="button"
                  className={`tag ${policyToggles[idx] ? "g" : "grey"}`}
                  style={{ cursor: "pointer", border: "none", font: "inherit" }}
                  onClick={() =>
                    setPolicyToggles((prev) => prev.map((on, i) => (i === idx ? !on : on)))
                  }
                >
                  {policyToggles[idx] ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI */}
      <div className={`pg${page === "ai" ? " on" : ""}`} id="pg-ai">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Phase 3 — AI Assist</div>
            <div className="ph-title">Capacity Intelligence</div>
            <div className="ph-sub">
              Real-time ward occupancy · ADT census history · 48-h bed demand forecast · anomaly audit
              {aiStatus && (
                <span style={{ marginLeft: 12, fontSize: 11, color: "var(--g)", background: "rgba(0,229,160,0.08)",
                  border: "1px solid rgba(0,229,160,0.2)", borderRadius: 5, padding: "2px 8px" }}>
                  {aiStatus.model_version} · {aiStatus.active_anomalies} active alerts
                </span>
              )}
            </div>
          </div>
          <div className="ph-r">
            <button className="btn-s btn-sm" type="button"
              onClick={async () => {
                try {
                  await api.aiStatus();
                  void uiAction("AI engine health check OK.");
                  toast("AI Engine: operational");
                } catch { toast("AI Engine: unreachable"); }
              }}>
              Ping AI Engine
            </button>
            <button className="btn-s btn-sm" type="button" disabled={aiRecomputeBusy}
              onClick={() => void (async () => {
                try {
                  setAiRecomputeBusy(true);
                  const res = await api.aiRecomputeForecasts();
                  const n = Object.keys(res.training_source_by_ward ?? {}).length;
                  toast(`Forecasts rebuilt for ${n} wards.`);
                  setAiRefreshTick(t => t + 1);
                } catch {
                  toast("Rebuild failed — API offline?");
                } finally {
                  setAiRecomputeBusy(false);
                }
              })()}>
              {aiRecomputeBusy ? "Rebuilding…" : "Rebuild All Forecasts"}
            </button>
            <button className="btn-p btn-sm" type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/ai/simulate/trigger-alert", {
                    headers: { "X-UniHealth-Role": "admin" }
                  });
                  if (res.ok) toast("Test alert injected — check anomaly rail.");
                  else toast("Failed to inject alert.");
                } catch { toast("API offline."); }
              }}>
              Inject Test Alert
            </button>
          </div>
        </div>

        {/* Ward Capacity Cards */}
        <div style={{ marginBottom: 20 }}>
          <div className="pnl-hd" style={{ marginBottom: 10 }}>
            <div className="pnl-title">Ward Occupancy — Live</div>
          </div>
          {aiWards.length === 0 ? (
            <div style={{ padding: "14px", color: "var(--t3)", fontSize: 13 }}>
              Loading ward data from AI engine…
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
              {aiWards.map((w: any) => (
                <div key={w.ward_id} style={{
                  padding: "16px 18px", background: "var(--card)", borderRadius: 12,
                  border: `1px solid ${w.pct >= 90 ? "rgba(255,51,102,0.35)" : w.pct >= 75 ? "rgba(255,184,48,0.3)" : "var(--bdr)"}`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)", marginBottom: 2 }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 8 }}>{w.facility}</div>
                  <div style={{ fontWeight: 900, fontSize: 28,
                    color: w.pct >= 90 ? "var(--r)" : w.pct >= 75 ? "var(--am)" : "var(--g)" }}>
                    {w.pct}%
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 8 }}>
                    {w.occupied} / {w.capacity} beds occupied
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${w.pct}%`,
                      background: w.pct >= 90 ? "var(--r)" : w.pct >= 75 ? "var(--am)" : "var(--g)",
                      transition: "width 0.7s ease" }} />
                  </div>
                  {/* Mini forecast sparkline */}
                  {aiForecasts[w.ward_id] && (
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 28, marginTop: 8 }}>
                      {(aiForecasts[w.ward_id] ?? []).slice(0, 12).map((s: any, i: number) => (
                        <div key={i} title={`${s.ts}: ${s.predicted}/${s.capacity}`}
                          style={{ flex: 1, height: `${Math.max(8, s.pct)}%`, borderRadius: "1px 1px 0 0",
                            background: s.status === "CRITICAL" ? "var(--r)" : s.status === "WARNING" ? "var(--am)" : "var(--g)",
                            opacity: 0.7 }} />
                      ))}
                    </div>
                  )}
                  {(() => {
                    const meta = aiForecasts[w.ward_id]?.[0]?.forecast_meta;
                    const src = meta?.training_source as string | undefined;
                    const label = src === "persisted_census"
                      ? `Trainer: persisted census · ${meta?.history_points ?? "—"} snapshots`
                      : src === "synthetic_bootstrap"
                        ? "Trainer: synthetic bootstrap (not enough history yet)"
                        : meta?.model === "heuristic_diurnal_fallback"
                          ? "Trainer: heuristic fallback (OLS unavailable)"
                          : meta
                            ? `Trainer: ${meta.model ?? "—"}`
                            : null;
                    return label ? (
                      <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 8, lineHeight: 1.35 }}>
                        {label}
                        {meta?.rmse_estimate_beds != null && (
                          <span> · RMSE ≈ {meta.rmse_estimate_beds} beds</span>
                        )}
                      </div>
                    ) : null;
                  })()}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
                    <input
                      type="number"
                      min={0}
                      max={w.capacity}
                      placeholder={`e.g. ${w.occupied}`}
                      value={censusDraftAdmin[w.ward_id] ?? ""}
                      onChange={(e) => setCensusDraftAdmin((prev) => ({ ...prev, [w.ward_id]: e.target.value }))}
                      style={{
                        width: 72, fontSize: 11, padding: "5px 8px", borderRadius: 6,
                        border: "1px solid var(--bdr)", background: "var(--bg)", color: "var(--t1)",
                      }}
                    />
                    <button className="btn-s btn-sm" type="button" style={{ fontSize: 11 }}
                      onClick={() => void (async () => {
                        const raw = (censusDraftAdmin[w.ward_id] ?? "").trim();
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
                          await api.aiWardCensusSnapshot(w.ward_id, {
                            occupied: occ,
                            source: "admin_capacity_ui",
                          }, "admin");
                          toast(`Census logged for ${w.name}.`);
                          setCensusDraftAdmin((prev) => {
                            const next = { ...prev };
                            delete next[w.ward_id];
                            return next;
                          });
                          setAiRefreshTick((t) => t + 1);
                        } catch {
                          toast("Could not log census.");
                        }
                      })()}>
                      Log census
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADT census ring buffer — trainer input */}
        {aiWards.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="pnl-hd" style={{ marginBottom: 10 }}>
              <div className="pnl-title">ADT Census History</div>
              <span className="tag b" style={{ fontSize: 10 }}>
                {adminHistoryLoading ? "Loading…" : `${adminHistoryRows.length} hourly rows`}
              </span>
            </div>
            <div style={{
              padding: "14px 16px",
              background: "var(--card)",
              borderRadius: 12,
              border: "1px solid var(--bdr)",
            }}>
              <div style={{
                fontSize: 12,
                color: "var(--t3)",
                marginBottom: 12,
                lineHeight: 1.45,
              }}>
                Hourly occupancy buckets (max 720) that feed the OLS bed-demand model.
                Sources include simulator seed, <strong style={{ color: "var(--t2)" }}>Log census</strong> entries, and integrations.
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                marginBottom: 14,
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t2)" }}>
                  Ward
                  <select
                    value={adminHistoryWardId}
                    onChange={(e) => setAdminHistoryWardId(e.target.value)}
                    style={{
                      minWidth: 180,
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--bdr)",
                      background: "var(--bg)",
                      color: "var(--t1)",
                    }}
                  >
                    {aiWards.map((w: any) => (
                      <option key={w.ward_id} value={w.ward_id}>
                        {w.name} ({w.ward_id})
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t2)" }}>
                  Window
                  <select
                    value={adminHistoryLimit}
                    onChange={(e) => setAdminHistoryLimit(Number(e.target.value))}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--bdr)",
                      background: "var(--bg)",
                      color: "var(--t1)",
                    }}
                  >
                    {[24, 48, 168, 720].map((n) => (
                      <option key={n} value={n}>{n} h</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-s btn-sm"
                  style={{ fontSize: 11 }}
                  disabled={adminHistoryLoading}
                  onClick={() => setAiRefreshTick((t) => t + 1)}
                >
                  Refresh history
                </button>
                <button
                  type="button"
                  className="btn-s btn-sm"
                  style={{ fontSize: 11 }}
                  disabled={adminHistoryLoading || adminHistoryRows.length === 0}
                  onClick={() => {
                    const csv = buildWardCensusCsv(adminHistoryWardId, adminHistoryRows);
                    const stamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "");
                    downloadCsvFile(
                      `unihealth-census-${adminHistoryWardId}-${adminHistoryLimit}h-${stamp}.csv`,
                      csv,
                    );
                    toast("CSV export started.");
                  }}
                >
                  Export CSV
                </button>
              </div>
              {adminHistoryRows.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Occupancy trend ({Math.min(48, adminHistoryRows.length)}h tail)
                  </div>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 44 }}>
                    {adminHistoryRows.slice(-48).map((r: any, i: number) => {
                      const cap = Math.max(1, Number(r.capacity) || 1);
                      const pct = Math.min(100, (Number(r.occupied) / cap) * 100);
                      return (
                        <div
                          key={`${r.ts_epoch}-${i}`}
                          title={`${r.ts_iso ?? r.ts_epoch}: ${r.occupied}/${r.capacity} · ${r.source ?? "—"}`}
                          style={{
                            flex: 1,
                            height: `${Math.max(6, pct)}%`,
                            minHeight: 3,
                            borderRadius: "2px 2px 0 0",
                            background: pct >= 90 ? "var(--r)" : pct >= 75 ? "var(--am)" : "var(--g)",
                            opacity: 0.75,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ maxHeight: 220, overflow: "auto", borderRadius: 8, border: "1px solid var(--bdr)" }}>
                <table className="tbl" style={{ margin: 0, fontSize: 11 }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
                    <tr>
                      <th>Time (UTC)</th>
                      <th>Occupied</th>
                      <th>Capacity</th>
                      <th>%</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminHistoryLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "14px", color: "var(--t3)", textAlign: "center" }}>
                          Loading census rows…
                        </td>
                      </tr>
                    ) : adminHistoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "14px", color: "var(--t3)", textAlign: "center" }}>
                          No history for this ward yet.
                        </td>
                      </tr>
                    ) : (
                      [...adminHistoryRows].reverse().slice(0, 24).map((r: any, idx: number) => {
                        const cap = Math.max(1, Number(r.capacity) || 1);
                        const occ = Number(r.occupied);
                        const p = Math.round((occ / cap) * 1000) / 10;
                        return (
                          <tr key={`${r.ts_epoch}-${idx}`}>
                            <td className="mono" style={{ fontSize: 10 }}>{r.ts_iso ?? r.ts_epoch}</td>
                            <td>{occ}</td>
                            <td>{cap}</td>
                            <td>{p}%</td>
                            <td style={{ color: "var(--t3)" }}>{String(r.source ?? "—")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Active Anomalies */}
        <div style={{ marginBottom: 20 }}>
          <div className="pnl-hd" style={{ marginBottom: 10 }}>
            <div className="pnl-title">Active Clinical Anomalies</div>
            <span className="tag am">
              {aiAnomalies.filter((a: any) => !a.acknowledged).length} unacknowledged
            </span>
          </div>
          {aiAnomalies.length === 0 ? (
            <div style={{ padding: "12px 14px", background: "rgba(0,229,160,0.05)",
              border: "1px solid rgba(0,229,160,0.15)", borderRadius: 10, fontSize: 13, color: "var(--t3)" }}>
              No active anomalies — AI engine running normally.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Severity</th><th>Patient</th><th>Metric</th>
                    <th>Value</th><th>Message</th><th>Type</th><th>Acked</th><th />
                  </tr>
                </thead>
                <tbody>
                  {aiAnomalies.slice(0, 20).map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <span className={`tag ${a.severity === "CRITICAL" ? "r" : "am"}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="mono">{a.patient_id}</td>
                      <td style={{ fontWeight: 600 }}>{(a.metric ?? "").toUpperCase()}</td>
                      <td className="mono">{a.value}</td>
                      <td style={{ fontSize: 11, color: "var(--t2)", maxWidth: 260 }}>{a.msg}</td>
                      <td style={{ fontSize: 11 }}>{a.type}</td>
                      <td>
                        <span style={{ fontSize: 11, color: a.acknowledged ? "var(--g)" : "var(--t3)" }}>
                          {a.acknowledged ? "✓ Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        {!a.acknowledged && (
                          <button className="btn-s" style={{ fontSize: 11, padding: "3px 9px" }}
                            onClick={() => void ackAdminAnomaly(a.id)}>
                            Ack
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* KDPA AI Audit Trail */}
        <div>
          <div className="pnl-hd" style={{ marginBottom: 10 }}>
            <div className="pnl-title">AI Audit Trail (KDPA)</div>
            <span className="tag b">{aiAudit.length} entries</span>
          </div>
          {aiAudit.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--t3)", padding: "12px 0" }}>
              No AI recommendations logged yet. Use diagnosis hints or anomaly checks to generate entries.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Audit ID</th><th>Event</th><th>Role</th>
                    <th>Patient</th><th>Model</th><th>Timestamp</th><th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {aiAudit.slice(0, 20).map((e: any) => (
                    <tr key={e.audit_id}>
                      <td className="mono" style={{ fontSize: 10 }}>{e.audit_id}</td>
                      <td style={{ fontSize: 12 }}>{e.event}</td>
                      <td><span className="tag b" style={{ fontSize: 10 }}>{e.role}</span></td>
                      <td className="mono">{e.patient_id ?? "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--t3)" }}>{e.model_version}</td>
                      <td style={{ fontSize: 11 }}>{e.ts?.replace("T", " ").replace("Z", "")}</td>
                      <td style={{ fontSize: 11 }}>
                        {e.feedback ? (
                          <span style={{ color: "var(--g)", fontWeight: 600 }}>
                            {e.feedback.action}
                          </span>
                        ) : (
                          <span style={{ color: "var(--t3)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <button
                    className="btn-s"
                    type="button"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={() => void uiAction("Edit role: System Administrator (policy editor opens in Phase 2).")}
                  >
                    Edit Role
                  </button>
                </td>
              </tr>
              <tr>
                <td>Security Administrator</td>
                <td className="mono">2</td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>Audit, RBAC, blocks</td>
                <td>
                  <button
                    className="btn-s"
                    type="button"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={() => void uiAction("Edit role: Security Administrator (policy editor opens in Phase 2).")}
                  >
                    Edit Role
                  </button>
                </td>
              </tr>
              <tr>
                <td>Data Manager</td>
                <td className="mono">5</td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>Data exports, reports</td>
                <td>
                  <button
                    className="btn-s"
                    type="button"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                    onClick={() => void uiAction("Edit role: Data Manager (policy editor opens in Phase 2).")}
                  >
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

