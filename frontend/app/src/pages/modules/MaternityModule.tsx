import { useState } from "react";
import type { ReactNode } from "react";
import { ApiRefPanel } from "../../components/dashboard/ApiRefPanel";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";
import { FormModal } from "../../components/FormModal";
import { buildV2ModuleNav } from "../../lib/moduleNav";
import { DashIcon } from "../../components/brand/DashIcon";

type MatPage = "overview" | "anc" | "labor" | "nicu" | "postnatal" | "api";

const PAGE_TITLES: Record<MatPage, string> = {
  overview: "Overview",
  anc: "ANC Clinic",
  labor: "Labor Ward",
  nicu: "NICU",
  postnatal: "Postnatal",
  api: "API Reference",
};

const MATERNITY_API = [
  { method: "GET", path: "/api/maternity/patients", desc: "List expectant mothers" },
  { method: "POST", path: "/api/maternity/anc-visit", desc: "Record ANC visit" },
  { method: "POST", path: "/api/maternity/labor", desc: "Admit mother to labor ward" },
  { method: "POST", path: "/api/maternity/delivery", desc: "Record delivery outcome" },
  { method: "GET", path: "/api/nicu/patients", desc: "List NICU infants with vitals" },
  { method: "POST", path: "/api/nicu/vitals", desc: "Update neonatal vitals" },
  { method: "POST", path: "/api/ai/maternity/risk", desc: "AI maternal risk assessment" },
];

function LaborBay({
  tone,
  label,
  name,
  meta,
  fhr,
  tag,
  tagClass,
}: {
  tone: "r" | "am" | "g";
  label: string;
  name: string;
  meta: string;
  fhr: string;
  tag: string;
  tagClass: string;
}) {
  const bg =
    tone === "r" ? "rgba(255,51,102,0.08)" : tone === "am" ? "rgba(255,184,48,0.08)" : "rgba(0,229,160,0.06)";
  const border =
    tone === "r" ? "rgba(255,51,102,0.22)" : tone === "am" ? "rgba(255,184,48,0.22)" : "rgba(0,229,160,0.22)";
  const color = tone === "r" ? "var(--r)" : tone === "am" ? "var(--am)" : "var(--g)";

  return (
    <div style={{ padding: 12, background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 10.5, color: "var(--t3)" }}>{meta}</div>
      <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 4 }}>
        FHR: <span className="mono" style={{ color: "var(--g)" }}>{fhr}</span> bpm
      </div>
      <div style={{ marginTop: 6 }}>
        <span className={`tag ${tagClass}`}>{tag}</span>
      </div>
    </div>
  );
}

