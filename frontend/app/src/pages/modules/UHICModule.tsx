import { useCallback, useMemo, useState } from "react";
import { FormModal } from "../../components/FormModal";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";
import { buildV2ModuleNav } from "../../lib/moduleNav";
import { api } from "../../lib/api";
import type { UhicClaim, UhicMember, UhicPremiumQuote, UhicProviderScore } from "../../lib/apiTypes";
import { usePolling } from "../../hooks/usePolling";
import "../../styles/uhic-module.css";

type UhicPage =
  | "overview"
  | "members"
  | "premiums"
  | "claims"
  | "underwriting"
  | "actuarial"
  | "fraud";

const PAGE_TITLES: Record<UhicPage, string> = {
  overview: "Scheme Overview",
  members: "Members & Policies",
  premiums: "Premiums & Contributions",
  claims: "Claims Adjudication",
  underwriting: "Underwriting",
  actuarial: "Actuarial Science",
  fraud: "Fraud & Risk Audit",
};

const ROLE = "admin";

function fmtKes(n: number) {
  return `Ksh ${Math.round(n).toLocaleString()}`;
}

function fraudTag(band: string) {
  if (band === "low") return "g";
  if (band === "medium") return "a";
  if (band === "high") return "r";
  return "r";
}

function claimStatusTag(status: string) {
  if (status === "adjudicated" || status === "paid") return "g";
  if (status === "flagged" || status === "submitted") return "a";
  return "r";
}

