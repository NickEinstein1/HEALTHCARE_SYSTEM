import { useMemo, type CSSProperties } from "react";
import type { RoleKey } from "../../theme/tokens";
import { UniHealthLogo } from "../brand/UniHealthLogo";
import {
  getDashboardPreview,
  MASTER_INTEGRATED_MODULES,
  MODULE_PULL_FLOW_STEPS,
  modulePullFlowIndex,
} from "../../lib/modulePull";

const MASTER_METRICS = [
  { value: "1,284", label: "Occupied Beds", meta: "▲ 96% national", color: "#00e5a0" },
  { value: "347", label: "Active Patients", meta: "14 facilities", color: "#00d4ff" },
  { value: "47", label: "Maternity", meta: "● 3 in labor", color: "#ff4d85" },
  { value: "8", label: "NICU Infants", meta: "● AI monitored", color: "#ffb830" },
];

const SYSTEM_STATUS = [
  { icon: "🤖", label: "AI Engine", status: "Active · 98.4%", tone: "g" },
  { icon: "🌐", label: "Hospital Network", status: "14/14 Online", tone: "b" },
  { icon: "🛡️", label: "CIC Insurance", status: "Connected · Live", tone: "p" },
  { icon: "💼", label: "Old Mutual", status: "Verification Live", tone: "a" },
  { icon: "📹", label: "Telemedicine", status: "7 live sessions", tone: "t" },
  { icon: "❤️", label: "Maternity Monitor", status: "Live · 47 patients", tone: "pk" },
];

type Props = {
  aiAttempts: number;
  auditLines: [string, string, string];
  selectedRole: RoleKey | null;
  signInStep: number;
};

