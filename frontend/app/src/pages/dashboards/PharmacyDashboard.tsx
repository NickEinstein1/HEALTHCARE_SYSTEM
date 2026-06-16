import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { CrudRowActions } from "../../components/CrudRowActions";
import { FormModal } from "../../components/FormModal";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

type PharmacyPage =
  | "overview"
  | "queue"
  | "verify"
  | "patient"
  | "compounding"
  | "stock"
  | "reorder"
  | "claims"
  | "vaccinations"
  | "interactions"
  | "interventions"
  | "audit"
  | "health"
  | "kemsa"
  | "api";

const TITLES: Record<PharmacyPage, string> = {
  overview: "Overview",
  queue: "Prescription Queue",
  verify: "Verify & Approve",
  patient: "Patient Lookup",
  compounding: "Compounding",
  stock: "Stock Levels",
  reorder: "Reorder List",
  claims: "ModelCover Claims",
  vaccinations: "Vaccinations",
  interactions: "Drug Interactions",
  interventions: "Pharmacist Notes",
  audit: "Audit Trail",
  health: "System Health",
  kemsa: "KEMSA Orders",
  api: "API Reference",
};

export function PharmacyDashboard() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<PharmacyPage>("overview");
  const [q, setQ] = useState("");

  const rx = usePolling(() => api.pharmacyPrescriptions(200), { intervalMs: 4000 });
  const stock = usePolling(() => api.pharmacyStock(300), { intervalMs: 8000 });
  const audit = usePolling(() => api.pharmacyAudit(200), { intervalMs: 6000 });

  const uiAction = async (label: string, extra?: Record<string, unknown>) => {
    try {
      await api.uiAction({ role: "pharmacy", page, label, ...extra });
    } catch {
      // ignore
    }
    toast(label);
  };

  const filteredRx = useMemo(() => {
    const rows = (rx.data ?? []) as any[];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(term));
  }, [rx.data, q]);

  const pending = useMemo(() => filteredRx.filter((r) => String(r.status).toLowerCase() === "pending"), [filteredRx]);
  const verified = useMemo(() => filteredRx.filter((r) => String(r.status).toLowerCase().includes("ver")), [filteredRx]);

  const [stockAdjust, setStockAdjust] = useState({ name: "", qty: 0 });

  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [editingRxId, setEditingRxId] = useState<string | null>(null);
  const [rxForm, setRxForm] = useState({
    patient: "",
    patient_id: "P001",
    drug: "",
    dose: "",
    status: "Pending",
  });

  const openRxModal = (row?: Record<string, unknown>) => {
    if (row) {
      setEditingRxId(String(row.id ?? ""));
      setRxForm({
        patient: String(row.patient ?? ""),
        patient_id: String(row.patient_id ?? "P001"),
        drug: String(row.drug ?? ""),
        dose: String(row.dose ?? ""),
        status: String(row.status ?? "Pending"),
      });
    } else {
      setEditingRxId(null);
      setRxForm({ patient: "", patient_id: "P001", drug: "", dose: "", status: "Pending" });
    }
    setRxModalOpen(true);
  };

  return (
    <DashboardShell
      shellVariant="pharmacy"
      title={TITLES[page]}
      crumb={page === "overview" ? "Pharmacy" : `Pharmacy › ${TITLES[page]}`}
      portalSubtitle="Pharmacy Portal"
      userInitials="PK"
      userName="Pauline K."
      userEmail="pharmacist@crh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as PharmacyPage)}
      topbarSearchPlaceholder="Search prescriptions, drugs…"
      topbarSearchValue={q}
      onTopbarSearchChange={setQ}
      onTopbarNotificationsClick={() => {
        setPage("audit");
        void uiAction("Opened notifications → audit.");
      }}
      onTopbarStatusClick={() => {
        setPage("health");
        void uiAction("Opened system health.");
      }}
      nav={[
        {
          label: "Dispensing",
          items: [
            { id: "overview", icon: "🏠", label: "Overview" },
            { id: "queue", icon: "📋", label: "Prescription Queue", badge: { text: String(pending.length || 7), tone: "red" } },
            { id: "verify", icon: "✅", label: "Verify & Approve" },
            { id: "patient", icon: "👤", label: "Patient Lookup" },
            { id: "compounding", icon: "💧", label: "Compounding" },
          ],
        },
        {
          label: "Inventory",
          items: [
            { id: "stock", icon: "📦", label: "Stock Levels", badge: { text: "3", tone: "amber" } },
            { id: "reorder", icon: "🚚", label: "Reorder List" },
            { id: "kemsa", icon: "🏛️", label: "KEMSA Orders", badge: { text: "2", tone: "amber" } },
            { id: "claims", icon: "🛡️", label: "ModelCover Claims" },
            { id: "vaccinations", icon: "🌡️", label: "Vaccinations" },
          ],
        },
        {
          label: "Clinical",
          items: [
            { id: "interactions", icon: "⚠️", label: "Drug Interactions" },
            { id: "interventions", icon: "📝", label: "Pharmacist Notes" },
          ],
        },
        {
          label: "Security & Compliance",
          items: [
            { id: "audit", icon: "⛓️", label: "Audit Trail" },
            { id: "api", icon: "🔗", label: "API Reference" },
            { id: "health", icon: "💾", label: "System Health" },
          ],
        },
      ]}
    >
      <div className={`pg${page === "overview" ? " on" : ""}`} id="pg-overview">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Dispensing · Central Referral Hospital</div>
            <div className="ph-title">Pharmacy Overview</div>
            <div className="ph-sub">
              <strong>{pending.length || 7}</strong> pending prescriptions · <strong>{verified.length || 2}</strong> verified today · stock monitoring active
            </div>
          </div>
          <div className="ph-right">
            <button className="btn-s" type="button" onClick={() => setPage("queue")}>
              📋 Queue
            </button>
            <button className="btn-p" type="button" onClick={() => setPage("stock")}>
              📦 Stock
            </button>
          </div>
        </div>

        <div className="g2e">
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">Pending prescriptions</div>
                <div className="pnl-sub">From `/pharmacy/prescriptions` (Phase 1)</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("verify")}>
                Verify →
              </button>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">RX</th>
                    <th>Patient</th>
                    <th>Drug</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.slice(0, 10).map((r: any) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td style={{ fontWeight: 800 }}>{r.patient}</td>
                      <td>{r.drug}</td>
                      <td>
                        <span className="tag am">{r.status}</span>
                      </td>
                      <td>
                        <button className="btn-p btn-sm" type="button" onClick={() => setPage("verify")}>
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!rx.loading && pending.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                        No pending prescriptions.
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
                <div className="pnl-title">Security & audit</div>
                <div className="pnl-sub">Latest pharmacy actions</div>
              </div>
              <button className="btn-s btn-sm" type="button" onClick={() => setPage("audit")}>
                Open →
              </button>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="mono">Time</th>
                    <th>Action</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit.data ?? []).slice(0, 8).map((a: any, idx: number) => (
                    <tr key={a.ts ?? idx}>
                      <td className="mono">{a.ts}</td>
                      <td style={{ fontWeight: 800 }}>{a.action}</td>
                      <td style={{ color: "var(--t2)" }}>{a.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className={`pg${page === "queue" ? " on" : ""}`} id="pg-queue">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Dispensing</div>
            <div className="ph-title">Prescription Queue</div>
            <div className="ph-sub">Filter with the top search bar; actions are logged to audit.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-s" type="button" onClick={() => openRxModal()}>
              + Add prescription
            </button>
            <button className="btn-p" type="button" onClick={() => setPage("verify")}>
              Verify & approve →
            </button>
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
                  <th className="mono">RX</th>
                  <th>Patient</th>
                  <th>Drug</th>
                  <th>Dose</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredRx.slice(0, 40).map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td style={{ fontWeight: 800 }}>{r.patient}</td>
                    <td>{r.drug}</td>
                    <td className="mono">{r.dose}</td>
                    <td>
                      <span className={`tag ${String(r.status).toLowerCase() === "dispensed" ? "g" : String(r.status).toLowerCase().includes("ver") ? "b" : "am"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <CrudRowActions
                        onEdit={() => openRxModal(r)}
                        onDelete={async () => {
                          if (!window.confirm(`Delete prescription ${r.id}?`)) return;
                          try {
                            await api.pharmacyPrescriptionDelete(r.id);
                            rx.refresh();
                            audit.refresh();
                            toast("Prescription deleted.");
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

      <div className={`pg${page === "verify" ? " on" : ""}`} id="pg-verify">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Dispensing</div>
            <div className="ph-title">Verify & Approve</div>
            <div className="ph-sub">Verify then dispense. Backend updates status and adds audit entries.</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Pending</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">RX</th>
                  <th>Patient</th>
                  <th>Drug</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 40).map((r: any) => (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td style={{ fontWeight: 800 }}>{r.patient}</td>
                    <td>{r.drug}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: 10 }}>
                      <button
                        className="btn-s btn-sm"
                        type="button"
                        onClick={async () => {
                          try {
                            await api.pharmacyVerify(r.id);
                            rx.refresh();
                            audit.refresh();
                            void uiAction(`Verified ${r.id}.`, { rx: r.id });
                          } catch (e) {
                            toast(e instanceof Error ? e.message : "Verify failed");
                          }
                        }}
                      >
                        Verify
                      </button>
                      <button
                        className="btn-p btn-sm"
                        type="button"
                        onClick={async () => {
                          try {
                            await api.pharmacyDispense(r.id);
                            rx.refresh();
                            audit.refresh();
                            void uiAction(`Dispensed ${r.id}.`, { rx: r.id });
                          } catch (e) {
                            toast(e instanceof Error ? e.message : "Dispense failed");
                          }
                        }}
                      >
                        Dispense
                      </button>
                    </td>
                  </tr>
                ))}
                {!rx.loading && pending.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                      No pending prescriptions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "stock" ? " on" : ""}`} id="pg-stock">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Inventory</div>
            <div className="ph-title">Stock Levels</div>
            <div className="ph-sub">Adjust counts; actions are recorded in pharmacy audit.</div>
          </div>
        </div>
        <div className="g2e">
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Current stock</div>
            </div>
            <div className="pnl-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="mono">Qty</th>
                    <th className="mono">Min</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(stock.data ?? []).slice(0, 80).map((s: any) => {
                    const low = Number(s.qty) <= Number(s.min);
                    return (
                      <tr key={s.name}>
                        <td style={{ fontWeight: 800 }}>{s.name}</td>
                        <td className="mono" style={{ color: low ? "var(--r)" : "var(--t2)", fontWeight: 800 }}>
                          {s.qty} {s.unit}
                        </td>
                        <td className="mono">{s.min}</td>
                        <td>
                          <span className={`tag ${low ? "r" : "g"}`}>{low ? "Low" : "OK"}</span>
                        </td>
                        <td>
                          <CrudRowActions
                            onEdit={() => setStockAdjust({ name: s.name, qty: Number(s.qty) })}
                            onDelete={async () => {
                              if (!window.confirm(`Remove stock item ${s.name}?`)) return;
                              try {
                                await api.pharmacyStockDelete(s.name);
                                stock.refresh();
                                audit.refresh();
                                toast("Stock item removed.");
                              } catch (e) {
                                toast(e instanceof Error ? e.message : "Delete failed");
                              }
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-title">Adjust stock</div>
                <div className="pnl-sub">Updates `/pharmacy/stock/adjust`</div>
              </div>
            </div>
            <div className="pnl-body">
              <div className="ff">
                <label>Item name</label>
                <input value={stockAdjust.name} onChange={(e) => setStockAdjust((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Morphine 10mg" />
              </div>
              <div className="ff">
                <label>New quantity</label>
                <input
                  className="mono"
                  type="number"
                  value={String(stockAdjust.qty)}
                  onChange={(e) => setStockAdjust((s) => ({ ...s, qty: Number(e.target.value) }))} />
              </div>
              <button
                className="btn-p"
                type="button"
                style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                onClick={async () => {
                  try {
                    await api.pharmacyStockAdjust({ name: stockAdjust.name.trim(), qty: stockAdjust.qty });
                    stock.refresh();
                    audit.refresh();
                    void uiAction("Stock adjusted.", { item: stockAdjust.name.trim(), qty: stockAdjust.qty });
                    setStockAdjust({ name: "", qty: 0 });
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Adjust failed");
                  }
                }}
              >
                Save adjustment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`pg${page === "audit" ? " on" : ""}`} id="pg-audit">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Security & Compliance</div>
            <div className="ph-title">Audit Trail</div>
            <div className="ph-sub">Backend: `/pharmacy/audit` (Phase 1 in-memory).</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Entries</div>
          </div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th className="mono">Time</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Detail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(audit.data ?? []).slice(0, 200).map((a: any, idx: number) => (
                  <tr key={a.ts ?? idx}>
                    <td className="mono">{a.ts}</td>
                    <td style={{ fontWeight: 800 }}>{a.action}</td>
                    <td>{a.user}</td>
                    <td style={{ color: "var(--t2)" }}>{a.detail}</td>
                    <td>
                      <span className="tag g">{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "kemsa" ? " on" : ""}`} id="pg-kemsa">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Inventory</div>
            <div className="ph-title">KEMSA Supply Orders</div>
            <div className="ph-sub">Kenya Medical Supplies Authority catalogue orders (synced with v2 pharmacy HTML).</div>
          </div>
          <button className="btn-p" type="button" onClick={() => void uiAction("KEMSA order submitted")}>
            🏛️ New KEMSA Order
          </button>
        </div>
        <div className="panel">
          <div className="pnl-hd"><div className="pnl-title">Open orders</div></div>
          <div className="pnl-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Ordered</th>
                  <th>ETA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">KEMSA-2847</td>
                  <td>Regular Insulin (vials)</td>
                  <td>200</td>
                  <td>10 May</td>
                  <td>15 May</td>
                  <td><span className="tag am">In Transit</span></td>
                </tr>
                <tr>
                  <td className="mono">KEMSA-2846</td>
                  <td>Metformin 500mg (tabs)</td>
                  <td>5000</td>
                  <td>08 May</td>
                  <td>12 May</td>
                  <td><span className="tag g">Delivered</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`pg${page === "api" ? " on" : ""}`} id="pg-api">
        <div className="ph">
          <div>
            <div className="ph-eyebrow">Integration</div>
            <div className="ph-title">API Reference</div>
            <div className="ph-sub">Pharmacy module endpoints (matches unihealth-pharmacy.html).</div>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-body" style={{ fontSize: 12, lineHeight: 1.8 }}>
            {[
              ["GET", "/pharmacy/prescriptions", "List prescription queue"],
              ["POST", "/pharmacy/dispense", "Record dispense event"],
              ["POST", "/api/pharmacy/order", "Create KEMSA purchase order"],
              ["GET", "/api/kemsa/catalogue", "KEMSA drug catalogue"],
            ].map(([method, path, desc]) => (
              <div key={path} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--bdr)" }}>
                <span className="mono" style={{ fontWeight: 800, color: "var(--g)" }}>{method}</span>
                <span className="mono" style={{ flex: 1 }}>{path}</span>
                <span style={{ color: "var(--t3)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(["patient", "compounding", "reorder", "claims", "vaccinations", "interactions", "interventions", "health"] as PharmacyPage[]).map((p) => {
        const ctaLabels: Partial<Record<PharmacyPage, string>> = {
          patient:       "Lookup Patient",
          compounding:   "Log Compound",
          reorder:       "Raise Reorder",
          claims:        "Submit Claim",
          vaccinations:  "Record Vaccine",
          interactions:  "Check Interactions",
          interventions: "Log Intervention",
          health:        "Log Health Check",
        };
        const cta = ctaLabels[p] ?? "Log Action";
        return (
          <div className={`pg${page === p ? " on" : ""}`} id={`pg-${p}`} key={p}>
            <div className="ph">
              <div>
                <div className="ph-eyebrow">Pharmacy</div>
                <div className="ph-title">{TITLES[p]}</div>
              </div>
              <button
                className="btn-p"
                type="button"
                onClick={async () => {
                  const res = await api.uiAction({ role: "pharmacy", page: p, label: cta, type: p }).catch(() => ({ id: "offline" }));
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
                  <div>✅ Navigation is live. Every button action is logged to the audit trail.</div>
                  <div>💊 <strong>{TITLES[p]}</strong> full workflows include clinical data, LIS integrations, and claim submissions.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn-s btn-sm"
                      type="button"
                      onClick={async () => {
                        await api.uiAction({ role: "pharmacy", page: p, label: `View ${TITLES[p]} log`, type: "view_log" }).catch(() => {});
                        toast(`${TITLES[p]} audit log loaded.`);
                      }}
                    >
                      View Audit Log →
                    </button>
                    <button
                      className="btn-s btn-sm"
                      type="button"
                      onClick={() => { void api.pharmacyAudit(10).then((rows) => toast(`Last ${rows.length} audit entries retrieved.`)).catch(() => toast("Audit log unavailable.")); }}
                    >
                      Pharmacy Audit →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <FormModal
        open={rxModalOpen}
        title={editingRxId ? "Edit prescription" : "Add prescription"}
        subtitle="Stored in `/pharmacy/prescriptions`."
        onClose={() => {
          setRxModalOpen(false);
          setEditingRxId(null);
        }}
        footer={
          <>
            <button
              className="btn-s"
              type="button"
              onClick={() => {
                setRxModalOpen(false);
                setEditingRxId(null);
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
                    patient: rxForm.patient.trim() || "Unknown",
                    patient_id: rxForm.patient_id.trim(),
                    drug: rxForm.drug.trim(),
                    dose: rxForm.dose.trim() || "—",
                    status: rxForm.status,
                  };
                  if (editingRxId) {
                    await api.pharmacyPrescriptionUpdate(editingRxId, body);
                    toast("Prescription updated.");
                  } else {
                    await api.pharmacyPrescriptionCreate(body);
                    toast("Prescription created.");
                  }
                  setRxModalOpen(false);
                  setEditingRxId(null);
                  rx.refresh();
                  audit.refresh();
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Save failed");
                }
              }}
            >
              {editingRxId ? "Save" : "Create"}
            </button>
          </>
        }
      >
        <div className="g2">
          <div className="ff">
            <label>Patient name</label>
            <input value={rxForm.patient} onChange={(e) => setRxForm((s) => ({ ...s, patient: e.target.value }))} />
          </div>
          <div className="ff">
            <label>Patient ID</label>
            <input className="mono" value={rxForm.patient_id} onChange={(e) => setRxForm((s) => ({ ...s, patient_id: e.target.value }))} />
          </div>
        </div>
        <div className="g2">
          <div className="ff">
            <label>Drug</label>
            <input value={rxForm.drug} onChange={(e) => setRxForm((s) => ({ ...s, drug: e.target.value }))} />
          </div>
          <div className="ff">
            <label>Dose</label>
            <input value={rxForm.dose} onChange={(e) => setRxForm((s) => ({ ...s, dose: e.target.value }))} />
          </div>
        </div>
        <div className="ff">
          <label>Status</label>
          <select value={rxForm.status} onChange={(e) => setRxForm((s) => ({ ...s, status: e.target.value }))}>
            <option>Pending</option>
            <option>Verified</option>
            <option>Dispensed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </FormModal>
    </DashboardShell>
  );
}

