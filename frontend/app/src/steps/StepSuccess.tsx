import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";
import { getModulesForRole } from "../lib/modulePull";
import { getPilotRole } from "../lib/pilotRoles";

type Props = {
  role: RoleKey;
  addAudit: (m: string) => void;
};

export function StepSuccess({ role, addAudit }: Props) {
  const navigate = useNavigate();
  const c = ROLE_CONFIG[role];
  const [launching, setLaunching] = useState(false);
  const pulledModules = getModulesForRole(role);

  function launch() {
    setLaunching(true);
    addAudit("AUTH DASHBOARD_LAUNCH role=" + role + " modules=" + pulledModules.map((m) => m.id).join(","));
    window.setTimeout(() => {
      navigate(getPilotRole(role).dashboardPath);
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
        <div className="module-pull-strip" role="status" aria-label="Modules pulled for your role">
          <div className="module-pull-lbl">Module Pull API · {pulledModules.length} modules assembled</div>
          <div className="module-pull-chips">
            {pulledModules.map((mod) => (
              <Link key={mod.id} to={mod.path} className={`module-pull-chip${mod.maternity ? " mat" : ""}`}>
                {mod.icon} {mod.label}
              </Link>
            ))}
          </div>
        </div>
        <button className="btn" type="button" disabled={launching} onClick={launch}>
          {launching ? "✓ Loading dashboard…" : "Launch Dashboard →"}
        </button>
      </div>
    </div>
  );
}
