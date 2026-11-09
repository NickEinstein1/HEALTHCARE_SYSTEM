import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashIcon } from "../brand/DashIcon";
import { SearchBarBrand } from "../brand/SearchBarBrand";
import { UniHealthLogo } from "../brand/UniHealthLogo";

type ToastFn = (message: string) => void;
const DashboardToastContext = createContext<null | ToastFn>(null);

export function useDashboardToast() {
  const ctx = useContext(DashboardToastContext);
  if (ctx) return ctx;
  return (message: string) => {
    window.dispatchEvent(new CustomEvent("dash:toast", { detail: { message } }));
  };
}

export type DashboardNavItem = {
  id: string;
  icon: string;
  label: string;
  badge?: { text: string; tone: "red" | "amber" | "green" };
  /** When set, navigates via React Router instead of onNavSelect. */
  href?: string;
};

export type DashboardNavSection = {
  label: string;
  items: DashboardNavItem[];
};

export type DashboardShellVariant =
  | "admin"
  | "doctor"
  | "nurse"
  | "patient"
  | "lab"
  | "pharmacy"
  | "billing";

// Role metadata: accent colour class, display label, icon
const ROLE_META: Record<DashboardShellVariant, { label: string; icon: string; accentClass: string }> = {
  admin:    { label: "Admin Console",        icon: "role.admin", accentClass: "role-admin"    },
  doctor:   { label: "Clinical Workstation", icon: "role.doctor", accentClass: "role-doctor"   },
  nurse:    { label: "Nurse Station",        icon: "role.nurse", accentClass: "role-nurse"    },
  patient:  { label: "Patient Portal",       icon: "role.patient", accentClass: "role-patient"  },
  lab:      { label: "Lab & Imaging",        icon: "role.lab", accentClass: "role-lab"      },
  pharmacy: { label: "Pharmacy Portal",      icon: "role.pharmacy", accentClass: "role-pharmacy" },
  billing:  { label: "Billing & Finance",    icon: "role.billing", accentClass: "role-billing" },
};

