import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ToastFn = (message: string) => void;
const DashboardToastContext = createContext<null | ToastFn>(null);

export function useDashboardToast() {
  const ctx = useContext(DashboardToastContext);
  // Important: dashboards call this hook at the page component level, which is rendered
  // before any DashboardShell in the tree. So we provide a safe fallback that dispatches
  // a global event listened to by DashboardShell instances.
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
};

export type DashboardNavSection = {
  label: string;
  items: DashboardNavItem[];
};

export function DashboardShell(props: {
  title: string;
  crumb: string;
  portalSubtitle: string;
  userInitials: string;
  userName: string;
  userEmail: string;
  nav: DashboardNavSection[];
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  topbarSearchPlaceholder?: string;
  topbarSearchValue?: string;
  onTopbarSearchChange?: (value: string) => void;
  onTopbarSearchFocus?: () => void;
  onTopbarSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTopbarNotificationsClick?: () => void;
  onTopbarStatusClick?: () => void;
  children: React.ReactNode;
}) {
  const {
    title,
    crumb,
    portalSubtitle,
    userInitials,
    userName,
    userEmail,
    nav,
    activeNavId,
    onNavSelect,
    topbarSearchPlaceholder,
    topbarSearchValue,
    onTopbarSearchChange,
    onTopbarSearchFocus,
    onTopbarSearchKeyDown,
    onTopbarNotificationsClick,
    onTopbarStatusClick,
    children,
  } = props;

  const [dateText, setDateText] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    };
    setDateText(fmt());
    const id = window.setInterval(() => setDateText(fmt()), 30_000);
    return () => clearInterval(id);
  }, []);

  const searchIcon = useMemo(
    () => (
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#9ca3af" strokeWidth="2">
        <circle cx="9" cy="9" r="6" />
        <path d="m15 15-3-3" />
      </svg>
    ),
    []
  );

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

  return (
    <DashboardToastContext.Provider value={toast}>
      <div className="dash-shell">
      <nav className="sb" aria-label="Dashboard sidebar">
        <div className="sb-flag" />
        <div className="sb-in">
          <div className="sb-brand">
            <div className="sb-ico" aria-hidden>
              🏥
            </div>
            <div>
              <div className="sb-nm">UniHealth EHR</div>
              <div className="sb-sub">{portalSubtitle}</div>
            </div>
            <div className="sb-live" aria-label="Live" />
          </div>

          {nav.map((sec) => (
            <div className="sb-sec" key={sec.label}>
              <div className="sb-sec-lbl">{sec.label}</div>
              {sec.items.map((it, idx) => (
                <div
                  className={`ni${activeNavId ? (activeNavId === it.id ? " on" : "") : idx === 0 ? " on" : ""}`}
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavSelect?.(it.id)}
                  onKeyDown={(e) => {
                    if (!onNavSelect) return;
                    if (e.key === "Enter" || e.key === " ") onNavSelect(it.id);
                  }}
                >
                  <span className="ni-ico" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="ni-lbl">{it.label}</span>
                  {it.badge ? (
                    <span className={`ni-badge ${it.badge.tone}`}>{it.badge.text}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}

          <div className="sb-user">
            <div className="sb-av" aria-hidden>
              {userInitials}
            </div>
            <div>
              <div className="sb-un">{userName}</div>
              <div className="sb-ue">{userEmail}</div>
            </div>
            <button className="sb-signout" type="button">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="main">
        <header className="topbar" aria-label="Dashboard topbar">
          <div>
            <div className="tb-page">{title}</div>
            <div className="tb-crumb">
              UniHealth EHR › <b>{crumb}</b>
            </div>
          </div>
          <div className="tb-gap" />
          <div className="tb-search">
            {searchIcon}
            <input
              placeholder={topbarSearchPlaceholder ?? "Search patients, staff, facilities…"}
              value={topbarSearchValue ?? ""}
              onChange={(e) => onTopbarSearchChange?.(e.target.value)}
              onFocus={() => onTopbarSearchFocus?.()}
              onKeyDown={(e) => onTopbarSearchKeyDown?.(e)}
            />
          </div>
          <div className="tb-btn" title="Notifications" role="button" tabIndex={0} onClick={onTopbarNotificationsClick}>
            🔔<div className="tb-dot" />
          </div>
          <div className="tb-btn" title="UniHealth Live Status" role="button" tabIndex={0} onClick={onTopbarStatusClick}>
            🛡️
          </div>
          <div className="tb-datepill">{dateText}</div>
        </header>

        {toastMsg ? (
          <div className="ds-toast" role="status" aria-live="polite">
            <div className="ds-toast-in">
              <span className="ds-toast-ico" aria-hidden>
                ✅
              </span>
              <span>{toastMsg}</span>
              <button className="ds-toast-x" type="button" onClick={() => setToastMsg(null)} aria-label="Dismiss">
                ✕
              </button>
            </div>
          </div>
        ) : null}

        <main className="content">
          <div className="content-in">{children}</div>
        </main>
      </div>
      </div>
    </DashboardToastContext.Provider>
  );
}

