import { Link, useParams } from "react-router-dom";
import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";

const ROLES: RoleKey[] = ["doctor", "nurse", "admin", "patient"];

function isRoleKey(x: string | undefined): x is RoleKey {
  return !!x && (ROLES as string[]).includes(x);
}

export function DashboardPage() {
  const { role: roleParam } = useParams();
  const role = isRoleKey(roleParam) ? roleParam : "admin";
  const c = ROLE_CONFIG[role];

  return (
    <div className="rp" style={{ minHeight: "100vh", alignItems: "flex-start", paddingTop: 48 }}>
      <div className="card" style={{ maxWidth: 560, width: "100%" }}>
        <div className="cstripe" />
        <div className="cbody">
          <div className="shd">
            <div className="sico">{c.ico}</div>
            <div className="stitle">Dashboard</div>
            <div className="ssub">{c.successRole}</div>
          </div>
          <div className="nbox grn">
            <span className="ni">🏥</span>
            <span>
              This route is a <strong>placeholder</strong> for the React shell. Replace with real ward
              queues, admin modules, or patient chart navigation when APIs are wired.
            </span>
          </div>
          <Link className="btn" to="/" style={{ textDecoration: "none", display: "inline-flex", marginTop: 12 }}>
            ← Back to sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}