function MaternityPageBody({ page, toast }: { page: MatPage; toast: (m: string) => void }) {
  if (page === "overview") {
    return (
      <>
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-bar" style={{ background: "#ff4d85" }} />
            <div className="kpi-ico"><DashIcon icon="🤰" /></div>
            <div className="kpi-lbl">Active Patients</div>
            <div className="kpi-val">47</div>
            <div className="kpi-meta">ANC · Labor · Postnatal</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar am" />
            <div className="kpi-ico"><DashIcon icon="🏥" /></div>
            <div className="kpi-lbl">In Active Labor</div>
            <div className="kpi-val">3</div>
            <div className="kpi-meta">Bay 2 · Bay 5 · Bay 7</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar r" />
            <div className="kpi-ico"><DashIcon icon="👶" /></div>
            <div className="kpi-lbl">NICU Infants</div>
            <div className="kpi-val">8</div>
            <div className="kpi-meta">2 critical monitoring</div>
          </div>
          <div className="kpi">
            <div className="kpi-bar g" />
            <div className="kpi-ico"><DashIcon icon="📋" /></div>
            <div className="kpi-lbl">ANC Today</div>
            <div className="kpi-val">24</div>
            <div className="kpi-meta">6 high-risk flagged</div>
          </div>
        </div>
        <div className="notice r" style={{ marginBottom: 14 }}>
          <span className="notice-ico"><DashIcon icon="⚠️" /></span>
          <div className="notice-tx">
            <strong>AI Maternal Alert:</strong> Grace Kamau (KE-00849) — high-risk pregnancy. Pre-eclampsia risk 78%.
            Immediate obstetric review recommended.
          </div>
        </div>
        <div className="g2">
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">Today&apos;s ANC Queue</div>
            </div>
            <div className="pnl-body">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>GA</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Grace Kamau</td>
                    <td>32w 4d</td>
                    <td><span className="tag r">High</span></td>
                    <td><span className="tag am">Waiting</span></td>
                  </tr>
                  <tr>
                    <td>Aisha Maina</td>
                    <td>28w 1d</td>
                    <td><span className="tag g">Low</span></td>
                    <td><span className="tag g">Seen</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-title">AI Maternal Risk</div>
              <span className="tag" style={{ borderColor: "rgba(255,77,133,0.35)", color: "#ff4d85" }}>LIVE</span>
            </div>
            <div className="pnl-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--t2)", marginBottom: 4 }}>
                  <span>Pre-eclampsia — Grace Kamau</span>
                  <span className="mono" style={{ color: "var(--r)" }}>78%</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                  <div style={{ width: "78%", height: "100%", borderRadius: 2, background: "linear-gradient(90deg, var(--am), var(--r))" }} />
                </div>
              </div>
              <div className="notice am" style={{ margin: 0 }}>
                <span className="notice-ico"><DashIcon icon="💡" /></span>
                <div className="notice-tx">Schedule Grace Kamau for urgent hypertension review + 24hr urine protein.</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (page === "anc") {
    return (
      <div className="g2">
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">ANC Appointments Today</div>
            <button className="btn-p btn-sm" type="button" onClick={() => toast("ANC visit form opened.")}>
              ➕ New Visit
            </button>
          </div>
          <div className="pnl-body">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>GA</th>
                  <th>Visit</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Grace Kamau</td>
                  <td>32w 4d</td>
                  <td>ANC-4</td>
                  <td><span className="tag r">High Risk</span></td>
                  <td><span className="tag am">Waiting</span></td>
                </tr>
                <tr>
                  <td>Aisha Maina</td>
                  <td>28w 1d</td>
                  <td>ANC-3</td>
                  <td><span className="tag g">Low Risk</span></td>
                  <td><span className="tag g">Seen</span></td>
                </tr>
                <tr>
                  <td>Priscilla Oloo</td>
                  <td>36w 5d</td>
                  <td>ANC-6</td>
                  <td><span className="tag am">Moderate</span></td>
                  <td><span className="tag b">In Progress</span></td>
                </tr>
                <tr>
                  <td>Beatrice Njoki</td>
                  <td>20w 2d</td>
                  <td>ANC-2</td>
                  <td><span className="tag g">Low Risk</span></td>
                  <td><span className="tag am">Waiting</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="pnl-hd">
            <div className="pnl-title">ANC Visit — Grace Kamau</div>
          </div>
          <div className="pnl-body">
            <div className="g2">
              <div className="ff">
                <label>Gestational Age</label>
                <input readOnly value="32w 4d" />
              </div>
              <div className="ff">
                <label>Weight (kg)</label>
                <input placeholder="72.5" />
              </div>
              <div className="ff">
                <label>BP (mmHg)</label>
                <input placeholder="148/96" />
              </div>
              <div className="ff">
                <label>Fetal HR (bpm)</label>
                <input placeholder="152" />
              </div>
            </div>
            <div className="ff" style={{ marginTop: 10 }}>
              <label>Clinical Notes</label>
              <textarea rows={2} placeholder="Observations and plan…" />
            </div>
            <button className="btn-p btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => toast("ANC visit saved.")}>
              💾 Save Visit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "labor") {
    return (
      <div className="panel">
        <div className="pnl-hd">
          <div className="pnl-title">Labor Ward — Live Status</div>
          <span className="tag g">MONITORING</span>
        </div>
        <div className="pnl-body">
          <div className="g3" style={{ marginBottom: 14 }}>
            <LaborBay tone="r" label="🔴 Bay 2 — Active Labor" name="Ruth Achieng" meta="G2P1 · 39w 2d · Cervix 7cm" fhr="148" tag="Pushing Phase" tagClass="r" />
            <LaborBay tone="am" label="🟡 Bay 5 — Active Labor" name="Janet Wairimu" meta="G1P0 · 38w 0d · Cervix 4cm" fhr="156" tag="Early Active" tagClass="am" />
            <LaborBay tone="g" label="🟢 Bay 7 — Active Labor" name="Miriam Otieno" meta="G3P2 · 40w 1d · Cervix 9cm" fhr="142" tag="Near Delivery" tagClass="g" />
          </div>
          <div className="pnl-title" style={{ marginBottom: 10 }}>Record Delivery Outcome</div>
          <div className="g2">
            <div className="ff">
              <label>Mother (Patient ID)</label>
              <input placeholder="KE-XXXXX" />
            </div>
            <div className="ff">
              <label>Delivery Time</label>
              <input type="time" />
            </div>
            <div className="ff">
              <label>Mode of Delivery</label>
              <select>
                <option>SVD</option>
                <option>Caesarean Section</option>
                <option>Assisted (Vacuum)</option>
              </select>
            </div>
            <div className="ff">
              <label>Baby Weight (kg)</label>
              <input placeholder="3.2" />
            </div>
          </div>
          <button className="btn-p btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => toast("Delivery outcome recorded.")}>
            ✓ Record Delivery
          </button>
        </div>
      </div>
    );
  }

  if (page === "nicu") {
    return (
      <div className="panel">
        <div className="pnl-hd">
          <div className="pnl-title">NICU Dashboard — 8 Neonates</div>
          <span className="tag" style={{ color: "#ff4d85", borderColor: "rgba(255,77,133,0.35)" }}>LIVE</span>
        </div>
        <div className="pnl-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Baby ID</th>
                <th>Mother</th>
                <th>GA</th>
                <th>Wt</th>
                <th>HR</th>
                <th>SpO₂</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono" style={{ color: "#ff4d85" }}>NEO-001</td>
                <td>Ruth Achieng</td>
                <td>39w</td>
                <td>3.1 kg</td>
                <td className="mono" style={{ color: "var(--g)" }}>148</td>
                <td>98%</td>
                <td>Normal</td>
                <td><span className="tag g">Stable</span></td>
              </tr>
              <tr>
                <td className="mono" style={{ color: "#ff4d85" }}>NEO-002</td>
                <td>Wanjiku Njoro</td>
                <td>28w</td>
                <td>1.1 kg</td>
                <td className="mono" style={{ color: "var(--am)" }}>162</td>
                <td>91%</td>
                <td>Prematurity</td>
                <td><span className="tag r">Critical</span></td>
              </tr>
              <tr>
                <td className="mono" style={{ color: "#ff4d85" }}>NEO-003</td>
                <td>Fatuma Omar</td>
                <td>32w</td>
                <td>1.7 kg</td>
                <td className="mono" style={{ color: "var(--g)" }}>155</td>
                <td>95%</td>
                <td>Prematurity</td>
                <td><span className="tag am">Monitoring</span></td>
              </tr>
            </tbody>
          </table>
          <div className="notice r" style={{ marginTop: 14 }}>
            <span className="notice-ico"><DashIcon icon="🚨" /></span>
            <div className="notice-tx">
              <strong>NICU Alert:</strong> NEO-002 — SpO₂ dropped to 91%. Oxygen adjusted. NICU physician paged.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === "postnatal") {
    return (
      <div className="panel">
        <div className="pnl-hd">
          <div className="pnl-title">Postnatal Ward</div>
          <button className="btn-s btn-sm" type="button" onClick={() => toast("Postnatal note added.")}>
            Add Note
          </button>
        </div>
        <div className="pnl-body">
          <table className="tbl">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Delivered</th>
                <th>Mode</th>
                <th>Baby</th>
                <th>Breastfeeding</th>
                <th>Day</th>
                <th>Discharge</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ruth Achieng</td>
                <td>12 May</td>
                <td>SVD</td>
                <td>NEO-001 · 3.1kg</td>
                <td><span className="tag g">Established</span></td>
                <td>Day 1</td>
                <td>14 May</td>
              </tr>
              <tr>
                <td>Celine Mwenda</td>
                <td>08 May</td>
                <td>C/S</td>
                <td>NEO-004 · 2.1kg</td>
                <td><span className="tag am">Assisted</span></td>
                <td>Day 4</td>
                <td>15 May</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <ApiRefPanel
      title="API Reference — Maternity & NICU"
      endpoints={MATERNITY_API}
      footnote="Maternity and NICU endpoints share authentication with the core EMR gateway."
    />
  );
}

export function MaternityModule() {
  const toast = useDashboardToast();
  const [page, setPage] = useState<MatPage>("overview");
  const [ancModal, setAncModal] = useState(false);

  const nav = buildV2ModuleNav([
    {
      label: "Maternity",
      items: [
        { id: "overview", icon: "🏠", label: "Overview" },
        { id: "anc", icon: "🤰", label: "ANC Clinic" },
        { id: "labor", icon: "🏥", label: "Labor Ward", badge: { text: "3", tone: "amber" } },
        { id: "nicu", icon: "👶", label: "NICU", badge: { text: "2", tone: "red" } },
        { id: "postnatal", icon: "🌸", label: "Postnatal" },
        { id: "api", icon: "🔗", label: "API Reference" },
      ],
    },
  ]);

  const topAction: ReactNode =
    page === "overview" || page === "anc" ? (
      <button className="btn-p btn-sm" type="button" onClick={() => setAncModal(true)}>
        ➕ ANC Visit
      </button>
    ) : null;

  return (
    <DashboardShell
      shellVariant="nurse"
      title="Maternal & Neonatal Care"
      crumb={PAGE_TITLES[page]}
      portalSubtitle="Maternity Module"
      userInitials="MW"
      userName="Midwife Wanjiku"
      userEmail="midwife@knh.go.ke"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as MatPage)}
      nav={nav}
      onTopbarNotificationsClick={() => toast("3 maternal alerts — review high-risk ANC.")}
      onTopbarStatusClick={() => toast("Maternity module online · AI monitoring active.")}
    >
      <div className="nurse">
        <div className={`pg on`} id={`pg-mat-${page}`}>
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth 360 · Maternity & NICU</div>
              <div className="ph-ti">{PAGE_TITLES[page]}</div>
              <div className="ph-su">Antenatal, labor, delivery & neonatal intensive care</div>
            </div>
            {topAction ? <div className="ph-r">{topAction}</div> : null}
          </div>
          <MaternityPageBody page={page} toast={toast} />
        </div>
      </div>

      <FormModal
        open={ancModal}
        title="New ANC Visit"
        onClose={() => setAncModal(false)}
        footer={
          <>
            <button className="btn-s" type="button" onClick={() => setAncModal(false)}>Cancel</button>
            <button
              className="btn-p"
              type="button"
              onClick={() => {
                setAncModal(false);
                toast("ANC visit saved.");
              }}
            >
              Save Visit
            </button>
          </>
        }
      >
        <div className="g2">
          <div className="ff">
            <label>Patient</label>
            <input placeholder="Search patient…" />
          </div>
          <div className="ff">
            <label>Visit Number</label>
            <select>
              <option>ANC-1</option>
              <option>ANC-2</option>
              <option>ANC-3</option>
              <option>ANC-4</option>
            </select>
          </div>
          <div className="ff">
            <label>Weight (kg)</label>
            <input type="number" placeholder="68.5" />
          </div>
          <div className="ff">
            <label>BP (mmHg)</label>
            <input placeholder="120/80" />
          </div>
        </div>
      </FormModal>
    </DashboardShell>
  );
}
