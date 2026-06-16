import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { V2_MODULE_NAV } from "../../routes/dashboardRoutes";
import "./DashboardLayout.css";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  pageIcon?: string;
  currentSection?: string;
  userRole?: string;
  userName?: string;
  onNewPatient?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  pageTitle,
  pageIcon = "🏥",
  userRole = "Attending Physician",
  userName = "Dr. Wanjiku",
  onNewPatient,
}) => {
  const location = useLocation();
  const [time, setTime] = useState("");
  const [notificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-app">
      <nav className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sb-brand">
          <div className="sb-logo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="#2ecc71" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="sb-nm">UniHealth 360</div>
            <div className="sb-tag">Healthcare OS</div>
          </div>
        </div>

        <div className="sb-user">
          <div className="sbu-av">{userName.split(" ").map((n) => n[0]).join("")}</div>
          <div>
            <div className="sbu-nm">{userName}</div>
            <div className="sbu-rl">{userRole}</div>
          </div>
        </div>

        <div className="sb-nav">
          {V2_MODULE_NAV.map((section) => (
            <div key={section.section}>
              <div className="sb-sect">{section.section}</div>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    className={`sb-lnk${active ? " active" : ""}`}
                    to={item.path}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sb-ft">
          <Link to="/portal" className="sb-back">
            ← Module catalog
          </Link>
          <Link to="/sign-in" className="sb-back" style={{ marginTop: 6 }}>
            ⎋ Sign out
          </Link>
          <div className="sb-ver">UniHealth 360 v4.0 · FHIR R5 · HIPAA</div>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="tb-page">
            <span style={{ fontSize: "16px" }}>{pageIcon}</span>
            {pageTitle}
          </div>
          <div className="tb-badge bg">
            <span className="pdot" />
            LIVE · FHIR R5
          </div>
          <button type="button" className="tb-btn bp" onClick={onNewPatient}>
            <span>➕</span> New Patient
          </button>
          <div
            className="tb-ic"
            onClick={() => setShowNotifications(!showNotifications)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setShowNotifications((v) => !v)}
          >
            🔔
            <div className="nn">{notificationCount}</div>
          </div>
          <div className="clk">{time}</div>
        </div>

        <div className="content">{children}</div>

        {showNotifications ? (
          <div className="notif-panel">
            <div className="ni">Patient Mary Wanjiku: BP spike detected</div>
            <div className="ni">Lab results ready for review - 5 patients</div>
            <div className="ni">System maintenance scheduled for tonight at 22:00</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