export function UHICModule() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<UhicPage>("overview");

  const summaryPoll = usePolling(() => api.uhicSummary(ROLE), { intervalMs: 12_000 });
  const membersPoll = usePolling(() => api.uhicMembers(undefined, ROLE), { intervalMs: 15_000 });
  const syncPoll = usePolling(() => api.insuranceSyncStaff(0, ROLE), { intervalMs: 5_000 });
  const claimsPoll = usePolling(() => api.uhicClaims(undefined, ROLE), { intervalMs: 5_000 });
  const reservesPoll = usePolling(() => api.uhicActuarialReserves(ROLE), { intervalMs: 20_000 });
  const forecastPoll = usePolling(() => api.uhicActuarialForecast(12, ROLE), { intervalMs: 30_000 });
  const providersPoll = usePolling(() => api.uhicProviderScores(ROLE), { intervalMs: 20_000 });
  const fraudPoll = usePolling(() => api.uhicFraudTrend(ROLE), { intervalMs: 15_000 });

  const summary = syncPoll.data?.summary ?? summaryPoll.data;
  const members = membersPoll.data?.members ?? [];
  const claims = syncPoll.data?.claims ?? claimsPoll.data?.claims ?? [];
  const reserves = reservesPoll.data;
  const forecast = forecastPoll.data;
  const providers = providersPoll.data?.providers ?? [];
  const fraud = fraudPoll.data;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      summaryPoll.refresh(),
      syncPoll.refresh(),
      membersPoll.refresh(),
      claimsPoll.refresh(),
      reservesPoll.refresh(),
      forecastPoll.refresh(),
      providersPoll.refresh(),
      fraudPoll.refresh(),
    ]);
  }, [summaryPoll, syncPoll, membersPoll, claimsPoll, reservesPoll, forecastPoll, providersPoll, fraudPoll]);

  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    scheme_type: "SHIF",
    gross_salary_kes: 45000,
    age: 35,
    base_rate_kes: 3500,
    occupation_class: "2",
    prior_claims_count: 0,
    prior_claims_amount_kes: 0,
  });
  const [quoteResult, setQuoteResult] = useState<UhicPremiumQuote | null>(null);
  const [busy, setBusy] = useState(false);

  const [claimModal, setClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    member_id: "UHIC-M-0001",
    patient_id: "P001",
    encounter_id: "ENC-P001-NEW",
    provider_id: "FAC-A",
    scheme_type: "SHIF",
    submitted_amount_kes: 8500,
  });

  const nav = buildV2ModuleNav([
    {
      label: "UHIC",
      items: (Object.keys(PAGE_TITLES) as UhicPage[]).map((id) => ({
        id,
        icon: "🛡️",
        label: PAGE_TITLES[id],
      })),
    },
  ]);

  const lossRatioPct = useMemo(() => {
    const lr = summary?.loss_ratio ?? reserves?.loss_ratio ?? 0;
    return `${Math.round(lr * 1000) / 10}%`;
  }, [summary, reserves]);

  const runQuote = async () => {
    setBusy(true);
    try {
      const res = await api.uhicPremiumQuote(quoteForm, ROLE);
      setQuoteResult(res);
      toast(`Quote: ${fmtKes(res.monthly_contribution_kes ?? res.monthly_premium_kes ?? 0)}/month`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  };

  const submitClaim = async () => {
    if (!claimForm.encounter_id.trim()) {
      toast("Encounter ID required — claims must link to clinical encounter.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.uhicSubmitClaim(claimForm, ROLE);
      toast(`Claim ${res.claim.claim_id} · fraud score ${res.claim.fraud_score}`);
      setClaimModal(false);
      await refreshAll();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const decideClaim = async (claim: UhicClaim, decision: string) => {
    setBusy(true);
    try {
      await api.uhicDecideClaim(claim.claim_id, { decision, note: "UHIC console review" }, ROLE);
      toast(`Claim ${claim.claim_id} ${decision}d`);
      await refreshAll();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  const renderOverview = () => (
    <>
      <div className="notice uhic-accent" style={{ marginBottom: 14 }}>
        <span className="notice-ico">🛡️</span>
        <div className="notice-tx">
          <strong>Kenya National Health Insurance (UHIC)</strong> — operational layer for Social Health Authority
          (SHIF), replacing NHIF. Universal coverage for all Kenyans: formal payroll at 2.75% of income (Ksh 300–9,000)
          and informal-sector means-testing. PHF · ECCIF · private top-up on one platform — claims bound to clinical
          encounters via hard FK.
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-bar uhic-bar" />
          <div className="kpi-ico">👥</div>
          <div className="kpi-lbl">Active Members</div>
          <div className="kpi-val">{summary?.active_members ?? "—"}</div>
          <div className="kpi-meta">{summary?.active_policies ?? 0} policies</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar am" />
          <div className="kpi-ico">📋</div>
          <div className="kpi-lbl">Claims</div>
          <div className="kpi-val">{summary?.claims_submitted ?? "—"}</div>
          <div className="kpi-meta">{summary?.claims_flagged ?? 0} flagged</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar r" />
          <div className="kpi-ico">📉</div>
          <div className="kpi-lbl">Loss Ratio</div>
          <div className="kpi-val">{lossRatioPct}</div>
          <div className="kpi-meta">IRA solvency watch</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar g" />
          <div className="kpi-ico">🔬</div>
          <div className="kpi-lbl">IBNR Reserve</div>
          <div className="kpi-val">{reserves ? fmtKes(reserves.ibnr_kes) : "—"}</div>
          <div className="kpi-meta">Chain-ladder estimate</div>
        </div>
      </div>
      <div className="g2">
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Scheme Mix</div>
          </div>
          <div className="pnl-body">
            {Object.entries(summary?.schemes ?? {}).map(([k, v]) => (
              <div key={k} className="uhic-scheme-row">
                <span>{k}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">Recent Flagged Claims</div>
          </div>
          <div className="pnl-body">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Score</th>
                  <th>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {claims.filter((c) => c.fraud_score >= 55).slice(0, 5).map((c) => (
                  <tr key={c.claim_id}>
                    <td className="mono">{c.claim_id}</td>
                    <td><span className={`tag ${fraudTag(c.fraud_band)}`}>{c.fraud_score}</span></td>
                    <td style={{ fontSize: 11 }}>{c.fraud_reasons.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  const renderMembers = () => (
    <div className="panel">
      <div className="pnl-hd">
        <div className="pnl-title">Members (linked to EHR Patient — no duplicate records)</div>
      </div>
      <div className="pnl-body">
        <table className="tbl">
          <thead>
            <tr>
              <th>Member</th>
              <th>Patient ID</th>
              <th>Scheme</th>
              <th>Status</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: UhicMember) => (
              <tr key={m.member_id}>
                <td className="mono">{m.member_id}</td>
                <td className="mono">{m.patient_id}</td>
                <td><span className="tag b">{m.scheme_type}</span></td>
                <td><span className={`tag ${m.status === "active" ? "g" : "a"}`}>{m.status}</span></td>
                <td>{m.given_name} {m.family_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPremiums = () => (
    <>
      <div className="qa" style={{ marginBottom: 14 }}>
        <button type="button" className="qa-btn" onClick={() => setQuoteModal(true)}>Premium / SHIF Quote</button>
        <button type="button" className="qa-btn" onClick={() => toast("M-Pesa STK via Premium & Contribution Service (Phase 1).")}>M-Pesa Collection</button>
      </div>
      {quoteResult && (
        <div className="notice g" style={{ marginBottom: 14 }}>
          <span className="notice-ico">💰</span>
          <div className="notice-tx">
            <strong>{quoteResult.scheme_type}</strong> — Monthly{" "}
            {fmtKes(quoteResult.monthly_contribution_kes ?? quoteResult.monthly_premium_kes ?? 0)}
            {quoteResult.rate != null && ` · SHIF rate ${(quoteResult.rate * 100).toFixed(2)}%`}
            {quoteResult.age_factor != null && ` · Age factor ${quoteResult.age_factor}`}
          </div>
        </div>
      )}
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">National SHIF Contributions</div></div>
        <div className="pnl-body uhic-formula-block">
          <p><strong>Formal sector</strong> = clamp(2.75% × gross salary, Ksh 300, Ksh 9,000)</p>
          <p><strong>Informal sector</strong> = graduated means-testing by declared monthly income (pilot bands)</p>
          <p>Payroll batch · M-Pesa/USSD · KRA iTax remittance (9th of month) · universal household membership</p>
        </div>
      </div>
    </>
  );

  const renderClaims = () => (
    <>
      <div className="qa" style={{ marginBottom: 14 }}>
        <button type="button" className="qa-btn" onClick={() => setClaimModal(true)}>Submit Claim</button>
      </div>
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">Claims (encounter_id FK required)</div></div>
        <div className="pnl-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Encounter</th>
                <th>Amount</th>
                <th>Fraud</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.claim_id}>
                  <td className="mono">{c.claim_id}</td>
                  <td className="mono" style={{ fontSize: 10 }}>{c.encounter_id}</td>
                  <td>{fmtKes(c.adjudicated_amount_kes ?? c.submitted_amount_kes)}</td>
                  <td><span className={`tag ${fraudTag(c.fraud_band)}`}>{c.fraud_score}</span></td>
                  <td><span className={`tag ${claimStatusTag(c.status)}`}>{c.status}</span></td>
                  <td>
                    {c.status === "flagged" || c.status === "submitted" ? (
                      <span className="uhic-actions">
                        <button type="button" className="tbl-btn" disabled={busy} onClick={() => decideClaim(c, "approve")}>Approve</button>
                        <button type="button" className="tbl-btn" disabled={busy} onClick={() => decideClaim(c, "deny")}>Deny</button>
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderUnderwriting = () => (
    <div className="g2">
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">Risk Rating Factors</div></div>
        <div className="pnl-body uhic-formula-block">
          <p><strong>Premium</strong> = base × age_band × occupation_class × claims_history × facility_tier</p>
          <ul>
            <li>Waiting periods & pre-existing exclusions</li>
            <li>Co-pay / co-insurance configuration</li>
            <li>Reinsurance treaty allocation (proportional / XoL)</li>
          </ul>
        </div>
      </div>
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">Private Quote Calculator</div></div>
        <div className="pnl-body">
          <button type="button" className="qa-btn" onClick={() => { setQuoteForm((f) => ({ ...f, scheme_type: "private" })); setQuoteModal(true); }}>
            Run Risk-Rated Quote
          </button>
        </div>
      </div>
    </div>
  );

  const renderActuarial = () => (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-bar uhic-bar" />
          <div className="kpi-lbl">Earned Premium</div>
          <div className="kpi-val">{reserves ? fmtKes(reserves.earned_premium_kes) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar r" />
          <div className="kpi-lbl">Total Incurred</div>
          <div className="kpi-val">{reserves ? fmtKes(reserves.total_incurred_kes) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar am" />
          <div className="kpi-lbl">IBNR</div>
          <div className="kpi-val">{reserves ? fmtKes(reserves.ibnr_kes) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar g" />
          <div className="kpi-lbl">Combined Ratio</div>
          <div className="kpi-val">{reserves ? `${Math.round(reserves.combined_ratio * 1000) / 10}%` : "—"}</div>
        </div>
      </div>
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">ECCIF / PHF Fund Depletion Forecast (12 months)</div></div>
        <div className="pnl-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th>
                <th>Projected Balance</th>
                <th>Net Flow</th>
              </tr>
            </thead>
            <tbody>
              {(forecast?.eccif_projection ?? []).map((row) => (
                <tr key={row.month}>
                  <td>M{row.month}</td>
                  <td>{fmtKes(row.projected_balance_kes)}</td>
                  <td className={row.net_flow_kes >= 0 ? "pos" : "neg"}>{fmtKes(row.net_flow_kes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderFraud = () => (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-bar r" />
          <div className="kpi-lbl">Flagged Claims</div>
          <div className="kpi-val">{fraud?.flagged_count ?? "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-bar am" />
          <div className="kpi-lbl">Avg Fraud Score</div>
          <div className="kpi-val">{fraud?.avg_fraud_score ?? "—"}</div>
        </div>
      </div>
      <div className="panel">
        <div className="pnl-hd"><div className="pnl-title">Provider Risk Scorecards</div></div>
        <div className="pnl-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Tier</th>
                <th>Fraud Score</th>
                <th>Rejection %</th>
                <th>Outliers</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p: UhicProviderScore) => (
                <tr key={p.provider_id}>
                  <td>{p.provider_name}</td>
                  <td>L{p.facility_tier}</td>
                  <td><span className={`tag ${fraudTag(p.fraud_score >= 55 ? "high" : "low")}`}>{p.fraud_score}</span></td>
                  <td>{p.rejection_rate_pct}%</td>
                  <td style={{ fontSize: 11 }}>{p.outlier_flags.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="notice am" style={{ marginTop: 14 }}>
        <span className="notice-ico">⚖️</span>
        <div className="notice-tx">
          Human-in-the-loop by design — AI flags route to adjudicators; every denial is hash-chained and appealable
          (Constitution Art. 47).
        </div>
      </div>
    </>
  );

  const body: Record<UhicPage, () => React.ReactNode> = {
    overview: renderOverview,
    members: renderMembers,
    premiums: renderPremiums,
    claims: renderClaims,
    underwriting: renderUnderwriting,
    actuarial: renderActuarial,
    fraud: renderFraud,
  };

  return (
    <DashboardShell
      shellVariant="admin"
      title="UniHealth Insurance Cover"
      crumb={PAGE_TITLES[page]}
      portalSubtitle="UHIC · Module 7"
      userInitials="UH"
      userName="Claims Adjudicator"
      userEmail="uhic@unihealth.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as UhicPage)}
      nav={nav}
      onTopbarNotificationsClick={() => toast(`${summary?.claims_flagged ?? 0} claims flagged for review.`)}
      onTopbarStatusClick={() => void refreshAll()}
    >
      <div className="admin uhic-module">
        <div className="pg on">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth 360 · UHIC</div>
              <div className="ph-title">{PAGE_TITLES[page]}</div>
            </div>
            <button type="button" className="qa-btn" onClick={() => void refreshAll()}>Refresh</button>
          </div>
          {body[page]()}
        </div>
      </div>

      <FormModal
        open={quoteModal}
        title="Premium / Contribution Quote"
        onClose={() => setQuoteModal(false)}
        footer={
          <>
            <button type="button" className="qa-btn" onClick={() => setQuoteModal(false)}>Cancel</button>
            <button type="button" className="qa-btn primary" disabled={busy} onClick={() => void runQuote()}>Calculate</button>
          </>
        }
      >
        <label className="fm-lbl">Scheme
          <select className="fm-inp" value={quoteForm.scheme_type} onChange={(e) => setQuoteForm((f) => ({ ...f, scheme_type: e.target.value }))}>
            <option value="SHIF">SHIF (2.75%)</option>
            <option value="private">Private (risk-rated)</option>
          </select>
        </label>
        {quoteForm.scheme_type === "SHIF" ? (
          <label className="fm-lbl">Gross salary (KES)
            <input className="fm-inp" type="number" value={quoteForm.gross_salary_kes} onChange={(e) => setQuoteForm((f) => ({ ...f, gross_salary_kes: Number(e.target.value) }))} />
          </label>
        ) : (
          <>
            <label className="fm-lbl">Age
              <input className="fm-inp" type="number" value={quoteForm.age} onChange={(e) => setQuoteForm((f) => ({ ...f, age: Number(e.target.value) }))} />
            </label>
            <label className="fm-lbl">Base rate (KES)
              <input className="fm-inp" type="number" value={quoteForm.base_rate_kes} onChange={(e) => setQuoteForm((f) => ({ ...f, base_rate_kes: Number(e.target.value) }))} />
            </label>
          </>
        )}
      </FormModal>

      <FormModal
        open={claimModal}
        title="Submit Claim"
        onClose={() => setClaimModal(false)}
        footer={
          <>
            <button type="button" className="qa-btn" onClick={() => setClaimModal(false)}>Cancel</button>
            <button type="button" className="qa-btn primary" disabled={busy} onClick={() => void submitClaim()}>Submit</button>
          </>
        }
      >
        <label className="fm-lbl">Encounter ID (required FK)
          <input className="fm-inp" value={claimForm.encounter_id} onChange={(e) => setClaimForm((f) => ({ ...f, encounter_id: e.target.value }))} />
        </label>
        <label className="fm-lbl">Member ID
          <input className="fm-inp" value={claimForm.member_id} onChange={(e) => setClaimForm((f) => ({ ...f, member_id: e.target.value }))} />
        </label>
        <label className="fm-lbl">Amount (KES)
          <input className="fm-inp" type="number" value={claimForm.submitted_amount_kes} onChange={(e) => setClaimForm((f) => ({ ...f, submitted_amount_kes: Number(e.target.value) }))} />
        </label>
      </FormModal>
    </DashboardShell>
  );
}
