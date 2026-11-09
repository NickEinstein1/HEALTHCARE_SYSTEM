import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { CrudRowActions } from "../../components/CrudRowActions";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";
import { DashIcon } from "../../components/brand/DashIcon";

type LabPage =
  | "overview"
  | "collection"
  | "tests"
  | "results"
  | "qc"
  | "imaging"
  | "xray"
  | "mri"
  | "ultrasound"
  | "mammography"
  | "nuclear"
  | "pathology"
  | "microbiology"
  | "bloodbank"
  | "molecular"
  | "reagents"
  | "reports"
  | "audit"
  | "health";

const TITLES: Record<LabPage, string> = {
  overview: "Overview",
  collection: "Sample Collection",
  tests: "Test Queue",
  results: "Results Entry",
  qc: "Quality Control",
  imaging: "All Imaging",
  xray: "X-Ray",
  mri: "MRI / CT",
  ultrasound: "Ultrasound",
  mammography: "Mammography",
  nuclear: "Nuclear Medicine",
  pathology: "Pathology",
  microbiology: "Microbiology",
  bloodbank: "Blood Bank",
  molecular: "Molecular Dx",
  reagents: "Reagents & Supplies",
  reports: "Reports",
  audit: "Audit Trail",
  health: "System Health",
};

export function LabDashboard() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<LabPage>("overview");

  const orders = usePolling(() => api.labOrders(200), { intervalMs: 5000 });
  const results = usePolling(() => api.labResults(200), { intervalMs: 7000 });
  const qc = usePolling(() => api.labQc(200), { intervalMs: 10000 });
  const imaging = usePolling(() => api.labImagingOrders(200), { intervalMs: 8000 });

  const [globalSearch, setGlobalSearch] = useState("");

  const uiAction = async (label: string) => {
    try {
      await api.uiAction({ role: "lab", page, label });
    } catch {
      // ignore
    }
    toast(label);
  };

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({
    patient_id: "P001",
    afl_id: "AFL-78841209",
    panel: "U&E",
    priority: "Routine",
    status: "Requested",
  });

  const openOrderModal = (row?: Record<string, unknown>) => {
    if (row) {
      setEditingOrderId(String(row.id ?? ""));
      setOrderForm({
        patient_id: String(row.patient_id ?? "P001"),
        afl_id: String(row.afl_id ?? ""),
        panel: String(row.panel ?? "U&E"),
        priority: String(row.priority ?? "Routine"),
        status: String(row.status ?? "Requested"),
      });
    } else {
      setEditingOrderId(null);
      setOrderForm({ patient_id: "P001", afl_id: "AFL-78841209", panel: "U&E", priority: "Routine", status: "Requested" });
    }
    setNewOrderOpen(true);
  };

  const [newImagingOpen, setNewImagingOpen] = useState(false);
  const [imagingForm, setImagingForm] = useState({
    patient_id: "P002",
    modality: "X-Ray",
    study: "CXR — PA",
  });

  useEffect(() => {
    // keep forms “feeling alive” without forcing user input
    if (page === "collection") setNewOrderOpen(false);
  }, [page]);

  const filteredOrders = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const rows = (orders.data ?? []) as any[];
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [orders.data, globalSearch]);

  const filteredImaging = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const rows = (imaging.data ?? []) as any[];
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [imaging.data, globalSearch]);

  const kpi = useMemo(() => {
    const o = (orders.data ?? []) as any[];
    const img = (imaging.data ?? []) as any[];
    const pendingCollections = o.filter((x) => String(x.status || "").toLowerCase().includes("request")).length || 5;
    const queue = o.length || 8;
    const studies = img.length || 14;
    return { pendingCollections, queue, studies };
  }, [orders.data, imaging.data]);

  return (
    <DashboardShell
      shellVariant="lab"
      title={TITLES[page]}
      crumb={page === "overview" ? "Lab & Imaging" : `Lab › ${TITLES[page]}`}
      portalSubtitle="Lab & Imaging Portal"
      userInitials="LK"
      userName="Laban K."
      userEmail="lab.technologist@crh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as LabPage)}
      topbarSearchPlaceholder="Search samples, tests, images…"
      topbarSearchValue={globalSearch}
      onTopbarSearchChange={setGlobalSearch}
      onTopbarNotificationsClick={() => {
        setPage("audit");
        void uiAction("Opened alerts / audit.");
      }}
      onTopbarStatusClick={() => {
        setPage("health");
        void uiAction("Opened system health.");
      }}
      nav={[
        {
          label: "Lab Workflow",
          items: [
            { id: "overview", icon: "🏠", label: "Overview" },
            { id: "collection", icon: "📋", label: "Sample Collection", badge: { text: String(kpi.pendingCollections), tone: "red" } },
            { id: "tests", icon: "🧪", label: "Test Queue", badge: { text: String(kpi.queue), tone: "amber" } },
            { id: "results", icon: "✍️", label: "Results Entry" },
            { id: "qc", icon: "✅", label: "Quality Control" },
          ],
        },
        {
          label: "Diagnostic Imaging",
          items: [
            { id: "imaging", icon: "📷", label: "All Imaging", badge: { text: String(kpi.studies), tone: "amber" } },
            { id: "xray", icon: "🩻", label: "X-Ray", badge: { text: "4", tone: "amber" } },
            { id: "mri", icon: "🧠", label: "MRI / CT", badge: { text: "3", tone: "amber" } },
            { id: "ultrasound", icon: "📡", label: "Ultrasound", badge: { text: "5", tone: "green" } },
            { id: "mammography", icon: "🛡️", label: "Mammography", badge: { text: "2", tone: "amber" } },
            { id: "nuclear", icon: "⚛️", label: "Nuclear Medicine", badge: { text: "1", tone: "amber" } },
          ],
        },
        {
          label: "Specialised Labs",
          items: [
            { id: "pathology", icon: "👁️", label: "Pathology" },
            { id: "microbiology", icon: "🌡️", label: "Microbiology" },
            { id: "bloodbank", icon: "🩸", label: "Blood Bank", badge: { text: "3", tone: "red" } },
            { id: "molecular", icon: "🧬", label: "Molecular Dx" },
          ],
        },
        {
          label: "Inventory & Compliance",
          items: [
            { id: "reagents", icon: "📦", label: "Reagents & Supplies", badge: { text: "2", tone: "amber" } },
            { id: "reports", icon: "📄", label: "Reports" },
            { id: "audit", icon: "⛓️", label: "Audit Trail" },
            { id: "health", icon: "💾", label: "System Health" },
          ],
        },
      ]}
    >
      <div className={`pg${page === "overview" ? " on" : ""}`} id="pg-overview">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Laboratory & Diagnostic Imaging · Central Referral Hospital</div>
            <div className="ph-title">Good morning, Laban</div>
            <div className="ph-sub">
              <strong>{kpi.pendingCollections}</strong> pending collections · <strong>{kpi.queue}</strong> tests in queue ·{" "}
              <strong>{kpi.studies}</strong> imaging studies · AI monitor active
            </div>
          </div>
          <div className="ph-right">
            <button className="btn-s" type="button" onClick={() => setPage("collection")}>
              <DashIcon icon="📋" /> Collect
            </button>
            <button className="btn-p" type="button" onClick={() => setPage("imaging")}>
              <DashIcon icon="📷" /> Imaging
            </button>
          </div>
        </div>

        <div className="g2e">
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">Lab Orders (live)</div>
                <div className="pnl-sub">In-memory Phase 1 feed from `/lab/orders`</div>
              </div>
              <button className="btn-p btn-sm" type="button" onClick={() => setNewOrderOpen(true)}>
                + New order
              </button>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">Order</th>
                    <th className="mono">Patient</th>
                    <th>Panel</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 12).map((o) => (
                    <tr key={o.id}>
                      <td className="mono">{o.id}</td>
                      <td className="mono">{o.patient_id ?? "—"}</td>
                      <td style={{ fontWeight: 800 }}>{o.panel}</td>
                      <td>
                        <span className={`tag ${String(o.priority).toLowerCase().includes("stat") ? "r" : String(o.priority).toLowerCase().includes("urgent") ? "am" : "g"}`}>
                          {o.priority}
                        </span>
                      </td>
                      <td>
                        <span className="tag grey">{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  {!orders.loading && filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                        No lab orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">QC (live)</div>
                <div className="pnl-sub">Latest instrument controls</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => { qc.refresh(); void uiAction("QC refreshed."); }}>
                Refresh
              </button>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Control</th>
                    <th>Status</th>
                    <th className="mono">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(qc.data ?? []).slice(0, 8).map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 800 }}>{r.instrument}</td>
                      <td>{r.control}</td>
                      <td>
                        <span className={`tag ${String(r.status).toUpperCase() === "PASS" ? "g" : "r"}`}>{r.status}</span>
                      </td>
                      <td className="mono">{r.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className={`pg${page === "collection" ? " on" : ""}`} id="pg-collection">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Lab Workflow</div>
            <div className="ph-title">Sample Collection</div>
            <div className="ph-sub">Create and track specimen collection requests.</div>
          </div>
          <button className="btn-p" type="button" onClick={() => openOrderModal()}>
            + Create collection order
          </button>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Orders</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">Order</th>
                  <th className="mono">Patient</th>
                  <th>Panel</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 30).map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td className="mono">{o.patient_id ?? "—"}</td>
                    <td style={{ fontWeight: 800 }}>{o.panel}</td>
                    <td>
                      <span className="tag grey">{o.status}</span>
                    </td>
                    <td>
                      <CrudRowActions
                        onEdit={() => openOrderModal(o)}
                        onDelete={async () => {
                          if (!window.confirm(`Delete order ${o.id}?`)) return;
                          try {
                            await api.labOrderDelete(String(o.id));
                            orders.refresh();
                            toast("Order deleted.");
                          } catch (e) {
                            toast(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "tests" ? " on" : ""}`} id="pg-tests">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Lab Workflow</div>
            <div className="ph-title">Test Queue</div>
            <div className="ph-sub">Ordered tests ready for processing.</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Queue</div>
            <span className="tag am dot">LIVE</span>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">Order</th>
                  <th>Panel</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 30).map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td style={{ fontWeight: 800 }}>{o.panel}</td>
                    <td>
                      <span className="tag am">{o.priority}</span>
                    </td>
                    <td>
                      <span className="tag grey">{o.status}</span>
                    </td>
                    <td>
                      <CrudRowActions
                        onEdit={() => openOrderModal(o)}
                        onDelete={async () => {
                          if (!window.confirm(`Delete order ${o.id}?`)) return;
                          try {
                            await api.labOrderDelete(String(o.id));
                            orders.refresh();
                            toast("Order deleted.");
                          } catch (e) {
                            toast(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "results" ? " on" : ""}`} id="pg-results">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Lab Workflow</div>
            <div className="ph-title">Results Entry</div>
            <div className="ph-sub">Results feed from `/lab/results` (Phase 1).</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Recent results</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">Result</th>
                  <th className="mono">Patient</th>
                  <th>Test</th>
                  <th>Value</th>
                  <th>Flag</th>
                  <th className="mono">Time</th>
                </tr>
              </thead>
              <tbody>
                {(results.data ?? []).slice(0, 30).map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td className="mono">{r.patient_id}</td>
                    <td style={{ fontWeight: 800 }}>{r.test}</td>
                    <td className="mono">
                      {r.value} {r.unit}
                    </td>
                    <td>
                      <span className={`tag ${String(r.flag).toUpperCase() === "HIGH" ? "r" : "g"}`}>{r.flag}</span>
                    </td>
                    <td className="mono">{r.ts}</td>
                  </tr>
                ))}
                {!results.loading && (results.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                      No results yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "qc" ? " on" : ""}`} id="pg-qc">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Lab Workflow</div>
            <div className="ph-title">Quality Control</div>
            <div className="ph-sub">Instrument control checks (Phase 1).</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">QC feed</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">QC</th>
                  <th>Instrument</th>
                  <th>Control</th>
                  <th>Status</th>
                  <th className="mono">Time</th>
                </tr>
              </thead>
              <tbody>
                {(qc.data ?? []).slice(0, 30).map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td style={{ fontWeight: 800 }}>{r.instrument}</td>
                    <td>{r.control}</td>
                    <td>
                      <span className={`tag ${String(r.status).toUpperCase() === "PASS" ? "g" : "r"}`}>{r.status}</span>
                    </td>
                    <td className="mono">{r.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "imaging" ? " on" : ""}`} id="pg-imaging">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Diagnostic Imaging</div>
            <div className="ph-title">Imaging Worklist</div>
            <div className="ph-sub">Worklist from `/lab/imaging` (Phase 1).</div>
          </div>
          <button className="btn-p" type="button" onClick={() => setNewImagingOpen(true)}>
            + Add study
          </button>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">All studies</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">ID</th>
                  <th className="mono">Patient</th>
                  <th>Study</th>
                  <th>Modality</th>
                  <th>Status</th>
                  <th className="mono">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredImaging.slice(0, 40).map((x) => (
                  <tr key={x.id}>
                    <td className="mono">{x.id}</td>
                    <td className="mono">{x.patient_id ?? "—"}</td>
                    <td style={{ fontWeight: 800 }}>{x.study}</td>
                    <td>{x.modality}</td>
                    <td>
                      <span className="tag am">{x.status}</span>
                    </td>
                    <td className="mono">{x.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(["xray", "mri", "ultrasound", "mammography", "nuclear"] as LabPage[]).map((p) => (
        <div className={`pg${page === p ? " on" : ""}`} id={`pg-${p}`} key={p}>
          <div className="ph">
            <div>
              <div className="ph-eyebrow">Diagnostic Imaging</div>
              <div className="ph-title">{TITLES[p]}</div>
              <div className="ph-sub">Filtered view of the imaging worklist.</div>
            </div>
            <button className="btn-s" type="button" onClick={() => setPage("imaging")}>
              View all →
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Studies</div>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">ID</th>
                    <th className="mono">Patient</th>
                    <th>Study</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImaging
                    .filter((x) => String(x.modality || "").toLowerCase().includes(p === "xray" ? "x" : p === "mri" ? "mri" : p === "ultrasound" ? "ultra" : p === "mammography" ? "mammo" : "nuclear"))
                    .slice(0, 30)
                    .map((x) => (
                      <tr key={x.id}>
                        <td className="mono">{x.id}</td>
                        <td className="mono">{x.patient_id ?? "—"}</td>
                        <td style={{ fontWeight: 800 }}>{x.study}</td>
                        <td>
                          <span className="tag am">{x.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {(["pathology", "microbiology", "bloodbank", "molecular", "reagents", "reports", "audit", "health"] as LabPage[]).map((p) => {
        const ctaLabels: Partial<Record<LabPage, string>> = {
          pathology:     "Log Specimen",
          microbiology:  "Log Culture",
          bloodbank:     "Log Cross-match",
          molecular:     "Log PCR Run",
          reagents:      "Log Reorder",
          reports:       "Generate Report",
          audit:         "Export Audit Log",
          health:        "Log Health Check",
        };
        const cta = ctaLabels[p] ?? "Log Action";
        return (
          <div className={`pg${page === p ? " on" : ""}`} id={`pg-${p}`} key={p}>
            <div className="ph">
              <div>
                <div className="ph-eyebrow">Lab & Compliance</div>
                <div className="ph-title">{TITLES[p]}</div>
              </div>
              <button
                className="btn-p"
                type="button"
                onClick={async () => {
                  const res = await api.uiAction({ role: "lab", page: p, label: cta, type: p }).catch(() => ({ id: "offline" }));
                  toast(`${cta} — logged (${res.id ?? "ok"}). Full workflow coming in the next sprint.`);
                }}
              >
                {cta}
              </button>
            </div>
            <div className="panel">
              <div className="pnl-hd"><div className="pnl-title">{TITLES[p]}</div></div>
              <div className="pnl-body" style={{ color: "var(--t2)", fontSize: 12, lineHeight: 1.8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div><DashIcon icon="✅" /> Navigation and audit logging are live. Every action is recorded to <code>/ui/actions</code>.</div>
                  <div><DashIcon icon="🔬" /> <strong>{TITLES[p]}</strong> workflows will be expanded with dedicated CRUD, LIS integrations, and reports.</div>
                  <button
                    className="btn-s btn-sm"
                    type="button"
                    style={{ alignSelf: "flex-start" }}
                    onClick={async () => {
                      const res = await api.uiAction({ role: "lab", page: p, label: `View ${TITLES[p]} log`, type: "view_log" }).catch(() => ({ id: "offline" }));
                      toast(`${TITLES[p]} log viewed (${res.id ?? "ok"}).`);
                    }}
                  >
                    View Recent Log →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {newOrderOpen && (
        <>
          <div className="modal-backdrop" role="presentation" onClick={() => setNewOrderOpen(false)} />
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-hd">
              <div>
                <div className="modal-ti">{editingOrderId ? "Edit lab order" : "Create lab order"}</div>
                <div className="modal-sub">Phase 1 orders in `/lab/orders`.</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setNewOrderOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-bd">
              <div className="g2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ff">
                  <label>Patient ID</label>
                  <input className="mono" value={orderForm.patient_id} onChange={(e) => setOrderForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>AFL ID (optional)</label>
                  <input className="mono" value={orderForm.afl_id} onChange={(e) => setOrderForm((s) => ({ ...s, afl_id: e.target.value }))} />
                </div>
              </div>
              <div className="g2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                <div className="ff">
                  <label>Panel</label>
                  <select value={orderForm.panel} onChange={(e) => setOrderForm((s) => ({ ...s, panel: e.target.value }))}>
                    <option>U&E</option>
                    <option>FBC</option>
                    <option>LFT</option>
                    <option>CRP</option>
                    <option>HbA1c</option>
                  </select>
                </div>
                <div className="ff">
                  <label>Priority</label>
                  <select value={orderForm.priority} onChange={(e) => setOrderForm((s) => ({ ...s, priority: e.target.value }))}>
                    <option>Routine</option>
                    <option>Urgent</option>
                    <option>STAT</option>
                  </select>
                </div>
              </div>
              {editingOrderId ? (
                <div className="ff" style={{ marginTop: 10 }}>
                  <label>Status</label>
                  <select value={orderForm.status} onChange={(e) => setOrderForm((s) => ({ ...s, status: e.target.value }))}>
                    <option>Requested</option>
                    <option>Collected</option>
                    <option>In progress</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                </div>
              ) : null}
            </div>
            <div className="modal-ft">
              <button
                className="btn-s"
                type="button"
                onClick={() => {
                  setNewOrderOpen(false);
                  setEditingOrderId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={async () => {
                  try {
                    const body = {
                      patient_id: orderForm.patient_id.trim(),
                      afl_id: orderForm.afl_id.trim(),
                      panel: orderForm.panel,
                      priority: orderForm.priority,
                      status: orderForm.status,
                    };
                    if (editingOrderId) {
                      await api.labOrderUpdate(editingOrderId, body);
                      void uiAction("Lab order updated.");
                    } else {
                      await api.labOrderCreate(body);
                      void uiAction("Lab order created.");
                    }
                    setNewOrderOpen(false);
                    setEditingOrderId(null);
                    orders.refresh();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Save failed");
                  }
                }}
              >
                {editingOrderId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}

      {newImagingOpen && (
        <>
          <div className="modal-backdrop" role="presentation" onClick={() => setNewImagingOpen(false)} />
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-hd">
              <div>
                <div className="modal-ti">Add imaging study</div>
                <div className="modal-sub">Adds to `/lab/imaging` worklist.</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setNewImagingOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-bd">
              <div className="g2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ff">
                  <label>Patient ID</label>
                  <input className="mono" value={imagingForm.patient_id} onChange={(e) => setImagingForm((s) => ({ ...s, patient_id: e.target.value }))} />
                </div>
                <div className="ff">
                  <label>Modality</label>
                  <select value={imagingForm.modality} onChange={(e) => setImagingForm((s) => ({ ...s, modality: e.target.value }))}>
                    <option>X-Ray</option>
                    <option>MRI</option>
                    <option>CT</option>
                    <option>Ultrasound</option>
                    <option>Mammography</option>
                    <option>Nuclear</option>
                  </select>
                </div>
              </div>
              <div className="ff" style={{ marginTop: 10 }}>
                <label>Study</label>
                <input value={imagingForm.study} onChange={(e) => setImagingForm((s) => ({ ...s, study: e.target.value }))} placeholder="e.g. CXR — PA" />
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn-s" type="button" onClick={() => setNewImagingOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={async () => {
                  try {
                    await api.labImagingCreate({
                      patient_id: imagingForm.patient_id.trim(),
                      modality: imagingForm.modality,
                      study: imagingForm.study.trim(),
                    });
                    setNewImagingOpen(false);
                    void uiAction("Imaging study added.");
                    imaging.refresh();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Create failed");
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

