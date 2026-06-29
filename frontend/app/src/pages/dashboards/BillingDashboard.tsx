import { useCallback, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { BillingInvoice, BillingPayment } from "../../lib/apiTypes";
import { usePolling } from "../../hooks/usePolling";
import { FormModal } from "../../components/FormModal";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";

type BillingPage = "overview" | "invoices" | "payments" | "mpesa";

const TITLES: Record<BillingPage, string> = {
  overview: "Overview",
  invoices: "Invoices",
  payments: "Payment Register",
  mpesa: "M-Pesa Transactions",
};

const ROLE = "billing";

function fmtKes(n: number) {
  return `Ksh ${Math.round(n).toLocaleString()}`;
}

function invoiceStatusTag(status: string) {
  if (status === "paid" || status === "covered") return "g";
  if (status === "issued" || status === "draft") return "a";
  return "r";
}

export function BillingDashboard() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<BillingPage>("overview");
  const [q, setQ] = useState("");

  const invoicesPoll = usePolling(() => api.billingInvoices(undefined, ROLE), { intervalMs: 8000 });
  const paymentsPoll = usePolling(() => api.billingPayments(undefined, ROLE), { intervalMs: 8000 });
  const mpesaPoll = usePolling(() => api.mpesaTransactions({ limit: 50 }, ROLE), { intervalMs: 10000 });

  const invoices = (invoicesPoll.data?.invoices ?? []) as BillingInvoice[];
  const payments = (paymentsPoll.data?.payments ?? []) as BillingPayment[];
  const mpesaTx = (mpesaPoll.data?.transactions ?? []) as Record<string, unknown>[];

  const refreshAll = useCallback(async () => {
    await Promise.all([invoicesPoll.refresh(), paymentsPoll.refresh(), mpesaPoll.refresh()]);
  }, [invoicesPoll, paymentsPoll, mpesaPoll]);

  const stats = useMemo(() => {
    const unpaid = invoices.filter((i) => ["issued", "draft"].includes(i.status) && (i.balance_kes ?? 0) > 0);
    const billed = invoices.reduce((s, i) => s + (i.amount_kes ?? 0), 0);
    const collected = payments
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + (p.amount_kes ?? 0), 0);
    const mpesaCount = payments.filter((p) => p.method === "mpesa").length;
    const rate = billed > 0 ? Math.round((collected / billed) * 100) : 100;
    return {
      invoiceCount: invoices.length,
      unpaidCount: unpaid.length,
      billed,
      collected,
      mpesaCount,
      collectionRate: rate,
    };
  }, [invoices, payments]);

  const filteredInvoices = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((i) =>
      [i.id, i.patient_id, i.patient_name, i.description, i.status].join(" ").toLowerCase().includes(term),
    );
  }, [invoices, q]);

  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    patient_id: "P001",
    patient_name: "Wangui Njoroge",
    description: "",
    amount_kes: 500,
  });

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    patient_id: "P001",
    invoice_id: "",
    amount_kes: 500,
    method: "mpesa",
    mpesa_receipt: "",
    phone: "254712345678",
    purpose: "invoice",
  });

  const [stkModal, setStkModal] = useState(false);
  const [stkForm, setStkForm] = useState({
    patient_id: "P001",
    amount_kes: 500,
    purpose: "contribution",
    invoice_id: "",
    phone: "254712345678",
  });

  const [busy, setBusy] = useState(false);

  const submitInvoice = async () => {
    if (!invoiceForm.description.trim()) {
      toast("Description is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.billingInvoiceCreate(invoiceForm, ROLE);
      toast(`Invoice ${res.invoice.id} created for ${res.invoice.patient_name ?? res.invoice.patient_id}.`);
      setInvoiceModal(false);
      setInvoiceForm({ patient_id: "P001", patient_name: "Wangui Njoroge", description: "", amount_kes: 500 });
      await refreshAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        patient_id: paymentForm.patient_id,
        amount_kes: paymentForm.amount_kes,
        method: paymentForm.method,
        purpose: paymentForm.purpose,
        phone: paymentForm.phone || undefined,
        mpesa_receipt: paymentForm.mpesa_receipt || undefined,
      };
      if (paymentForm.invoice_id.trim()) payload.invoice_id = paymentForm.invoice_id.trim();
      const res = await api.billingRecordPayment(payload, ROLE);
      toast(`Payment ${res.payment.id} recorded · ${fmtKes(res.payment.amount_kes)}`);
      setPaymentModal(false);
      await refreshAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  };

  const submitStk = async () => {
    setBusy(true);
    try {
      const res = await api.mpesaStkPush(
        {
          patient_id: stkForm.patient_id,
          amount_kes: stkForm.amount_kes,
          purpose: stkForm.purpose,
          invoice_id: stkForm.invoice_id || undefined,
          phone: stkForm.phone,
        },
        ROLE,
      );
      toast(res.message);
      setStkModal(false);
      await refreshAll();
    } catch (err) {
      toast(err instanceof Error ? err.message : "STK push failed.");
    } finally {
      setBusy(false);
    }
  };

  const openRecordForInvoice = (inv: BillingInvoice) => {
    setPaymentForm({
      patient_id: inv.patient_id,
      invoice_id: inv.id,
      amount_kes: inv.balance_kes ?? inv.amount_kes,
      method: "mpesa",
      mpesa_receipt: "",
      phone: "254712345678",
      purpose: "invoice",
    });
    setPaymentModal(true);
  };

  const openStkForInvoice = (inv: BillingInvoice) => {
    setStkForm({
      patient_id: inv.patient_id,
      amount_kes: inv.balance_kes ?? inv.amount_kes,
      purpose: "invoice",
      invoice_id: inv.id,
      phone: "254712345678",
    });
    setStkModal(true);
  };

  return (
    <DashboardShell
      shellVariant="admin"
      title={TITLES[page]}
      crumb={page === "overview" ? "Billing & Finance" : `Billing › ${TITLES[page]}`}
      portalSubtitle="Billing & Finance Portal"
      userInitials="BO"
      userName="Pilot Billing Officer"
      userEmail="billing@hospital.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as BillingPage)}
      topbarSearchPlaceholder="Search invoices, patients, receipts…"
      topbarSearchValue={q}
      onTopbarSearchChange={setQ}
      onTopbarNotificationsClick={() => toast(`${stats.unpaidCount} unpaid invoice(s) pending collection.`)}
      onTopbarStatusClick={() => toast("M-Pesa gateway online · Paybill 400100")}
      nav={[
        {
          label: "Finance",
          items: [
            { id: "overview", icon: "📊", label: "Overview" },
            { id: "invoices", icon: "📄", label: "Invoices", badge: stats.unpaidCount ? { text: String(stats.unpaidCount), tone: "amber" } : undefined },
            { id: "payments", icon: "💳", label: "Payments" },
            { id: "mpesa", icon: "📱", label: "M-Pesa" },
          ],
        },
      ]}
    >
      <div className="admin">
        {page === "overview" && (
          <div className="pg on">
            <div className="ph">
              <div>
                <div className="ph-ey">Financial Management</div>
                <div className="ph-ti">Billing Overview</div>
                <div className="ph-su">Live invoices, collections, and M-Pesa reconciliation</div>
              </div>
              <div className="ph-r">
                <button type="button" className="btn-s" onClick={() => void refreshAll()}>↻ Refresh</button>
                <button type="button" className="btn-p" onClick={() => setInvoiceModal(true)}>+ New Invoice</button>
              </div>
            </div>
            <div className="g4" style={{ marginBottom: 16 }}>
              <div className="stat g"><div className="stat-v">{stats.invoiceCount}</div><div className="stat-l">Invoices</div></div>
              <div className="stat a"><div className="stat-v">{stats.unpaidCount}</div><div className="stat-l">Unpaid</div></div>
              <div className="stat b"><div className="stat-v">{fmtKes(stats.collected)}</div><div className="stat-l">Collected</div></div>
              <div className="stat gd"><div className="stat-v">{stats.collectionRate}%</div><div className="stat-l">Collection rate</div></div>
            </div>
            <div className="g2e">
              <div className="panel">
                <div className="pnl-hd"><div className="pnl-ti">Recent Invoices</div></div>
                <div className="pnl-bd" style={{ padding: 0 }}>
                  <table className="tbl">
                    <thead><tr><th>Invoice</th><th>Patient</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {invoices.slice(0, 5).map((inv) => (
                        <tr key={inv.id}>
                          <td className="mono">{inv.id}</td>
                          <td>{inv.patient_name ?? inv.patient_id}</td>
                          <td>{fmtKes(inv.amount_kes)}</td>
                          <td><span className={`tag ${invoiceStatusTag(inv.status)}`}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel">
                <div className="pnl-hd"><div className="pnl-ti">Recent M-Pesa Payments</div></div>
                <div className="pnl-bd" style={{ padding: 0 }}>
                  <table className="tbl">
                    <thead><tr><th>Receipt</th><th>Patient</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {payments.filter((p) => p.method === "mpesa").slice(0, 5).map((p) => (
                        <tr key={p.id}>
                          <td className="mono">{p.mpesa_receipt ?? p.id}</td>
                          <td>{p.patient_id}</td>
                          <td>{fmtKes(p.amount_kes)}</td>
                          <td><span className="tag g">{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "invoices" && (
          <div className="pg on">
            <div className="ph">
              <div>
                <div className="ph-ey">Accounts</div>
                <div className="ph-ti">Invoices</div>
                <div className="ph-su">Issue bills and track outstanding balances</div>
              </div>
              <div className="ph-r">
                <button type="button" className="btn-p" onClick={() => setInvoiceModal(true)}>+ New Invoice</button>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Patient</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="mono">{inv.id}</td>
                        <td>{inv.patient_name ?? inv.patient_id}</td>
                        <td>{inv.description}</td>
                        <td>{fmtKes(inv.amount_kes)}</td>
                        <td>{fmtKes(inv.balance_kes ?? 0)}</td>
                        <td><span className={`tag ${invoiceStatusTag(inv.status)}`}>{inv.status}</span></td>
                        <td>
                          {(inv.balance_kes ?? 0) > 0 && inv.status !== "covered" ? (
                            <>
                              <button type="button" className="btn-s btn-sm" style={{ marginRight: 6 }} onClick={() => openRecordForInvoice(inv)}>Record</button>
                              <button type="button" className="btn-p btn-sm" onClick={() => openStkForInvoice(inv)}>STK</button>
                            </>
                          ) : (
                            <span className="tag g">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {page === "payments" && (
          <div className="pg on">
            <div className="ph">
              <div>
                <div className="ph-ey">Cashier</div>
                <div className="ph-ti">Payment Register</div>
                <div className="ph-su">M-Pesa, cash, and bank payments recorded at the desk</div>
              </div>
              <div className="ph-r">
                <button type="button" className="btn-p" onClick={() => setPaymentModal(true)}>+ Record Payment</button>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Payment #</th>
                      <th>Invoice</th>
                      <th>Patient</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Receipt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="mono">{p.id}</td>
                        <td>{p.invoice_id ?? "—"}</td>
                        <td>{p.patient_id}</td>
                        <td>{(p.method ?? "").toUpperCase()}</td>
                        <td>{fmtKes(p.amount_kes)}</td>
                        <td className="mono">{p.mpesa_receipt ?? "—"}</td>
                        <td><span className="tag g">{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {page === "mpesa" && (
          <div className="pg on">
            <div className="ph">
              <div>
                <div className="ph-ey">Safaricom Daraja</div>
                <div className="ph-ti">M-Pesa Transactions</div>
                <div className="ph-su">STK pushes and C2B callbacks · Paybill 400100</div>
              </div>
              <div className="ph-r">
                <button type="button" className="btn-p" onClick={() => setStkModal(true)}>STK Push</button>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Txn ID</th>
                      <th>Patient</th>
                      <th>Purpose</th>
                      <th>Amount</th>
                      <th>Phone</th>
                      <th>Receipt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mpesaTx.map((t) => (
                      <tr key={String(t.id)}>
                        <td className="mono">{String(t.id)}</td>
                        <td>{String(t.patient_id ?? "")}</td>
                        <td>{String(t.purpose ?? "")}</td>
                        <td>{fmtKes(Number(t.amount_kes ?? 0))}</td>
                        <td className="mono">{String(t.phone ?? "")}</td>
                        <td className="mono">{String(t.mpesa_receipt ?? "—")}</td>
                        <td><span className={`tag ${t.status === "completed" ? "g" : "a"}`}>{String(t.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <FormModal
        open={invoiceModal}
        title="Create Invoice"
        subtitle="Issue a new patient bill"
        onClose={() => setInvoiceModal(false)}
        footer={
          <button type="button" className="btn-p" disabled={busy} onClick={() => void submitInvoice()}>Create Invoice</button>
        }
      >
        <div className="fg"><label className="fl">Patient ID</label>
          <input className="fi" value={invoiceForm.patient_id} onChange={(e) => setInvoiceForm((f) => ({ ...f, patient_id: e.target.value }))} />
        </div>
        <div className="fg"><label className="fl">Patient Name</label>
          <input className="fi" value={invoiceForm.patient_name} onChange={(e) => setInvoiceForm((f) => ({ ...f, patient_name: e.target.value }))} />
        </div>
        <div className="fg"><label className="fl">Description</label>
          <input className="fi" value={invoiceForm.description} onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Lab panel" />
        </div>
        <div className="fg"><label className="fl">Amount (KES)</label>
          <input className="fi" type="number" value={invoiceForm.amount_kes} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount_kes: Number(e.target.value) }))} />
        </div>
      </FormModal>

      <FormModal
        open={paymentModal}
        title="Record Payment"
        subtitle="Cash, M-Pesa, or bank — links to invoice when provided"
        onClose={() => setPaymentModal(false)}
        footer={
          <button type="button" className="btn-p" disabled={busy} onClick={() => void submitPayment()}>Confirm Payment</button>
        }
      >
        <div className="fg"><label className="fl">Patient ID</label>
          <input className="fi" value={paymentForm.patient_id} onChange={(e) => setPaymentForm((f) => ({ ...f, patient_id: e.target.value }))} />
        </div>
        <div className="fg"><label className="fl">Invoice ID (optional)</label>
          <input className="fi" value={paymentForm.invoice_id} onChange={(e) => setPaymentForm((f) => ({ ...f, invoice_id: e.target.value }))} placeholder="INV-2026-002" />
        </div>
        <div className="fg"><label className="fl">Amount (KES)</label>
          <input className="fi" type="number" value={paymentForm.amount_kes} onChange={(e) => setPaymentForm((f) => ({ ...f, amount_kes: Number(e.target.value) }))} />
        </div>
        <div className="fg"><label className="fl">Method</label>
          <select className="fi" value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}>
            <option value="mpesa">M-Pesa</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
        <div className="fg"><label className="fl">M-Pesa Receipt</label>
          <input className="fi" value={paymentForm.mpesa_receipt} onChange={(e) => setPaymentForm((f) => ({ ...f, mpesa_receipt: e.target.value }))} placeholder="e.g. QHR7X2K3LP" />
        </div>
        <div className="fg"><label className="fl">Phone</label>
          <input className="fi" value={paymentForm.phone} onChange={(e) => setPaymentForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
      </FormModal>

      <FormModal
        open={stkModal}
        title="M-Pesa STK Push"
        subtitle="Send payment prompt to patient phone"
        onClose={() => setStkModal(false)}
        footer={
          <button type="button" className="btn-p" disabled={busy} onClick={() => void submitStk()}>Send STK Push</button>
        }
      >
        <div className="fg"><label className="fl">Patient ID</label>
          <input className="fi" value={stkForm.patient_id} onChange={(e) => setStkForm((f) => ({ ...f, patient_id: e.target.value }))} />
        </div>
        <div className="fg"><label className="fl">Invoice ID (optional)</label>
          <input className="fi" value={stkForm.invoice_id} onChange={(e) => setStkForm((f) => ({ ...f, invoice_id: e.target.value }))} />
        </div>
        <div className="fg"><label className="fl">Purpose</label>
          <select className="fi" value={stkForm.purpose} onChange={(e) => setStkForm((f) => ({ ...f, purpose: e.target.value }))}>
            <option value="contribution">Contribution</option>
            <option value="invoice">Invoice</option>
            <option value="bill">Bill</option>
          </select>
        </div>
        <div className="fg"><label className="fl">Amount (KES)</label>
          <input className="fi" type="number" value={stkForm.amount_kes} onChange={(e) => setStkForm((f) => ({ ...f, amount_kes: Number(e.target.value) }))} />
        </div>
        <div className="fg"><label className="fl">Phone</label>
          <input className="fi" value={stkForm.phone} onChange={(e) => setStkForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
      </FormModal>
    </DashboardShell>
  );
}
