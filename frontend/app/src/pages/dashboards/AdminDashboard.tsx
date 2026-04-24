import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

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
            <button className="btn-s" type="button" onClick={() => toast("Export report coming soon (demo).")}>
              📥 Export Report
            </button>
            <button className="btn-p" type="button" onClick={() => { setPage("users"); toast("Opening user creation (demo)."); }}>
              + Add User
            </button>
          </div>
        </div>

        <div className="qa">
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("users")}>
            <span className="qa-e">👤</span>
            <span className="qa-t">Add Staff</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("patients")}>
            <span className="qa-e">🧑‍⚕️</span>
            <span className="qa-t">Register Patient</span>
          </div>
          <div className="qa-item" role="button" tabIndex={0} onClick={() => setPage("facilities")}>
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
                    Cannot reach API at <code>http://localhost:8000</code>.
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
            <button className="btn-s" type="button" onClick={() => toast("CSV import coming soon (demo).")}>
              📥 Import CSV
            </button>
            <button className="btn-p" type="button" onClick={() => toast("Add user coming soon (demo).")}>
              + Add User
            </button>
          </div>
        </div>
        <div className="filter-row">
          <div className="fsearch">
            <span aria-hidden>🔎</span>
            <input placeholder="Search name, email, reg. number…" />
          </div>
          <select className="fsel">
            <option>All Roles</option>
            <option>Doctor</option>
            <option>Nurse / CO</option>
            <option>Administrator</option>
          </select>
          <select className="fsel">
            <option>All Facilities</option>
            <option>KNH Nairobi</option>
            <option>Coast General</option>
            <option>MTRH Eldoret</option>
          </select>
          <select className="fsel">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Pending</option>
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
              {[
                { av: "MK", name: "M. Kamau", email: "m.kamau@moh.go.ke", role: "System Admin", reg: "ADM-0142", fac: "MOH HQ", last: "Today 08:12", auth: "Biometric", status: "Active", tone: "g" as const },
                { av: "SN", name: "S. Njeri", email: "s.njeri@unihealth.ke", role: "Security Admin", reg: "SEC-0081", fac: "UniHealth SecOps", last: "Today 07:51", auth: "Practice 360", status: "Active", tone: "b" as const },
                { av: "JO", name: "J. Odhiambo", email: "j.odhiambo@unihealth.ke", role: "Data Manager", reg: "DM-2210", fac: "Data Hub", last: "Yesterday 19:02", auth: "OTP", status: "Pending", tone: "am" as const },
              ].map((u) => (
                <tr key={u.email}>
                  <td>
                    <div className="cell-user">
                      <div className={`av ${u.tone === "g" ? "" : u.tone}`}>{u.av}</div>
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--t1)" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td className="mono">{u.reg}</td>
                  <td>{u.fac}</td>
                  <td className="mono">{u.last}</td>
                  <td>
                    <span className={`tag ${u.auth === "OTP" ? "am" : u.auth === "Practice 360" ? "b" : "g"} dot`}>{u.auth}</span>
                  </td>
                  <td>
                    <span className={`tag ${u.status === "Active" ? "g" : u.status === "Pending" ? "am" : "grey"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-s" type="button" style={{ fontSize: 11, padding: "5px 10px" }}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
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
          <button className="btn-p" type="button" onClick={() => toast("Register facility coming soon (demo).")}>
            + Register Facility
          </button>
        </div>
        <div className="g3" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {[
            { name: "KNH Nairobi", loc: "Nairobi · Level 6", up: 99, lat: "22ms", tone: "g" as const },
            { name: "Nakuru Level 5", loc: "Nakuru · Level 5", up: 92, lat: "88ms", tone: "am" as const },
            { name: "MTRH Eldoret", loc: "Uasin Gishu · Level 6", up: 98, lat: "31ms", tone: "g" as const },
          ].map((f) => (
            <div className="fac-card" key={f.name}>
              <div className="fac-top">
                <div>
                  <div className="fac-name">{f.name}</div>
                  <div className="fac-loc">{f.loc}</div>
                </div>
                <span className={`tag ${f.tone === "am" ? "am" : "g"} dot`}>{f.tone === "am" ? "DEGRADED" : "ONLINE"}</span>
              </div>
              <div className="fac-stats">
                <div className="fac-s">
                  <div className="fac-sv">{f.up}%</div>
                  <div className="fac-sl">Uptime</div>
                </div>
                <div className="fac-s">
                  <div className="fac-sv">{f.lat}</div>
                  <div className="fac-sl">Latency</div>
                </div>
              </div>
              <div className="pbar">
                <div className="pbar-fill" style={{ width: `${f.up}%`, background: f.tone === "am" ? "var(--am)" : "var(--g)" }} />
              </div>
            </div>
          ))}
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
          <button className="btn-p" type="button" onClick={() => toast("Patient registration coming soon (demo).")}>
            + Register Patient
          </button>
        </div>
        <div className="panel">
          <table className="tbl">
            <thead>
              <tr>
                <th>Patient</th>
                <th>National ID</th>
                <th>County</th>
                <th>UniHealth Status</th>
                <th>UniHealth No.</th>
                <th>Last Visit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="cell-user">
                    <div className="av">WN</div>
                    <div>
                      <div style={{ fontWeight: 800, color: "var(--t1)" }}>Wangui Njoroge</div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>Female · 32y</div>
                    </div>
                  </div>
                </td>
                <td className="mono">3120••••</td>
                <td>Nairobi</td>
                <td>
                  <span className="tag g dot">Active</span>
                </td>
                <td className="mono">AFL-2024-884321</td>
                <td className="mono">Today</td>
                <td>
                  <button className="btn-s" type="button" style={{ fontSize: 11, padding: "5px 10px" }}>
                    View
                  </button>
                </td>
              </tr>
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
          <button className="btn-p" type="button" onClick={() => toast("UniHealth sync triggered (demo).")}>
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
            <div className="ph-sub">Global system settings and policies (demo UI)</div>
          </div>
          <button className="btn-p" type="button" onClick={() => toast("Settings saved (demo).")}>
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
            <div className="ph-sub">Anomaly detection, access guardrails, and automated response (demo UI)</div>
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
            <div className="ph-sub">Role-based access control overview (demo UI)</div>
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
            <div className="ph-sub">Backups, latency, cache, and node status (demo UI)</div>
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

