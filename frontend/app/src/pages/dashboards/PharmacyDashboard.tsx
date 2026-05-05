import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
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
  | "health";

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
          <button className="btn-p" type="button" onClick={() => setPage("verify")}>
            Verify & approve →
          </button>
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

      {(["patient", "compounding", "reorder", "claims", "vaccinations", "interactions", "interventions", "health"] as PharmacyPage[]).map((p) => (
        <div className={`pg${page === p ? " on" : ""}`} id={`pg-${p}`} key={p}>
          <div className="ph">
            <div>
              <div className="ph-eyebrow">Pharmacy</div>
              <div className="ph-title">{TITLES[p]}</div>
              <div className="ph-sub">This page is now routed; actions are logged to `/ui/actions`.</div>
            </div>
            <button className="btn-p" type="button" onClick={() => void uiAction(`Opened ${TITLES[p]}.`)}>
              Log action
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">{TITLES[p]}</div>
            </div>
            <div className="pnl-body" style={{ color: "var(--t3)", fontSize: 12, lineHeight: 1.7 }}>
              Next iteration will sync the remaining detailed widgets from `frontend/pharmacy.html` (dynamic portal) into React with dedicated APIs.
            </div>
          </div>
        </div>
      ))}
    </DashboardShell>
  );
}