export function MasterDashboardPanel({ aiAttempts, auditLines, selectedRole, signInStep }: Props) {
  const securityPct = useMemo(() => (98.4 - aiAttempts * 0.4).toFixed(1), [aiAttempts]);
  const preview = getDashboardPreview(selectedRole);
  const flowIdx = modulePullFlowIndex(signInStep);
  const isMatRole = selectedRole === "nurse" || selectedRole === "doctor";

  return (
    <div className="lp master-dash">
      <div className="flag" />
      <div className="lp-in">
        <div className="brand">
          <div className="brand-sq brand-sq--logo" aria-hidden>
            <UniHealthLogo idPrefix="master" className="unihealth-logo" />
          </div>
          <div>
            <div className="brand-nm">UniHealth 360</div>
            <div className="brand-tg master-badge">● National Healthcare OS</div>
          </div>
        </div>

        <div className="master-sbar">
          <span className="master-sbar-dot" aria-hidden />
          <span>ALL SYSTEMS LIVE · CIC · OLD MUTUAL · MATERNITY · NICU</span>
        </div>

        <div className="hero master-hero">
          <p className="eyebrow">National Healthcare Infrastructure · 2026</p>
          <h1 className="hl master-hl">
            One login.
            <br />
            <em>Module Pull</em>
            <br />
            dashboard assembly.
          </h1>
          <p className="hd">
            JWT + RBAC resolves your role, then the Module Pull API assembles EMR, Maternity, CIC,
            KEMSA, and clinical modules into your session dashboard.
          </p>
        </div>

        <div className="master-metrics" role="region" aria-label="Live system metrics">
          {MASTER_METRICS.map((m) => (
            <div key={m.label} className="master-mc" style={{ "--mcc": m.color } as CSSProperties}>
              <div className="master-mv">{m.value}</div>
              <div className="master-ml">{m.label}</div>
              <div className="master-md">{m.meta}</div>
            </div>
          ))}
        </div>

        <div className="master-dp">
          <div className="master-dp-hd">
            <div className="master-dp-ttl">
              <span className="master-dp-pip" aria-hidden />
              {preview.sessionLabel}
            </div>
          </div>
          <div className="master-dp-body">
            {preview.bars.map((bar) => (
              <div key={bar.label} className="master-bw">
                <div className="master-bl">
                  <span>{bar.label}</span>
                  <span>{bar.value}</span>
                </div>
                <div className="master-bb">
                  <div
                    className="master-bf"
                    style={{
                      width: `${bar.pct}%`,
                      background: bar.maternity
                        ? "linear-gradient(90deg, #a855f7, #ff4d85)"
                        : undefined,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="master-dp-mods">
              {preview.modLabels.map((label) => {
                const mat = /maternity|nicu|fetal|birth/i.test(label);
                return (
                  <span
                    key={label}
                    className={`master-dp-mod on${mat ? " mat" : ""}${isMatRole && mat ? " highlight" : ""}`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="master-ss">
          <div className="master-shd">
            <span>System Status · Live</span>
          </div>
          <div className="master-sg">
            {SYSTEM_STATUS.map((s) => (
              <div key={s.label} className="master-si">
                <div className={`master-si-ic tone-${s.tone}`}>{s.icon}</div>
                <div className="master-si-tx">
                  <div className="master-si-nm">{s.label}</div>
                  <div className="master-si-st">{s.status}</div>
                </div>
                <span className="master-sipip" aria-hidden />
              </div>
            ))}
          </div>
        </div>

        <div className="master-mw" role="region" aria-label="Maternity live stats">
          <div className="master-mw-hd">
            <span className="master-mw-badge">❤️ Maternity & Women&apos;s Health · Live</span>
          </div>
          <div className="master-mw-g">
            {[
              ["24", "ANC Today"],
              ["3", "In Labor"],
              ["8", "NICU"],
              ["19", "Postnatal"],
              ["5", "Births Today"],
              ["7", "High-Risk AI"],
            ].map(([v, l]) => (
              <div key={l} className="master-mw-c">
                <div className="master-mw-v">{v}</div>
                <div className="master-mw-l">{l}</div>
              </div>
            ))}
          </div>
          <div className="master-mw-alert">
            AI: 2 high-risk pregnancies flagged for immediate clinical review
          </div>
        </div>

        <div className="master-mods">
          <div className="master-shd">
            <span>Integrated Modules · UniHealth 360</span>
          </div>
          <div className="master-mg">
            {MASTER_INTEGRATED_MODULES.map((mod) => (
              <div key={mod.id} className={`master-mod${mod.maternity ? " mat" : ""}`} title={mod.desc}>
                <span className="master-mod-ic">{mod.icon}</span>
                <span className="master-mod-nm">{mod.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="master-af">
          <div className="master-af-t">Module Pull API · Authentication Flow</div>
          <div className="master-fn-row">
            {MODULE_PULL_FLOW_STEPS.flatMap((step, i) => [
              i > 0 ? <div key={`sep-${step.id}`} className="master-fa" aria-hidden /> : null,
              <div key={step.id} className="master-fn">
                <div className={`master-fn-c${i <= flowIdx ? " on" : ""}`}>{step.icon}</div>
                <div className="master-fn-l">{step.label}</div>
              </div>,
            ])}
          </div>
        </div>

        <div className="ai-monitor">
          <div className="ai-hd">
            <div className="ai-pulse" />
            <div className="ai-title">AI Security Monitor — Live</div>
          </div>
          <div className="ai-rows">
            <div className="ai-row">
              <div className="ai-lbl">Threat Detection (NIDS)</div>
              <div className="ai-val ok">ACTIVE</div>
            </div>
            <div className="ai-row">
              <div className="ai-lbl">Anomaly Detection (ML)</div>
              <div className="ai-val ok">NOMINAL</div>
            </div>
            <div className="ai-row">
              <div className="ai-lbl">Intrusion Attempts (1hr)</div>
              <div className="ai-val warn">{aiAttempts}</div>
            </div>
            <div className="ai-row">
              <div className="ai-lbl">CIC Insurance API</div>
              <div className="ai-val ok">LIVE</div>
            </div>
            <div className="ai-row">
              <div className="ai-lbl">Maternity AI Monitor</div>
              <div className="ai-val ok">RUNNING</div>
            </div>
          </div>
          <div className="ai-bar-row">
            <div className="ai-bar-lbl">
              System Security Score <span>{securityPct}%</span>
            </div>
            <div className="ai-bar">
              <div className="ai-bar-f" style={{ width: `${Math.min(100, parseFloat(securityPct))}%` }} />
            </div>
          </div>
        </div>

        <div className="audit-ticker">
          <div className="at-lbl">Append-Only Audit Log · Tamper-Evident</div>
          <div className="at-entry">{auditLines[0]}</div>
          <div className="at-entry">{auditLines[1]}</div>
          <div className="at-entry">{auditLines[2]}</div>
        </div>

        <div className="lfooter master-ft">
          <span>ISO 27001 · FHIR R5 · CIC · KEMSA</span>
          <span>© UniHealth 360 · 2026</span>
        </div>
      </div>
    </div>
  );
}
