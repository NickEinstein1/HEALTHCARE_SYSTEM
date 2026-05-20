import { useMemo } from "react";
import { UniHealthLogo } from "../brand/UniHealthLogo";

type Props = {
  aiAttempts: number;
  auditLines: [string, string, string];
};

export function BrandPanel({ aiAttempts, auditLines }: Props) {
  const securityPct = useMemo(() => (98.4 - aiAttempts * 0.4).toFixed(1), [aiAttempts]);

  return (
    <div className="lp">
      <div className="flag" />
      <div className="li">
        <div>
          <div className="brand">
            <div className="brand-sq brand-sq--logo" aria-hidden>
              <UniHealthLogo idPrefix="panel" className="unihealth-logo" />
            </div>
            <div>
              <div className="brand-nm">UniHealth</div>
              <div className="brand-tg">Innovation at its core</div>
            </div>
          </div>
          <div className="sys-pill">
            <div className="dot" />
            Phase 1 Pilot · UniHealth National EHR · 2026
          </div>
        </div>
        <div className="hero">
          <h1 className="hl">
            One login.
            <br />
            <em>Every patient,</em>
            <br />
            every hospital.
          </h1>
          <p className="hd">
            Secure, unified access to health records across the pilot network — protected by
            multi-factor authentication and AI-powered security monitoring.
          </p>
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
              <div className="ai-lbl">Auth Servers (Redundant)</div>
              <div className="ai-val live">3/3 UP</div>
            </div>
            <div className="ai-row">
              <div className="ai-lbl">UEBA Behaviour Model</div>
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

        <div className="lfooter">
          <span>Data protection · Phase 1 policy · ISO 27001</span>
          <span>© UniHealth Pilot 2026</span>
        </div>
      </div>
    </div>
  );
}
