import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";

type Props = {
  role: RoleKey;
  addAudit: (m: string) => void;
};

export function StepSuccess({ role, addAudit }: Props) {
  const navigate = useNavigate();
  const c = ROLE_CONFIG[role];
  const [launching, setLaunching] = useState(false);

  function launch() {
    setLaunching(true);
    addAudit("AUTH DASHBOARD_LAUNCH role=" + role);
    window.setTimeout(() => {
      navigate(`/dashboard/${role}`);
    }, 900);
  }

  return (
    <div className="fade">
      <div className="sxwrap">
        <div className="sxring">✅</div>
        <div className="sxtitle">Access Granted</div>
        <div
          className="sxsub"
          dangerouslySetInnerHTML={{ __html: c.successMsg.replace(/\n/g, "<br />") }}
        />
        <div className="sxcard">
          <span className="sxi">{c.ico}</span>
          <div>
            <div className="sxrole">{c.successRole}</div>
            <div className="sxs">UniHealth verified · Data protection · Session secured</div>
          </div>
        </div>
        <div className="session-info">
          <span className="si-ico">⏱️</span>
          <div className="si-tx">
            <strong>Session expires in 30 minutes</strong> of inactivity (KDPA policy).
            <br />
            TLS 1.3 encrypted · Append-only audit log active · Login recorded.
          </div>
        </div>
        <button className="btn" type="button" disabled={launching} onClick={launch}>
          {launching ? "✓ Loading dashboard…" : "Launch Dashboard →"}
        </button>
      </div>
    </div>
  );
}
