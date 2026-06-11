import { Link } from "react-router-dom";
import { V2_MODULE_NAV } from "../routes/dashboardRoutes";
import "./PortalPage.css";

const PORTAL_MODULES = V2_MODULE_NAV.flatMap((section) =>
  section.items.map((item) => ({
    icon: item.icon,
    label: item.label,
    path: item.path,
    desc: item.desc,
    tag: section.section,
  })),
);

export const PortalPage: React.FC = () => {
  const authPortals = [
    {
      icon: "👨‍⚕️",
      title: "Clinician Portal",
      desc: "Access EMR, patient data, orders, and clinical tools",
      path: "/modules/emr",
    },
    {
      icon: "🏥",
      title: "Admin Portal",
      desc: "System administration and facility management",
      path: "/dashboard/admin",
    },
  ];

  const stats = [
    { value: "20", label: "Modules" },
    { value: "5K+", label: "Users" },
    { value: "1.2M", label: "Patients" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="portal-page">
      <div className="portal-grid-bg" />

      <div className="portal-wrap">
        <header className="portal-hdr">
          <div className="logo-ring">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path d="M17 4v8M17 22v8M4 17h8M22 17h8" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="10" y="10" width="14" height="14" rx="3.5" fill="rgba(46,204,113,.12)" stroke="#2ecc71" strokeWidth="1.5" />
              <circle cx="17" cy="17" r="3.5" fill="#2ecc71" />
            </svg>
          </div>
          <h1>
            UniHealth <em>360</em>
          </h1>
          <p className="portal-sub">
            National AI-Powered Healthcare Operating System
            <br />
            Enterprise Portal · Full Module Build · v4.0
          </p>
          <div className="stripe" />
          <div className="meta-chips">
            <div className="chip ch-g">
              <span className="pdot" />
              ALL SYSTEMS LIVE
            </div>
            <div className="chip ch-g">20 Modules Built</div>
            <div className="chip ch-b">FHIR R5 · JWT · RBAC</div>
            <div className="chip ch-pk">Maternity AI Active</div>
          </div>
        </header>

        <div className="cta-box">
          <Link to="/modules/emr" className="btn-main">
            <span>🚀</span> Launch Clinician Portal
          </Link>
          <Link to="/dashboard/admin" className="btn-ghost">
            ⚙️ Admin Console
          </Link>
        </div>

        <div className="stats-bar">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-c">
              <div className="stat-v">{stat.value}</div>
              <div className="stat-l">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="sec-label">Access Portals</div>
        <div className="auth-grid">
          {authPortals.map((portal) => (
            <Link key={portal.path} to={portal.path} className="auth-card">
              <div className="auth-icon">{portal.icon}</div>
              <div>
                <div className="auth-title">{portal.title}</div>
                <div className="auth-desc">{portal.desc}</div>
                <div className="auth-url">→ Enter Portal</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sec-label">All Modules</div>
        <div className="grid">
          {PORTAL_MODULES.map((module) => (
            <Link key={module.path} to={module.path} className="card">
              <div className="card-icon">{module.icon}</div>
              <div className="card-name">{module.label}</div>
              <div className="card-desc">{module.desc ?? module.label}</div>
              <span className="card-tag">{module.tag}</span>
            </Link>
          ))}
        </div>

        <footer className="portal-foot">
          <div>UniHealth 360 Enterprise · FHIR R5 · HIPAA Compliant</div>
          <div>Build v4.0 · Last Updated: {new Date().toLocaleDateString()}</div>
          <div>
            <Link to="/" className="footer-link">
              Marketing home
            </Link>{" "}
            · <Link to="/sign-in" className="footer-link">Sign in</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