export function DashboardShell(props: {
  title: string;
  crumb: string;
  portalSubtitle: string;
  userInitials: string;
  userName: string;
  userEmail: string;
  nav: DashboardNavSection[];
  shellVariant?: DashboardShellVariant;
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  topbarSearchPlaceholder?: string;
  topbarSearchValue?: string;
  onTopbarSearchChange?: (value: string) => void;
  onTopbarSearchFocus?: () => void;
  onTopbarSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTopbarNotificationsClick?: () => void;
  onTopbarStatusClick?: () => void;
  onSignOutClick?: () => void;
  children: React.ReactNode;
}) {
  const {
    title, crumb, portalSubtitle, userInitials, userName, userEmail,
    nav, shellVariant, activeNavId, onNavSelect,
    topbarSearchPlaceholder, topbarSearchValue,
    onTopbarSearchChange, onTopbarSearchFocus, onTopbarSearchKeyDown,
    onTopbarNotificationsClick, onTopbarStatusClick, onSignOutClick,
    children,
  } = props;

  const meta = shellVariant ? ROLE_META[shellVariant] : null;
  const shellClass = [
    "dash-shell",
    shellVariant ? `dash-shell--${shellVariant}` : "",
  ].filter(Boolean).join(" ");

  const navigate   = useNavigate();
  const location   = useLocation();
  const [dateText, setDateText]     = useState("");
  const [timeText, setTimeText]     = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMsg, setToastMsg]     = useState<string | null>(null);

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const date   = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      return { date, time: `${h}:${m}` };
    };
    const { date, time } = fmt();
    setDateText(date); setTimeText(time);
    const id = window.setInterval(() => {
      const { date: d, time: t } = fmt();
      setDateText(d); setTimeText(t);
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const toast: ToastFn = useMemo(() => {
    return (message: string) => {
      setToastMsg(message);
      window.setTimeout(() => setToastMsg((cur) => (cur === message ? null : cur)), 3200);
    };
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const message = ce.detail?.message;
      if (typeof message === "string" && message.trim()) toast(message);
    };
    window.addEventListener("dash:toast", onToast as EventListener);
    return () => window.removeEventListener("dash:toast", onToast as EventListener);
  }, [toast]);

  // Count all badge items for the notification dot
  const totalAlerts = nav.flatMap(s => s.items).filter(i => i.badge?.tone === "red").length;

  const handleSignOut = () => {
    try {
      ["doc.admitted.v1","doc.labOrders.v1","doc.imagingOrders.v1","doc.rxDrafts.v1"]
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    onSignOutClick?.();
    if (!onSignOutClick) navigate("/sign-in");
  };

  return (
    <DashboardToastContext.Provider value={toast}>
      <div className={shellClass}>

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div className="sb-overlay" aria-hidden onClick={() => setSidebarOpen(false)} />
        )}

        {/* ══════════════════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════════════════ */}
        <nav className={`sb${sidebarOpen ? " sb--open" : ""}`} aria-label="Main navigation">

          {/* Kenya flag stripe */}
          <div className="sb-flag" />

          <div className="sb-in">

            {/* ── Brand ── */}
            <div className="sb-brand">
              <div className="sb-logo">
                <div className="sb-logo-inner sb-logo-inner--mark" aria-hidden>
                  <UniHealthLogo idPrefix="dash" className="unihealth-logo" />
                </div>
                <div className="sb-logo-glow" />
              </div>
              <div className="sb-brand-text">
                <div className="sb-nm">UniHealth</div>
                <div className="sb-sub">{portalSubtitle}</div>
              </div>
              <div className="sb-status-dot" aria-label="System online" title="System Online">
                <span className="sb-live" />
              </div>
              <button className="sb-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            {/* ── Role chip ── */}
            {meta && (
              <div className="sb-role-chip">
                <span className="sb-role-icon" aria-hidden>
                  <DashIcon icon={meta.icon} idPrefix={`shell-role-${shellVariant ?? "x"}`} />
                </span>
                <span className="sb-role-label">{meta.label}</span>
                <span className="sb-role-online">
                  <span className="sb-role-dot" />
                  LIVE
                </span>
              </div>
            )}

            {/* ── Navigation sections ── */}
            <div className="sb-nav">
              {nav.map((sec) => (
                <div className="sb-sec" key={sec.label}>
                  <div className="sb-sec-hd">
                    <span className="sb-sec-lbl">{sec.label}</span>
                    <div className="sb-sec-line" />
                  </div>
                  {sec.items.map((it, idx) => {
                    const isActive = it.href
                      ? location.pathname === it.href
                      : activeNavId
                        ? activeNavId === it.id
                        : idx === 0 && sec === nav[0];
                    return (
                      <button
                        key={it.id}
                        className={`ni${isActive ? " on" : ""}`}
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => {
                          if (it.href) {
                            navigate(it.href);
                          } else {
                            onNavSelect?.(it.id);
                          }
                          setSidebarOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (it.href) navigate(it.href);
                            else onNavSelect?.(it.id);
                            setSidebarOpen(false);
                          }
                        }}
                      >
                        <div className="ni-accent" aria-hidden />
                        <div className="ni-ico-wrap" aria-hidden>
                          <DashIcon icon={it.icon} idPrefix={`nav-${it.id}`} className="ni-ico" />
                        </div>
                        <span className="ni-lbl">{it.label}</span>
                        {it.badge && (
                          <span className={`ni-badge ${it.badge.tone}`} aria-label={`${it.badge.text} alerts`}>
                            {it.badge.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── User footer ── */}
            <div className="sb-user">
              <div className="sb-av-wrap">
                <div className="sb-av">{userInitials}</div>
                <div className="sb-av-ring" />
              </div>
              <div className="sb-user-info">
                <div className="sb-un">{userName}</div>
                <div className="sb-ue">{userEmail}</div>
              </div>
              <button
                className="sb-signout"
                type="button"
                title="Sign out"
                aria-label="Sign out"
                onClick={handleSignOut}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign out</span>
              </button>
            </div>

            {/* ── System info footer ── */}
            <div className="sb-sys-foot">
              <span className="sb-sys-ver">v2.4 · MOH Kenya</span>
              <span className="sb-sys-time">{timeText}</span>
            </div>

          </div>
        </nav>

        {/* ══════════════════════════════════════════════════
            MAIN AREA
        ══════════════════════════════════════════════════ */}
        <div className="main">
          <header className="topbar" aria-label="Dashboard topbar">

            {/* Hamburger — mobile only */}
            <button className="tb-hamburger" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>

            <div className="tb-title-group">
              <div className="tb-page">{title}</div>
              <div className="tb-crumb">UniHealth › <b>{crumb}</b></div>
            </div>

            <div className="tb-gap" />

            {/* Search */}
            <div className="tb-search">
              <SearchBarBrand idPrefix="tb-search" />
              <input
                placeholder={topbarSearchPlaceholder ?? "Search patients, staff, facilities…"}
                value={topbarSearchValue ?? ""}
                onChange={(e) => onTopbarSearchChange?.(e.target.value)}
                onFocus={() => onTopbarSearchFocus?.()}
                onKeyDown={(e) => onTopbarSearchKeyDown?.(e)}
                aria-label="Global search"
              />
            </div>

            {/* Notification bell */}
            <button
              className="tb-btn"
              type="button"
              title="Notifications"
              aria-label={`Notifications${totalAlerts > 0 ? ` — ${totalAlerts} alerts` : ""}`}
              onClick={() => onTopbarNotificationsClick?.()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {totalAlerts > 0 && <div className="tb-dot" />}
            </button>

            {/* Shield status */}
            <button
              className="tb-btn"
              type="button"
              title="UniHealth Live Status"
              aria-label="System status"
              onClick={() => onTopbarStatusClick?.()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </button>

            <div className="tb-datepill">
              <span className="tb-date-txt">{dateText}</span>
              <span className="tb-time-txt">{timeText}</span>
            </div>

          </header>

          {/* Toast */}
          {toastMsg && (
            <div className="ds-toast" role="status" aria-live="polite">
              <div className="ds-toast-in">
                <span className="ds-toast-ico" aria-hidden><DashIcon icon="✦" /></span>
                <span>{toastMsg}</span>
                <button className="ds-toast-x" type="button" onClick={() => setToastMsg(null)} aria-label="Dismiss">✕</button>
              </div>
            </div>
          )}

          <main className="content" id="main-content">
            <div className="content-in">{children}</div>
          </main>
        </div>

      </div>
    </DashboardToastContext.Provider>
  );
}
