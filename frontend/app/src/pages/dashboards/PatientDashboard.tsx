import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { usePolling } from "../../hooks/usePolling";
import { DashboardShell } from "../../components/dashboard/DashboardShell";

function fmtWhen(d: Date, hhmm: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hhmm}`;
}

function parseWhenToDate(when: string): Date | null {
  // Expected formats in demo data: "15 Mar 2026 · 09:00"
  const m = when.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const year = Number(m[3]);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(mon);
  if (idx < 0) return null;
  const d = new Date(year, idx, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function nextWeekday(from: Date, weekday: number) {
  // weekday: 0=Sun..6=Sat. Returns a date >= from (but typically in future).
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (weekday - base.getDay() + 7) % 7;
  return addDays(base, delta === 0 ? 7 : delta);
}

function pickDefaultSelectedDay(now: Date, apptDates: Date[]) {
  const todayKey = ymd(now);
  const upcoming = apptDates
    .slice()
    .sort((a, b) => a.getTime() - b.getTime())
    .find((d) => ymd(d) >= todayKey);
  return upcoming ?? now;
}

function MonthCalendar(props: {
  monthCursor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  appointmentDates: Date[];
  onSelectDay?: (day: Date) => void;
}) {
  const { monthCursor, onPrevMonth, onNextMonth, appointmentDates, onSelectDay } = props;
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const monthLabel = useMemo(() => {
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
    return `${months[month]} ${year}`;
  }, [month, year]);

  const apptSet = useMemo(() => new Set(appointmentDates.map((d) => ymd(d))), [appointmentDates]);

  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const startDow = firstOfMonth.getDay(); // 0=Sun
  const gridStart = useMemo(() => {
    const d = new Date(firstOfMonth);
    d.setDate(d.getDate() - startDow);
    return d;
  }, [firstOfMonth, startDow]);

  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)), [gridStart]);

  const todayKey = useMemo(() => ymd(new Date()), []);

  return (
    <div className="cal">
      <div className="cal-hd">
        <button type="button" className="btn-s btn-sm" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <div className="cal-mo">{monthLabel}</div>
        <button type="button" className="btn-s btn-sm" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-dow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="cal-dow-it">
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid" role="grid" aria-label="Appointments calendar">
        {cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const key = ymd(d);
          const hasAppt = apptSet.has(key);
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              className={`cal-day${inMonth ? "" : " dim"}${hasAppt ? " appt" : ""}${isToday ? " today" : ""}`}
              onClick={() => onSelectDay?.(d)}
              aria-label={`${key}${hasAppt ? " has appointment" : ""}`}
            >
              <span>{d.getDate()}</span>
              {hasAppt ? <i className="cal-dot" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="cal-ft">
        <span className="cal-legend">
          <i className="cal-dot" aria-hidden /> Appointment day
        </span>
        <span className="cal-legend">
          <i className="cal-today" aria-hidden /> Today
        </span>
      </div>
    </div>
  );
}

type PatientPage =
  | "home"
  | "appointments"
  | "visits"
  | "results"
  | "medications"
  | "vitals"
  | "coverage"
  | "contributions"
  | "bills"
  | "payments"
  | "records"
  | "documents"
  | "profile"
  | "consent";

const PATIENT_TITLES: Record<PatientPage, string> = {
  home: "My Dashboard",
  appointments: "Appointments",
  visits: "Visit History",
  results: "Test Results",
  medications: "Medications",
  vitals: "Vitals & Trends",
  coverage: "My UniHealth Cover",
  contributions: "Contributions",
  bills: "Bills & Invoices",
  payments: "Make a Payment",
  records: "Health Records",
  documents: "Documents",
  profile: "My Profile",
  consent: "Privacy & Consent",
};

const PATIENT_CRUMBS: Record<PatientPage, string> = {
  home: "Home",
  appointments: "Health › Appointments",
  visits: "Health › Visits",
  results: "Health › Results",
  medications: "Health › Medications",
  vitals: "Health › Vitals",
  coverage: "Payments › UniHealth Cover",
  contributions: "Payments › Contributions",
  bills: "Payments › Bills",
  payments: "Payments › Pay Now",
  records: "Records › Health Records",
  documents: "Records › Documents",
  profile: "Account › Profile",
  consent: "Privacy › Consent",
};

function pgOn(active: boolean) {
  return `pg${active ? " on" : ""}`;
}

export function PatientDashboard() {
  const [patientId, setPatientId] = useState("P001");
  const summary = usePolling(() => api.patientSummary(patientId, 5), { intervalMs: 7000 });
  const meds = usePolling(() => api.medicationRequests(patientId, 20), { intervalMs: 10000 });
  const obs = usePolling(() => api.observations(patientId, 30), { intervalMs: 6000 });

  const [page, setPage] = useState<PatientPage>("home");
  const [topPanel, setTopPanel] = useState<"none" | "search" | "notifications">("none");
  const [searchQuery, setSearchQuery] = useState("");

  const appts = useMemo(
    () => {
      // Demo schedule generator: always show the next two realistic appointments relative to "now".
      const now = new Date();
      const d1 = nextWeekday(now, 3); // next Wednesday
      const d2 = addDays(d1, 7); // following week
      return [
        { when: fmtWhen(d1, "09:00"), where: "KNH Nairobi", dept: "Cardiology", tag: "g" as const },
        { when: fmtWhen(d2, "14:00"), where: "Coast General Hospital", dept: "Follow-up", tag: "am" as const },
      ];
    },
    []
  );

  const visits = useMemo(
    () => [
      { when: "04 Mar 2026", fac: "KNH Nairobi", type: "Outpatient", dept: "Cardiology", ref: "ENC-2026-1042" },
      { when: "12 Feb 2026", fac: "KNH Lab", type: "Lab", dept: "Phlebotomy", ref: "LAB-2026-0091" },
      { when: "03 Jan 2026", fac: "Coast General", type: "Inpatient", dept: "Internal Medicine", ref: "IP-2025-8831" },
    ],
    []
  );

  const heroFirstName = useMemo(() => {
    const g = summary.data?.patient.given_name?.trim();
    if (g) return g;
    return "there";
  }, [summary.data?.patient.given_name]);

  const displayAflId = `AFL-2024-KE-${patientId.replace(/\W/g, "").toUpperCase() || "78841209"}`;

  const apptDates = useMemo(() => appts.map((a) => parseWhenToDate(a.when)).filter((d): d is Date => !!d), [appts]);
  const [apptMonthCursor, setApptMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedApptDay, setSelectedApptDay] = useState<Date | null>(() => pickDefaultSelectedDay(new Date(), apptDates));

  useEffect(() => {
    if (page !== "appointments") return;
    const now = new Date();
    const defaultSelected = pickDefaultSelectedDay(now, apptDates);
    setSelectedApptDay((cur) => cur ?? defaultSelected);
    setApptMonthCursor((cur) => {
      // Keep calendar grounded: if user hasn't navigated away from the current period,
      // default to the month containing the upcoming appointment (or current month).
      const desired = startOfMonth(defaultSelected);
      if (isSameMonth(cur, desired)) return cur;
      // If current cursor month is neither now nor the desired appointment month, snap to desired.
      const curIsNow = isSameMonth(cur, now);
      const curIsDesired = isSameMonth(cur, desired);
      if (curIsNow || curIsDesired) return cur;
      return desired;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, apptDates.length]);

  const searchItems = useMemo(
    () =>
      [
        { key: "appointments", label: "Appointments", sub: "Scheduling · Book, view and manage appointments", page: "appointments" as PatientPage, icon: "📅" },
        { key: "visits", label: "Visit History", sub: "Clinical history · Encounters and facilities", page: "visits" as PatientPage, icon: "🏥" },
        { key: "results", label: "Test Results", sub: "Laboratory · Observations and diagnostics", page: "results" as PatientPage, icon: "🧪" },
        { key: "medications", label: "Medications", sub: "Pharmacy · Active prescriptions", page: "medications" as PatientPage, icon: "💊" },
        { key: "vitals", label: "Vitals & Trends", sub: "Monitoring · Latest vitals and charts", page: "vitals" as PatientPage, icon: "💗" },
        { key: "coverage", label: "My UniHealth Cover", sub: "Payments · Benefits and claims", page: "coverage" as PatientPage, icon: "🛡️" },
        { key: "contributions", label: "Contributions", sub: "Payments · Monthly payment history", page: "contributions" as PatientPage, icon: "💳" },
        { key: "bills", label: "Bills & Invoices", sub: "Finance · Statements and invoices", page: "bills" as PatientPage, icon: "📄" },
        { key: "payments", label: "Make a Payment", sub: "Payments · Methods and recent transactions", page: "payments" as PatientPage, icon: "📱" },
        { key: "records", label: "Health Records", sub: "Records · Longitudinal record", page: "records" as PatientPage, icon: "📂" },
        { key: "documents", label: "Documents", sub: "Records · Reports and files", page: "documents" as PatientPage, icon: "📋" },
        { key: "profile", label: "My Profile", sub: "Account · Personal details", page: "profile" as PatientPage, icon: "👤" },
        { key: "consent", label: "Privacy & Consent", sub: "Privacy · KDPA 2019 controls", page: "consent" as PatientPage, icon: "🔐" },
      ] as const,
    []
  );

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchItems;
    return searchItems.filter((x) => (x.label + " " + x.sub).toLowerCase().includes(q));
  }, [searchItems, searchQuery]);

  const notifications = useMemo(
    () => [
      { icon: "🧪", title: "New lab result posted", sub: "Potassium (K⁺) flagged high · Review details in Test Results", go: "results" as PatientPage, time: "2m" },
      { icon: "📅", title: "Appointment reminder", sub: "KNH Cardiology · 15 Mar 2026 · 09:00", go: "appointments" as PatientPage, time: "1h" },
      { icon: "💳", title: "Contribution due", sub: "Ksh 500 due by 31 Mar 2026", go: "contributions" as PatientPage, time: "2d" },
    ],
    []
  );

  return (
    <DashboardShell
      title={PATIENT_TITLES[page]}
      crumb={PATIENT_CRUMBS[page]}
      portalSubtitle="Patient Portal · UniHealth"
      userInitials="PM"
      userName="P. Mutiso"
      userEmail="p.mutiso@example.com"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as PatientPage)}
      topbarSearchPlaceholder="Search records, results, bills…"
      topbarSearchValue={searchQuery}
      onTopbarSearchChange={(v) => {
        setSearchQuery(v);
        if (topPanel !== "search") setTopPanel("search");
      }}
      onTopbarSearchFocus={() => setTopPanel("search")}
      onTopbarSearchKeyDown={(e) => {
        if (e.key === "Escape") setTopPanel("none");
        if (e.key === "Enter") {
          const first = filteredSearchItems[0];
          if (first) {
            setPage(first.page);
            setTopPanel("none");
          }
        }
      }}
      onTopbarNotificationsClick={() => setTopPanel((p) => (p === "notifications" ? "none" : "notifications"))}
      onTopbarStatusClick={() => setPage("coverage")}
      nav={[
        {
          label: "My Health",
          items: [
            { id: "home", icon: "🏠", label: "My Dashboard" },
            { id: "appointments", icon: "📅", label: "Appointments", badge: { text: "2", tone: "amber" } },
            { id: "visits", icon: "🏥", label: "Visit History" },
            { id: "results", icon: "🧪", label: "Test Results" },
            { id: "medications", icon: "💊", label: "Medications" },
            { id: "vitals", icon: "💗", label: "Vitals & Trends" },
          ],
        },
        {
          label: "Payments",
          items: [
            { id: "coverage", icon: "🛡️", label: "My UniHealth Cover" },
            { id: "contributions", icon: "💳", label: "Contributions" },
            { id: "bills", icon: "📄", label: "Bills & Invoices" },
            { id: "payments", icon: "📱", label: "Make a Payment" },
          ],
        },
        {
          label: "Privacy & Security",
          items: [{ id: "consent", icon: "🔐", label: "Privacy & Consent" }],
        },
        {
          label: "My Records",
          items: [
            { id: "records", icon: "📂", label: "Health Records" },
            { id: "documents", icon: "📋", label: "Documents" },
            { id: "profile", icon: "👤", label: "My Profile" },
          ],
        },
      ]}
    >
      <div className="patient">
        {topPanel !== "none" && (
          <div className="overlay-panel" aria-live="polite">
            <div className="overlay-panel-in">
              <div className="overlay-hd">
                <div className="overlay-ti">{topPanel === "search" ? "Search" : "Notifications"}</div>
                <button className="btn-s btn-sm" type="button" onClick={() => setTopPanel("none")}>
                  Close
                </button>
              </div>
              <div className="overlay-bd">
                {topPanel === "search" ? (
                  <>
                    <div style={{ marginBottom: 10, fontSize: 11, color: "var(--t3)" }}>
                      Tip: press <span className="mono">Enter</span> to open the first match, <span className="mono">Esc</span> to close.
                    </div>
                    {filteredSearchItems.slice(0, 10).map((x) => (
                      <div
                        key={x.key}
                        className="ov-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setPage(x.page);
                          setTopPanel("none");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setPage(x.page);
                            setTopPanel("none");
                          }
                        }}
                      >
                        <div className="ov-ico" aria-hidden>
                          {x.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ov-title">{x.label}</div>
                          <div className="ov-sub">{x.sub}</div>
                        </div>
                        <div className="ov-k">Go →</div>
                      </div>
                    ))}
                    {filteredSearchItems.length === 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No matches. Try “results”, “bills”, or “consent”.</div>
                    )}
                  </>
                ) : (
                  <>
                    {notifications.map((n, idx) => (
                      <div
                        key={idx}
                        className="ov-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setPage(n.go);
                          setTopPanel("none");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setPage(n.go);
                            setTopPanel("none");
                          }
                        }}
                      >
                        <div className="ov-ico" aria-hidden>
                          {n.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ov-title">{n.title}</div>
                          <div className="ov-sub">{n.sub}</div>
                        </div>
                        <div className="ov-k">{n.time}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-s btn-sm" type="button" onClick={() => setTopPanel("none")}>
                        Mark all as read
                      </button>
                      <button className="btn-p btn-sm" type="button" onClick={() => setPage("results")}>
                        Review results
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={pgOn(page === "home")} id="pg-home">
          <div className="hero">
            <div className="hero-in">
              <div className="hero-top">
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: 2,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Your health at a glance
                  </div>
                  <div className="hero-greet">
                    Good morning, <em>{heroFirstName}</em> 👋
                  </div>
                  <div className="hero-sub">All your health information, in one secure place.</div>
                </div>
                <div className="hero-ids">
                  <div className="id-pill">
                    <b>AFL-ID:</b> {displayAflId}
                  </div>
                  <div className="id-pill">
                    <b>Member:</b> AFL-MBR-884321
                  </div>
                  <div className="id-pill">
                    <b>Cover:</b> UniHealth Active ✅
                  </div>
                </div>
              </div>
              <div className="hero-stats">
                <div className="hs">
                  <div className="hs-v">7</div>
                  <div className="hs-l">Visits this year</div>
                </div>
                <div className="hs">
                  <div className="hs-v" style={{ color: "#7beba4" }}>
                    Ksh 0
                  </div>
                  <div className="hs-l">Outstanding bills</div>
                </div>
                <div className="hs">
                  <div className="hs-v">2</div>
                  <div className="hs-l">Upcoming appts</div>
                </div>
                <div className="hs">
                  <div className="hs-v" style={{ color: "#7beba4" }}>
                    Active
                  </div>
                  <div className="hs-l">Cover status</div>
                </div>
              </div>
            </div>
          </div>

          <div className="qas">
            <button type="button" className="qa" onClick={() => setPage("appointments")}>
              <span className="qa-e">📅</span>
              <span className="qa-l">Book Appointment</span>
              <span className="qa-dot" />
            </button>
            <button type="button" className="qa" onClick={() => setPage("results")}>
              <span className="qa-e">🧪</span>
              <span className="qa-l">Test Results</span>
            </button>
            <button type="button" className="qa" onClick={() => setPage("payments")}>
              <span className="qa-e">📱</span>
              <span className="qa-l">Make a Payment</span>
            </button>
            <button type="button" className="qa" onClick={() => setPage("records")}>
              <span className="qa-e">📂</span>
              <span className="qa-l">My Records</span>
            </button>
            <button type="button" className="qa">
              <span className="qa-e">💬</span>
              <span className="qa-l">Message Doctor</span>
            </button>
          </div>

          <div className="demo-id-bar">
            <label htmlFor="pat-demo-id">Gateway patient ID</label>
            <input
              id="pat-demo-id"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. P001"
              autoComplete="off"
            />
            <span className="tag g dot">LIVE</span>
          </div>

          {(summary.error || meds.error || obs.error) && (
            <div className="errbanner is-visible" role="alert">
              <span>⚠️</span>
              <span>
                {summary.error ?? meds.error ?? obs.error} (Start the API and try <code>P001</code>.)
              </span>
            </div>
          )}

          <div className="g2">
            <div>
              <div className="ai-widget green" style={{ animationDelay: ".1s" }}>
                <div className="ai-widget-hd">
                  <div>
                    <div className="ai-widget-ti">
                      🤖 AI Health Insights — {summary.data ? `${summary.data.patient.given_name ?? "You"}` : "Demo patient"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 2 }}>
                      Personalised analysis based on your latest results & vitals
                    </div>
                  </div>
                  <span className="kdpa-badge">🔒 KDPA 2019</span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico">⚠️</span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Potassium levels require follow-up</div>
                    <div className="ai-row-su">
                      Your latest test (K⁺ 6.8 mmol/L, 2 Apr 2026) is above the safe range. Your doctor has been notified. Please attend your
                      follow-up appointment on <strong>10 Apr 2026</strong>.
                    </div>
                  </div>
                  <span className="tag r" style={{ flexShrink: 0, marginTop: 2 }}>
                    ACTION NEEDED
                  </span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico">💊</span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Medication refill due in 5 days</div>
                    <div className="ai-row-su">
                      Amlodipine 10mg and Lisinopril 10mg are due for refill by 15 Apr 2026. Request a repeat prescription from your nearest UniHealth
                      facility or via this portal.
                    </div>
                  </div>
                  <span className="tag am" style={{ flexShrink: 0, marginTop: 2 }}>
                    REMINDER
                  </span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico">💡</span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Preventive care: annual eye check overdue</div>
                    <div className="ai-row-su">
                      As a patient with hypertension risk factors, an annual fundoscopy is recommended. Book via your UniHealth cover (optical benefit:
                      Ksh 3,500 remaining).
                    </div>
                  </div>
                  <span className="tag b" style={{ flexShrink: 0, marginTop: 2 }}>
                    PREVENTIVE
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(10,74,38,.05)",
                    border: "1px solid rgba(10,74,38,.1)",
                    borderRadius: 7,
                    fontSize: 10.5,
                    color: "var(--gd)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  🔒 AI insights are generated from your own health records only. Your data is never shared without your consent (KDPA 2019).
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 16, animationDelay: ".06s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Upcoming Appointments</div>
                    <div className="pnl-su">Next 30 days</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("appointments")}>
                    Book new →
                  </span>
                </div>
                <div className="pnl-bd">
                  {appts.map((a) => (
                    <div
                      key={a.when}
                      style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--bdr)" }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--t1)" }}>{a.dept}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                          {a.where} · <span className="mono">{a.when}</span>
                        </div>
                      </div>
                      <span className={`tag ${a.tag}`}>{a.tag === "g" ? "Confirmed" : "Pending"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 16, animationDelay: ".1s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Active Medications</div>
                    <div className="pnl-su">Current prescriptions · gateway</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("medications")}>
                    All meds →
                  </span>
                </div>
                <div className="pnl-bd">
                  {(meds.data ?? []).slice(0, 5).map((m) => (
                    <div className="med" key={m.id}>
                      <div className="med-ico" style={{ background: "var(--gl)", border: "1px solid var(--gm)" }}>
                        💊
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="med-name">{m.medication_code ?? "Medication"}</div>
                        <div className="med-dose">{m.dosage_text ?? "—"}</div>
                        <div className="med-ref">
                          Request ID: <span className="mono">{m.id}</span>
                        </div>
                      </div>
                      <div className="med-next" style={{ color: "var(--t3)" }}>
                        {m.status ?? "—"}
                      </div>
                    </div>
                  ))}
                  {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No medication requests found for this ID.</div>
                  )}
                </div>
              </div>

              <div className="panel" style={{ animationDelay: ".14s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Recent Test Results</div>
                    <div className="pnl-su">Latest lab work & observations</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("results")}>
                    All results →
                  </span>
                </div>
                <div className="pnl-bd">
                  {(obs.data ?? []).slice(0, 4).map((o) => (
                    <div key={o.id} className="res" onClick={() => setPage("results")} role="presentation">
                      <span className="res-ind norm" />
                      <div>
                        <div className="res-name">{o.code ?? "Observation"}</div>
                        <div className="res-range">{o.effective_time ?? "—"}</div>
                      </div>
                      <div className="res-val norm">{(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}</div>
                    </div>
                  ))}
                  {(obs.data?.length ?? 0) === 0 && !obs.loading && (
                    <>
                      <div className="res" onClick={() => setPage("results")} role="presentation">
                        <span className="res-ind high" />
                        <div>
                          <div className="res-name">Potassium (K⁺)</div>
                          <div className="res-range">Ref: 3.5–5.1 mmol/L</div>
                        </div>
                        <div className="res-val high">6.8</div>
                        <div className="res-dt">2 Apr</div>
                      </div>
                      <div className="res" onClick={() => setPage("results")} role="presentation">
                        <span className="res-ind norm" />
                        <div>
                          <div className="res-name">LDL Cholesterol</div>
                          <div className="res-range">{"Ref: < 3.0 mmol/L"}</div>
                        </div>
                        <div className="res-val high">3.4</div>
                        <div className="res-dt">4 Mar</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="cover-card patient-card-in" style={{ marginBottom: 16, animationDelay: ".08s" }}>
                <div className="cover-top">
                  <div className="cover-emblem">🛡️</div>
                  <div className="cover-in">
                    <div className="cover-lbl">UniHealth Annual Cover Balance</div>
                    <div className="cover-amt">Ksh 48,200</div>
                    <div className="cover-sub">of Ksh 50,000 remaining · FY 2025/26</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <div className="cover-chip">✅ Cover Active</div>
                      <div className="cover-chip">AFL-MBR-884321</div>
                      <div className="cover-chip">M-TIBA Linked</div>
                    </div>
                  </div>
                </div>
                <div className="cover-bot">
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--t3)", marginBottom: 4 }}>
                      <span>Used: Ksh 1,800</span>
                      <span>Ksh 48,200 left</span>
                    </div>
                    <div className="pbar">
                      <div className="pbar-f" style={{ width: "96.4%", background: "var(--g)" }} />
                    </div>
                  </div>
                  <div className="cover-limits">
                    <div className="cover-lim">
                      <div className="cv-v" style={{ color: "var(--g)" }}>
                        Ksh 25K
                      </div>
                      <div className="cv-l">Inpatient limit</div>
                      <div className="pbar" style={{ marginTop: 5 }}>
                        <div className="pbar-f" style={{ width: "90%", background: "var(--g)" }} />
                      </div>
                    </div>
                    <div className="cover-lim">
                      <div className="cv-v" style={{ color: "var(--b)" }}>
                        Ksh 15K
                      </div>
                      <div className="cv-l">Outpatient limit</div>
                      <div className="pbar" style={{ marginTop: 5 }}>
                        <div className="pbar-f" style={{ width: "88%", background: "var(--b)" }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 11, display: "flex", gap: 7 }}>
                    <button type="button" className="btn-s btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPage("coverage")}>
                      View Cover
                    </button>
                    <button type="button" className="btn-p btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPage("contributions")}>
                      Contributions
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel patient-card-in" style={{ marginBottom: 16, animationDelay: ".12s" }}>
                <div className="pnl-hd">
                  <div className="pnl-ti">Health Score</div>
                  <span className="pnl-lk">About this</span>
                </div>
                <div className="pnl-bd">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div className="ring-wrap">
                      <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden>
                        <circle className="ring-track" cx="45" cy="45" r="37" strokeDasharray="232" strokeDashoffset="0" />
                        <circle className="ring-fill" cx="45" cy="45" r="37" strokeDasharray="232" strokeDashoffset="51" />
                      </svg>
                      <div className="ring-lbl">
                        <div className="ring-num">78</div>
                        <div className="ring-max">/100</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g)", marginBottom: 5 }}>Good</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6 }}>Based on vitals, visit history and medication adherence.</div>
                    </div>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Medication adherence</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "90%", background: "var(--g)" }} />
                    </div>
                    <span className="prog-val">90%</span>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Appointment attendance</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "75%", background: "var(--b)" }} />
                    </div>
                    <span className="prog-val">75%</span>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Screenings up to date</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "60%", background: "var(--am)" }} />
                    </div>
                    <span className="prog-val">60%</span>
                  </div>
                </div>
              </div>

              <div className="ref-card patient-card-in" style={{ animationDelay: ".16s" }}>
                <div className="ref-ico">📋</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e3a8a", marginBottom: 3 }}>Active Referral</div>
                  <div style={{ fontSize: 11, color: "#2563eb", lineHeight: 1.5 }}>
                    Dr. Amina Wanjiru referred you to <strong>KNH Cardiology</strong> on 28 Feb 2026.
                    <br />
                    Appointment: 15 Mar 2026 at 10:00 AM
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn-s btn-sm" onClick={() => setPage("appointments")}>
                      View referral →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "appointments")} id="pg-appointments">
          <div className="ph">
            <div>
              <div className="ph-ey">Scheduling</div>
              <div className="ph-ti">My Appointments</div>
              <div className="ph-su">Book, view and manage your clinic visits</div>
            </div>
            <button className="btn-p" type="button">
              + Book Appointment
            </button>
          </div>
          <div className="notice g">
            <span className="notice-ico">📅</span>
            <div className="notice-txt">
              You have <strong>{appts.length} upcoming appointment{appts.length === 1 ? "" : "s"}</strong> — next on{" "}
              <strong>{appts[0]?.when ?? "—"}</strong>.
            </div>
          </div>
          <div className="g2">
            <div>
              <div className="g2e" style={{ marginBottom: 16 }}>
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-ti">Upcoming</div>
                  </div>
                  <div className="pnl-bd">
                    {appts.map((a) => (
                      <div
                        key={a.when}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const d = parseWhenToDate(a.when);
                          if (d) {
                            setSelectedApptDay(d);
                            setApptMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          const d = parseWhenToDate(a.when);
                          if (d) {
                            setSelectedApptDay(d);
                            setApptMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                          }
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "10px 0",
                          borderBottom: "1px solid var(--bdr)",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{a.dept}</div>
                          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                            {a.where} · <span className="mono">{a.when}</span>
                          </div>
                        </div>
                        <span className={`tag ${a.tag}`}>{a.tag === "g" ? "Confirmed" : "Pending"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-ti">Past Appointments</div>
                  </div>
                  <div className="pnl-bd">
                    <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No past appointments in the selected range (demo).</div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Book at a Facility</div>
                    <div className="pnl-su">UniHealth-accredited facilities near you</div>
                  </div>
                </div>
                <div className="pnl-bd">
                  <div style={{ fontSize: 12.5, color: "var(--t2)" }}>
                    KNH Nairobi · Coast General Hospital · Aga Khan University Hospital (demo list).
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="panel" style={{ position: "sticky", top: 10 }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Calendar</div>
                    <div className="pnl-su">Appointment dates highlighted</div>
                  </div>
                  {selectedApptDay ? <span className="tag g dot">{selectedApptDay.toDateString().slice(4, 10)}</span> : null}
                </div>
                <div className="pnl-bd">
                  <MonthCalendar
                    monthCursor={apptMonthCursor}
                    onPrevMonth={() => setApptMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    onNextMonth={() => setApptMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    appointmentDates={apptDates}
                    onSelectDay={(d) => setSelectedApptDay(d)}
                  />

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "var(--t2)", marginBottom: 6 }}>Selected day</div>
                    <div style={{ fontSize: 12.5, color: "var(--t1)", lineHeight: 1.5 }}>
                      {selectedApptDay ? (
                        <>
                          <span className="mono">{ymd(selectedApptDay)}</span>
                          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                            {(appts.filter((a) => {
                              const d = parseWhenToDate(a.when);
                              return d ? ymd(d) === ymd(selectedApptDay) : false;
                            }) ?? []
                            ).length > 0
                              ? "Appointments available for this date."
                              : "No appointments on this date."}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "var(--t3)" }}>Pick a day in the calendar.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "visits")} id="pg-visits">
          <div className="ph">
            <div>
              <div className="ph-ey">Clinical History</div>
              <div className="ph-ti">Visit History</div>
              <div className="ph-su">All hospital and clinic visits linked to your UniHealth record</div>
            </div>
            <button className="btn-s" type="button">
              📥 Export Records
            </button>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">All Visits</div>
                <div className="pnl-su">UniHealth verified · Demo rows</div>
              </div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Facility</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th className="mono">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.ref}>
                      <td className="mono">{v.when}</td>
                      <td style={{ fontWeight: 700 }}>{v.fac}</td>
                      <td>{v.type}</td>
                      <td>{v.dept}</td>
                      <td className="mono">{v.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "results")} id="pg-results">
          <div className="ph">
            <div>
              <div className="ph-ey">Laboratory</div>
              <div className="ph-ti">Test Results</div>
              <div className="ph-su">Lab results, imaging and diagnostics</div>
            </div>
            <button className="btn-s" type="button">
              📥 Download
            </button>
          </div>
          <div className="notice am">
            <span className="notice-ico">⚠️</span>
            <div className="notice-txt">
              <strong>1 result needs attention:</strong> LDL Cholesterol is above the normal range. Please discuss with your doctor at your next visit.
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Observations · {patientId}</div>
                <span className="pnl-lk" onClick={() => setPage("vitals")}>
                  Vitals →
                </span>
              </div>
              <div className="pnl-bd">
                {obs.error && (
                  <div className="errbanner is-visible" role="alert">
                    <span>⚠️</span>
                    <span>{obs.error}</span>
                  </div>
                )}
                {(obs.data ?? []).slice(0, 12).map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--bdr)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{o.code ?? "Observation"}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--gd)" }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No observation results for this patient yet.</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Previous Results</div>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>HbA1c</strong> — 5.6% <span className="tag g">Normal</span> · Feb 2026
                  </div>
                  <div>
                    <strong>Chest X-ray</strong> — No acute findings <span className="tag g">Reported</span> · Jan 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "medications")} id="pg-medications">
          <div className="ph">
            <div>
              <div className="ph-ey">Pharmacy</div>
              <div className="ph-ti">My Medications</div>
              <div className="ph-su">Current prescriptions, dosage schedules and refills</div>
            </div>
            <button className="btn-s" type="button">
              📥 Print List
            </button>
          </div>
          <div className="notice b">
            <span className="notice-ico">💊</span>
            <div className="notice-txt">
              <strong>Refill reminder:</strong> Amlodipine 5mg is due for refill in 5 days. Request at any UniHealth-accredited pharmacy.
            </div>
          </div>
          <div className="g2e">
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Active Prescriptions</div>
              </div>
              <div className="pnl-bd">
                {(meds.data ?? []).map((m) => (
                  <div className="med" key={m.id}>
                    <div className="med-ico" style={{ background: "var(--gl)", border: "1px solid var(--gm)" }}>
                      💊
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="med-name">{m.medication_code ?? "Medication"}</div>
                      <div className="med-dose">{m.dosage_text ?? "—"}</div>
                      <div className="med-ref">
                        <span className="mono">{m.id}</span> · {m.status ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
                {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No active prescriptions from the gateway for this ID.</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Completed / Archived</div>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 11.5, color: "var(--t3)" }}>Archived medications appear here after course completion (demo).</div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "vitals")} id="pg-vitals">
          <div className="ph">
            <div>
              <div className="ph-ey">Health Monitoring</div>
              <div className="ph-ti">Vitals & Trends</div>
              <div className="ph-su">Live observations for {patientId} · polled every 6s</div>
            </div>
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div className="pnl-ti">Patient ID</div>
            </div>
            <div className="pnl-bd">
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. P001"
                autoComplete="off"
                className="mono"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--bdr)",
                  background: "var(--bg)",
                  outline: "none",
                }}
              />
            </div>
          </div>
          {obs.error && (
            <div className="errbanner is-visible" role="alert">
              <span>⚠️</span>
              <span>{obs.error}</span>
            </div>
          )}
          <div className="g4" style={{ marginBottom: 16 }}>
            {(obs.data ?? []).slice(0, 8).map((o) => (
              <div key={o.id} className="vital">
                <div className="vital-e">📊</div>
                <div className="vital-v">
                  {o.value_text ?? "—"}
                  {o.unit ? <span className="vital-u">{o.unit}</span> : null}
                </div>
                <div className="vital-l">{o.code ?? "Observation"}</div>
                <div className="vital-s">
                  <span className="tag g dot">Recorded</span>
                </div>
              </div>
            ))}
            {(obs.data?.length ?? 0) === 0 && !obs.loading && (
              <>
                {[
                  { e: "🩸", v: "120/80", u: "mmHg", l: "Blood Pressure" },
                  { e: "💗", v: "72", u: "bpm", l: "Heart Rate" },
                  { e: "🌡️", v: "36.8", u: "°C", l: "Temperature" },
                  { e: "🩺", v: "98.5", u: "% SpO₂", l: "Oxygen" },
                ].map((x) => (
                  <div key={x.l} className="vital">
                    <div className="vital-e">{x.e}</div>
                    <div className="vital-v">
                      {x.v}
                      <span className="vital-u">{x.u}</span>
                    </div>
                    <div className="vital-l">{x.l}</div>
                    <div className="vital-s">
                      <span className="tag g dot">Normal</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Blood Pressure Trend — Last 6 Months</div>
            </div>
            <div className="pnl-bd">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64, marginBottom: 8 }}>
                {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m, i) => (
                  <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: "100%",
                        background: "linear-gradient(to top, var(--gd), var(--g))",
                        borderRadius: 3,
                        height: 46 - i * 2,
                        ...(m === "Mar" ? { border: "2px solid var(--g)" } : {}),
                      }}
                    />
                    <span style={{ fontSize: 9.5, color: m === "Mar" ? "var(--g)" : "var(--t3)", fontWeight: m === "Mar" ? 700 : 400 }}>
                      {m}
                      {m === "Mar" ? " ✓" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>Systolic (mmHg) — trending down · Improving</div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "coverage")} id="pg-coverage">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth Health Cover</div>
              <div className="ph-ti">My UniHealth Cover</div>
              <div className="ph-su">Your benefits, limits and claims — AFL-MBR-884321</div>
            </div>
            <button className="btn-p" type="button">
              🔗 Link Account
            </button>
          </div>
          <div className="g3" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>Ksh 48,200</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Balance remaining this year</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag g dot">Cover Active</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--b)" }}>Ksh 1,800</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Used so far this year</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag b">3 claims processed</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--am)" }}>31 Mar 2026</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Cover year renewal date</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag am">21 days left</span>
                </div>
              </div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Benefit Limits</div>
                  <div className="pnl-su">FY 2025/26</div>
                </div>
              </div>
              <div className="pnl-bd">
                {[
                  { l: "Inpatient Cover", w: 90, c: "var(--g)", t: "Ksh 22,500 / 25,000" },
                  { l: "Outpatient Cover", w: 88, c: "var(--b)", t: "Ksh 13,200 / 15,000" },
                ].map((b) => (
                  <div key={b.l} style={{ marginBottom: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--t1)", marginBottom: 5 }}>
                      <span>{b.l}</span>
                      <span style={{ color: b.c }}>{b.t}</span>
                    </div>
                    <div className="pbar" style={{ height: 6 }}>
                      <div className="pbar-f" style={{ width: `${b.w}%`, background: b.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Recent UniHealth Claims</div>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Claim No.</th>
                      <th>Facility</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono">AFL-CLM-2026-0012</td>
                      <td>KNH Outpatient</td>
                      <td>Ksh 1,200</td>
                      <td>
                        <span className="tag g">Approved</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="mono">AFL-CLM-2025-8841</td>
                      <td>Coast General</td>
                      <td>Ksh 600</td>
                      <td>
                        <span className="tag g">Approved</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "contributions")} id="pg-contributions">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth Health Cover</div>
              <div className="ph-ti">My Contributions</div>
              <div className="ph-su">Monthly UniHealth health cover payment history</div>
            </div>
            <div className="ph-r">
              <button className="btn-s" type="button">
                📥 Statement
              </button>
              <button className="btn-p" type="button">
                + Make Contribution
              </button>
            </div>
          </div>
          <div className="g3" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--t1)" }}>Ksh 5,500</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Total contributions · FY 2025/26</div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag g">11 months paid</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>Up to Date</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Next payment: 31 March 2026</div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag g dot">Ksh 500 due</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--t1)" }}>3 years</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Total UniHealth membership</div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag b">Since Jan 2023</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Contribution History</div>
                <div className="pnl-su">Payments via M-PESA, Payroll or Bank</div>
              </div>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono">28 Feb 2026</td>
                    <td>M-PESA</td>
                    <td>Ksh 500</td>
                    <td>
                      <span className="tag g">Cleared</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="mono">28 Jan 2026</td>
                    <td>Payroll</td>
                    <td>Ksh 500</td>
                    <td>
                      <span className="tag g">Cleared</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Pay Your Contribution</div>
                <div className="pnl-su">Ksh 500 due by 31 March 2026</div>
              </div>
            </div>
            <div className="pnl-bd">
              <div className="pay-m">
                <div className="pay-logo" style={{ background: "#00b300" }}>
                  💚
                </div>
                <div>
                  <div className="pay-name">M-PESA Paybill</div>
                  <div className="pay-desc">Paybill: 400100 · Account: UniHealth Health</div>
                </div>
                <span className="pay-arr">›</span>
              </div>
              <div className="pay-m">
                <div className="pay-logo" style={{ background: "var(--b)" }}>
                  🏦
                </div>
                <div>
                  <div className="pay-name">Bank Transfer (PESALINK)</div>
                  <div className="pay-desc">Equity, KCB, NCBA, Co-op — all PESALINK banks</div>
                </div>
                <span className="pay-arr">›</span>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "bills")} id="pg-bills">
          <div className="ph">
            <div>
              <div className="ph-ey">Finance</div>
              <div className="ph-ti">Bills & Invoices</div>
              <div className="ph-su">All charges, cover payments and outstanding bills</div>
            </div>
            <button className="btn-s" type="button">
              📥 Download Statement
            </button>
          </div>
          <div className="notice g">
            <span className="notice-ico">✅</span>
            <div className="notice-txt">
              <strong>All clear!</strong> You have no outstanding bills. Your UniHealth cover has settled all recent charges.
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Billing History</div>
              <div className="pnl-su">UniHealth-settled and out-of-pocket payments</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="mono">04 Mar 2026</td>
                    <td>Cardiology consult</td>
                    <td>Ksh 0</td>
                    <td>
                      <span className="tag te">Covered</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "payments")} id="pg-payments">
          <div className="ph">
            <div>
              <div className="ph-ey">Payments</div>
              <div className="ph-ti">Make a Payment</div>
              <div className="ph-su">Pay bills, contributions or top up your M-TIBA wallet</div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Payment Methods</div>
              </div>
              <div className="pnl-bd">
                <div className="pay-m">
                  <div className="pay-logo" style={{ background: "#00b300" }}>
                    💚
                  </div>
                  <div>
                    <div className="pay-name">M-PESA</div>
                    <div className="pay-desc">Safaricom M-PESA paybill or STK push</div>
                  </div>
                  <span className="pay-arr">›</span>
                </div>
                <div className="pay-m">
                  <div className="pay-logo" style={{ background: "#e8490a" }}>
                    🟠
                  </div>
                  <div>
                    <div className="pay-name">M-TIBA Health Wallet</div>
                    <div className="pay-desc">Balance: Ksh 3,200 available</div>
                  </div>
                  <span className="pay-arr">›</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Recent Transactions</div>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono">01 Mar 2026</td>
                      <td>Contribution</td>
                      <td>Ksh 500</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">M-TIBA Health Wallet</div>
            </div>
            <div className="pnl-bd">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 14,
                  background: "linear-gradient(135deg,#e8490a,#ff6b2b)",
                  borderRadius: 12,
                  marginBottom: 14,
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: 32 }}>🟠</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>M-TIBA Balance</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 28, letterSpacing: -0.3 }}>Ksh 3,200</div>
                  <div style={{ fontSize: 10.5, opacity: 0.65, marginTop: 2 }}>Linked to UniHealth Health Cover</div>
                </div>
                <button
                  className="btn-s"
                  type="button"
                  style={{
                    marginLeft: "auto",
                    padding: "8px 14px",
                    background: "rgba(255,255,255,.15)",
                    border: "1.5px solid rgba(255,255,255,.25)",
                    color: "#fff",
                  }}
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "records")} id="pg-records">
          <div className="ph">
            <div>
              <div className="ph-ey">FHIR R5 · Encrypted · KDPA 2019</div>
              <div className="ph-ti">My Health Records</div>
              <div className="ph-su">Longitudinal health record linked to your AFL ID</div>
            </div>
            <button className="btn-s" type="button">
              📥 Export Records
            </button>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Diagnoses & Conditions</div>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg)", borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}>💗</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--t1)" }}>Mild Hypertension</div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>ICD-10: I10 · Diagnosed Oct 2024 · Managed</div>
                    </div>
                    <span className="tag am" style={{ marginLeft: "auto" }}>
                      Monitoring
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Allergies & Alerts</div>
              </div>
              <div className="pnl-bd">
                <div className="notice r">
                  <span className="notice-ico">🚨</span>
                  <div className="notice-txt">
                    <strong>Allergy on file:</strong> Penicillin — Severe allergic reaction (anaphylaxis).
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Immunisation Record</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Vaccine</th>
                    <th>Date Given</th>
                    <th>Facility</th>
                    <th>Next Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Influenza (Flu)</td>
                    <td className="mono">Jul 2025</td>
                    <td>Coast General</td>
                    <td className="mono">Jul 2026</td>
                    <td>
                      <span className="tag g">Current</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "documents")} id="pg-documents">
          <div className="ph">
            <div>
              <div className="ph-ey">My Files</div>
              <div className="ph-ti">Documents & Reports</div>
              <div className="ph-su">Medical letters, discharge summaries and certificates</div>
            </div>
            <button className="btn-s" type="button">
              📤 Upload Document
            </button>
          </div>
          <div className="g3">
            {[
              { ico: "📄", n: "Discharge summary", d: "KNH · Mar 2026" },
              { ico: "🧪", n: "Lab report PDF", d: "Coast General · Feb 2026" },
              { ico: "🩺", n: "Cardiology letter", d: "KNH · Jan 2026" },
            ].map((doc) => (
              <div key={doc.n} className="panel">
                <div className="pnl-bd" style={{ textAlign: "center", padding: 18 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{doc.ico}</div>
                  <div style={{ fontWeight: 800 }}>{doc.n}</div>
                  <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 6 }}>{doc.d}</div>
                  <button className="btn-s btn-sm" type="button" style={{ marginTop: 12 }}>
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={pgOn(page === "profile")} id="pg-profile">
          <div className="ph">
            <div>
              <div className="ph-ey">Account</div>
              <div className="ph-ti">My Profile</div>
              <div className="ph-su">Personal details, contacts and notification preferences</div>
            </div>
            <button className="btn-p" type="button">
              Save Changes
            </button>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Personal Details</div>
              </div>
              <div className="pnl-bd">
                <div className="ff-row">
                  <div className="ff">
                    <label>First Name</label>
                    <input defaultValue="Patience" />
                  </div>
                  <div className="ff">
                    <label>Last Name</label>
                    <input defaultValue="Mutiso" />
                  </div>
                </div>
                <div className="ff">
                  <label>UniHealth Patient ID</label>
                  <input readOnly className="mono" defaultValue="AFL-2024-KE-78841209" style={{ background: "#f3f7f3", color: "var(--t3)" }} />
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Contact Details</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Primary Phone</label>
                  <input type="tel" defaultValue="0712 345 678" />
                </div>
                <div className="ff">
                  <label>Email Address</label>
                  <input type="email" defaultValue="p.mutiso@example.com" />
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">🔒 Session Security & Privacy</div>
              <div className="pnl-su">Your active session · Registered devices</div>
            </div>
            <div className="pnl-bd">
              <div className="ai-widget green" style={{ marginBottom: 0 }}>
                <div className="ai-row">
                  <span className="ai-row-ico">🔐</span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Active Session</div>
                    <div className="ai-row-su">Signed in via UniHealth PIN + Biometric MFA · TLS 1.3 encrypted · Session expires after 30 minutes of inactivity.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "consent")} id="pg-consent">
          <div className="ph">
            <div>
              <div className="ph-ey">Privacy · KDPA 2019</div>
              <div className="ph-ti">Privacy & Consent</div>
              <div className="ph-su">Your data rights · Consent management · Who has accessed your records</div>
            </div>
            <div className="ph-r">
              <span className="kdpa-badge">🔒 KDPA 2019 Protected</span>
            </div>
          </div>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--gl)",
              border: "1.5px solid var(--gm)",
              borderRadius: 12,
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>🏛️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gd)", marginBottom: 5 }}>Your Rights Under Kenya&apos;s Data Protection Act (KDPA 2019)</div>
              <div style={{ fontSize: 11.5, color: "var(--t2)", lineHeight: 1.7 }}>
                You have the right to: <strong>Access</strong> your health data · <strong>Rectify</strong> incorrect information · <strong>Erase</strong> data in certain
                circumstances · <strong>Portability</strong> — receive your data in a usable format · <strong>Object</strong> to certain processing ·{" "}
                <strong>Withdraw</strong> consent at any time.
              </div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 18 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Consent Management</div>
                  <div className="pnl-su">Control how your health data is used</div>
                </div>
                <span className="tag g dot">UniHealth Active</span>
              </div>
              <div className="pnl-bd">
                <div className="consent-row">
                  <span className="consent-ico">🏥</span>
                  <div className="consent-body">
                    <div className="consent-ti">Treatment — Clinical Care</div>
                    <div className="consent-su">Allow clinicians at UniHealth-registered facilities to access your records for direct treatment.</div>
                    <div className="consent-date">Consented: 14 Jan 2024 · Required for UniHealth cover</div>
                  </div>
                  <div className="consent-right">
                    <span className="tag g">✓ Granted</span>
                  </div>
                </div>
                <div className="consent-row">
                  <span className="consent-ico">📊</span>
                  <div className="consent-body">
                    <div className="consent-ti">Public Health Research (Anonymised)</div>
                    <div className="consent-su">Allow anonymised data for MOH public health research. Your name and ID are never shared.</div>
                    <div className="consent-date">Last reviewed: 10 Mar 2026</div>
                  </div>
                  <div className="consent-right">
                    <span className="tag g">✓ Granted</span>
                    <button className="btn-s" style={{ fontSize: 10.5, padding: "5px 10px", marginTop: 4 }} type="button">
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Exercise Your Data Rights</div>
                  <div className="pnl-su">Submit a formal KDPA request</div>
                </div>
              </div>
              <div className="pnl-bd">
                <div className="ai-widget green" style={{ marginBottom: 14 }}>
                  <div className="ai-row">
                    <span className="ai-row-ico">📥</span>
                    <div className="ai-row-body">
                      <div className="ai-row-ti">Download Your Health Data</div>
                      <div className="ai-row-su">Export records in FHIR R5 JSON or PDF. Right to data portability under KDPA 2019.</div>
                    </div>
                    <button className="btn-s" style={{ fontSize: 11, padding: "6px 11px", flexShrink: 0 }} type="button">
                      Request Export
                    </button>
                  </div>
                </div>
                <div style={{ padding: "9px 13px", background: "var(--gl)", border: "1px solid var(--gm)", borderRadius: 8, fontSize: 11, color: "var(--gd)", lineHeight: 1.6 }}>
                  <strong>Data Protection Officer:</strong> dpo@unihealth.example<br />
                  <strong>Response time:</strong> 14 working days (KDPA 2019)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
