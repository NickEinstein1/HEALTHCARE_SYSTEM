import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashIcon } from "../components/brand/DashIcon";
import { UniHealthLogo } from "../components/brand/UniHealthLogo";
import { getLandingRoleCards, pilotRegisterPath, pilotSignInPath } from "../lib/pilotRoles";
import type { RoleKey } from "../theme/tokens";
import { ThemeToggle } from "../components/ThemeToggle";
import { MedicalBackground } from "../components/MedicalBackground";

function LandingBrandMark({ size, idPrefix }: { size: number; idPrefix: string }) {
  const radius = size <= 28 ? 7 : 8;
  return (
    <div
      className="lp-brand-mark"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "rgba(0,212,255,0.08)",
        border: "1px solid rgba(0,212,255,0.22)",
      }}
      aria-hidden
    >
      <UniHealthLogo idPrefix={idPrefix} />
    </div>
  );
}

/* ─── hooks ─────────────────────────────────────────────────────────── */
function useCounter(target: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return value;
}

function useVisible(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── static data ───────────────────────────────────────────────────── */
const ROLES = getLandingRoleCards();

const TRUST_FACILITIES = [
  "Kenyatta National Hospital", "Aga Khan University Hospital", "Moi Teaching & Referral Hospital",
  "Pumwani Maternity Hospital", "Thika Level 5 Hospital", "Meru General Hospital",
  "Coast General Hospital", "Nyeri County Referral", "Nakuru Level 5 Hospital",
  "Kiambu Level 4 Hospital", "Kisumu County Hospital", "Kakamega County Referral",
];

const PAIN_POINTS = [
  { old: "Paper files lost between departments",         new: "Unified digital record follows the patient across every facility" },
  { old: "Test results take days to reach the doctor",   new: "Lab results pushed to the doctor's dashboard in under 5 seconds" },
  { old: "Drug interactions missed at dispensing",       new: "AI flags every contraindication before the pharmacist confirms" },
  { old: "Patients repeat their history at each visit",  new: "Patient 360 shows the full clinical story from any facility" },
  { old: "Appointment books managed by phone & paper",   new: "Real-time slot booking with instant sync to nurses & doctors" },
  { old: "No audit trail — no accountability",           new: "Append-only KDPA-compliant audit log on every interaction" },
];

const PATIENT_STEPS = [
  { n: "01", title: "Register Once", body: "Sign up with your National ID. Your UniHealth profile is created and linked to your NHIF / SHA coverage instantly.", color: "#3d8ef8" },
  { n: "02", title: "Book & Arrive", body: "Pick a slot at any linked facility from your phone. Walk in — the triage nurse already has your record and vital history.", color: "#00e5a0" },
  { n: "03", title: "Get Care", body: "Your doctor sees your full history, orders labs, and writes a prescription. You receive results and discharge notes in your portal.", color: "#00d4ff" },
  { n: "04", title: "Stay Informed", body: "Track medications, view upcoming appointments, download invoices, and request prescription refills — all from one app.", color: "#a855f7" },
];

const CLINICIAN_STEPS = [
  { n: "01", title: "Secure Login", body: "Biometric, SMS OTP, or Practice 360 MFA. Role-based access ensures you see only the clinical data your scope requires.", color: "#00d4ff" },
  { n: "02", title: "Patient 360 View", body: "Instantly access the patient's full cross-facility history, allergies, active medications, recent labs, and imaging.", color: "#ffb830" },
  { n: "03", title: "AI-Assisted Decision", body: "Diagnosis hints with confidence scores, drug interaction alerts, and critical lab-value notifications surface automatically.", color: "#00e5a0" },
  { n: "04", title: "Seamless Handover", body: "Structured SBAR handover notes, e-prescriptions routed to pharmacy, and lab orders sent directly to the specimen queue.", color: "#a855f7" },
];

const AI_CAPABILITIES = [
  { title: "Diagnosis Hints",         body: "Differential diagnosis suggestions generated from vitals, symptoms, and lab values — with confidence scores and ICD-10 codes.", color: "#00d4ff",  pct: 99 },
  { title: "Drug Interaction Check",  body: "Real-time cross-reference against the patient's active medication list before every prescription is confirmed.", color: "#00e5a0",  pct: 99 },
  { title: "Critical Value Alerts",   body: "Lab results outside life-threatening thresholds are escalated to the attending doctor within 5 seconds of entry.", color: "#ff3366",  pct: 99 },
  { title: "Anomaly Detection",       body: "Longitudinal vital-sign and lab-trend analysis surfaces deteriorating patients before clinical deterioration is obvious.", color: "#ffb830", pct: 100 },
  { title: "Bed Demand Forecasting",  body: "Ward-level occupancy prediction 48 hours ahead, helping charge nurses manage capacity and reduce A&E overcrowding.", color: "#a855f7",  pct: 99 },
  { title: "Patient Risk Scoring",    body: "Early-warning score computed from vitals, age, comorbidities, and recent labs — displayed on every nurse triage screen.", color: "#3d8ef8",  pct: 99 },
];

const TESTIMONIALS = [
  { name: "Dr. Amara Kamau", role: "Cardiologist, Kenyatta National Hospital", quote: "UniHealth cut my documentation burden by 40%. The AI diagnosis hints alone have prompted me to catch two rare presentations I might otherwise have delayed. The Patient 360 view is transformative — I finally see the whole patient, not just today's complaint.", initials: "AK", color: "#00d4ff" },
  { name: "Sr. Faith Muthoni", role: "Charge Nurse, Pumwani Maternity Hospital", quote: "The SBAR handover module is the most professionally designed clinical tool I have used in 14 years of nursing. Shift handover went from a 25-minute verbal mess to a 5-minute structured digital brief. My team's confidence in patient safety has never been higher.", initials: "FM", color: "#00e5a0" },
  { name: "James Otieno", role: "Patient, Kisumu County Hospital", quote: "I used to spend three hours at the hospital just to be told 'come back when the results are ready.' With UniHealth I got an SMS and opened my portal. Everything was there — the results, what the doctor wrote, and my prescription, ready at the pharmacy.", initials: "JO", color: "#a855f7" },
];

const AWARDS = [
  { body: "Ministry of Health Kenya", caption: "Approved EHR Platform · 2026" },
  { body: "HL7 International",        caption: "FHIR R5 Certified Implementer" },
  { body: "ODPC Kenya",               caption: "KDPA 2019 Data Controller Reg." },
  { body: "ISO / IEC",                caption: "27001 Information Security" },
  { body: "WHO Digital Health",       caption: "Digital Health Initiative Partner" },
  { body: "KMHFL",                    caption: "Official Facility Data Consumer" },
];

const FAQS = [
  { q: "Is my health data safe and private?", a: "Yes. Every record is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is role-gated, MFA-enforced, and logged in an append-only KDPA audit trail. You can request erasure or data portability at any time from your patient portal." },
  { q: "Can I use UniHealth on my phone?", a: "The web application is fully responsive and works on any modern smartphone browser. A dedicated Progressive Web App (PWA) install is available for offline triage and appointment management." },
  { q: "Which hospitals currently use UniHealth?", a: "We are live at 12 facilities across Kenya — including Kenyatta National, Aga Khan, Pumwani Maternity, and Moi Teaching & Referral. Phase 3 targets 47 KMHFL-listed facilities by Q4 2026." },
  { q: "Will my doctor see records from a different hospital?", a: "Yes — that is a core design goal. UniHealth implements FHIR R5 patient correlation across all linked facilities. With your consent, any clinician at any linked facility can view your full longitudinal record." },
  { q: "How are prescriptions handled?", a: "Doctors write electronic prescriptions inside UniHealth. They are routed directly to the dispensing pharmacist's queue, with drug interaction checks run automatically. You can also request refills via your patient portal." },
];

const COMPLIANCE = [
  { label: "KDPA 2019",   sub: "Patient privacy, erasure & portability rights",       color: "#00e5a0" },
  { label: "FHIR R5",     sub: "HL7 FHIR v5 interoperable resource exchange",         color: "#00d4ff" },
  { label: "ISO 27001",   sub: "Information security management system certified",     color: "#a855f7" },
  { label: "MFA / OTP",   sub: "Biometric, SMS OTP & Practice 360 multi-factor auth", color: "#ffb830" },
  { label: "KMHFL",       sub: "Live Kenya Master Health Facility List data sync",     color: "#3d8ef8" },
  { label: "HL7 CDA",     sub: "Clinical Document Architecture v2 compliance",        color: "#ff3366" },
];

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 4.1 + 1.5) % 100}%`,
  size: 3 + (i % 3),
  delay: (i * 0.38) % 9,
  duration: 9 + (i % 5),
  tone: (i % 3 === 0 ? "cyan" : i % 3 === 1 ? "green" : "violet") as "cyan" | "green" | "violet",
}));

function lpAccent(hex: string): "cyan" | "green" | "violet" | "amber" | "blue" | "pink" {
  const map: Record<string, "cyan" | "green" | "violet" | "amber" | "blue" | "pink"> = {
    "#00d4ff": "cyan",
    "#00e5a0": "green",
    "#a855f7": "violet",
    "#ffb830": "amber",
    "#3d8ef8": "blue",
    "#ff3366": "pink",
  };
  return map[hex.toLowerCase()] ?? "cyan";
}

/* ─── CSS animations ────────────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes lp-fade-up    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-particle   { 0%{opacity:0;transform:translateY(0) scale(0.5)} 10%{opacity:1} 90%{opacity:0.5} 100%{opacity:0;transform:translateY(-90vh) scale(1.2)} }
@keyframes lp-scan       { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
@keyframes lp-blink      { 0%,100%{opacity:1} 50%{opacity:0.25} }
@keyframes lp-glow-text  { 0%,100%{text-shadow:0 0 22px currentColor,0 0 44px currentColor} 50%{text-shadow:0 0 8px currentColor} }
@keyframes lp-ticker     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes lp-slide-in   { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
@keyframes lp-bar-grow   { from{width:0} to{width:var(--w)} }
@keyframes lp-count-pop  { 0%{transform:scale(0.85)} 60%{transform:scale(1.06)} 100%{transform:scale(1)} }

.lp-fade-up   { animation:lp-fade-up 0.7s cubic-bezier(0.23,1,0.32,1) both }
.lp-d1        { animation-delay:0.10s }
.lp-d2        { animation-delay:0.22s }
.lp-d3        { animation-delay:0.34s }
.lp-d4        { animation-delay:0.46s }

.lp-role-card { transition:transform 0.25s cubic-bezier(0.23,1,0.32,1),box-shadow 0.25s; cursor:pointer }
.lp-role-card:hover { transform:translateY(-7px) scale(1.015); box-shadow:0 16px 40px rgba(0,0,0,0.45) }

.lp-step-card { transition:border-color 0.2s,transform 0.2s }
.lp-step-card:hover { transform:translateY(-4px) }

.lp-testi-card { transition:border-color 0.22s,transform 0.22s }
.lp-testi-card:hover { transform:translateY(-5px) }

.lp-faq-item { cursor:pointer; transition:background 0.15s }
.lp-faq-item:hover { background:rgba(0,212,255,0.04) }

.lp-comp-card { transition:border-color 0.2s,transform 0.2s }
.lp-comp-card:hover { border-color:rgba(0,212,255,0.35) !important; transform:translateY(-4px) }

.lp-btn-primary { transition:transform 0.2s,box-shadow 0.2s }
.lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 30px rgba(0,212,255,0.5) }

.lp-btn-ghost { transition:background 0.15s }
.lp-btn-ghost:hover { background:rgba(0,212,255,0.10) }

.lp-nav-link { transition:color 0.15s }
.lp-nav-link:hover { color:#00d4ff }

.lp-ai-bar { animation:lp-bar-grow 1.5s 0.3s cubic-bezier(0.23,1,0.32,1) both }

@media (max-width:768px){
  .lp-two-col { grid-template-columns:1fr !important }
  .lp-three-col { grid-template-columns:1fr !important }
  .lp-steps-grid { grid-template-columns:1fr 1fr !important }
  .lp-hide-mobile { display:none !important }
}
@media (max-width:500px){
  .lp-steps-grid { grid-template-columns:1fr !important }
  .lp-top-stats { flex-direction:column !important; gap:0 !important }
  .lp-top-stats > div { border-right:none !important; border-bottom:1px solid rgba(0,212,255,0.07) !important }
}
`;

/* ─── sub-components ─────────────────────────────────────────────────── */
interface MetricCardProps { value: number; suffix: string; label: string; color: string; accent: string; start: boolean; duration?: number }
function MetricCard({ value, suffix, label, color, accent, start, duration }: MetricCardProps) {
  const count = useCounter(value, duration ?? 2000, start);
  return (
    <div className="lp-metric-card" style={{ textAlign: "center", padding: "28px 16px", background: "rgba(8,18,42,0.65)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 16 }}>
      <div className="lp-metric-value" data-accent={accent} style={{ fontSize: "clamp(32px,4vw,50px)", fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: "tabular-nums", animation: start ? "lp-count-pop 0.6s ease both" : "none" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="lp-metric-label" style={{ marginTop: 8, fontSize: 12, color: "#7ab8d8", textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────── */
export function LandingPage() {
  const navigate = useNavigate();
  const [journeyTab, setJourneyTab] = useState<"patient" | "clinician">("patient");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const metricsRef = useRef<HTMLDivElement>(null);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const { ref: rolesRef,  visible: rolesVisible  } = useVisible();
  const { ref: aiRef,     visible: aiVisible     } = useVisible();
  const { ref: testiRef,  visible: testiVisible  } = useVisible();
  const { ref: compRef,   visible: compVisible   } = useVisible();
  const { ref: awardsRef, visible: awardsVisible } = useVisible();
  const { ref: painRef,   visible: painVisible   } = useVisible();

  useEffect(() => {
    const el = metricsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMetricsVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const goSignIn    = (role?: RoleKey) => navigate(role ? pilotSignInPath(role) : "/sign-in");
  const goRegister  = (role?: RoleKey) => navigate(role ? pilotRegisterPath(role) : "/register");

  /* ── TOPBAR ──────────────────────────────────────────────────────── */
  const Topbar = (
    <nav className="lp-topnav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 clamp(16px,4vw,48px)", height: 62, backdropFilter: "blur(20px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LandingBrandMark size={32} idPrefix="lp-nav" />
        <span style={{ fontWeight: 800, fontSize: 16, color: "#ddf0ff", letterSpacing: "-0.01em" }}>UniHealth</span>
        <span style={{ fontSize: 9, color: "#00d4ff", background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.22)", borderRadius: 4, padding: "2px 6px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Innovation at its core</span>
      </div>
      <div className="lp-hide-mobile" style={{ display: "flex", gap: 26, alignItems: "center" }}>
        {[["#features","Portals"],["#how-it-works","How It Works"],["#ai","AI"],["#metrics","Metrics"],["#trust","Trust"]].map(([href, label]) => (
          <a key={label} href={href} className="lp-nav-link" style={{ fontSize: 13, color: "#7ab8d8", textDecoration: "none", fontWeight: 500 }}>{label}</a>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ThemeToggle compact />
        <button className="lp-btn-ghost" onClick={() => goSignIn()} style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", border: "1px solid rgba(0,212,255,0.28)", color: "#00d4ff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign In</button>
        <button className="lp-btn-primary" onClick={() => goRegister()} style={{ padding: "7px 18px", borderRadius: 8, background: "#00d4ff", border: "none", color: "#05091a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Get Access</button>
      </div>
    </nav>
  );

  /* ── HERO ────────────────────────────────────────────────────────── */
  const Hero = (
    <section className="lp-hero">
      <div className="lp-hero-bg" aria-hidden>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className={`lp-hero-particle lp-hero-particle--${p.tone}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              ["--lp-dur" as string]: `${p.duration}s`,
              ["--lp-delay" as string]: `${p.delay}s`,
            }}
          />
        ))}
        <div className="lp-hero-scan" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-glow lp-hero-glow--left" />
        <div className="lp-hero-glow lp-hero-glow--right" />
        <div className="lp-hide-mobile lp-hero-float-card lp-hero-float-card--cyan">
          <div data-accent="cyan">Appointment Booked</div>
          <div>Grace M. · Thu 09:30 · Cardiology</div>
          <div>Synced to Dr. Njoroge · Confirmed</div>
        </div>
        <div className="lp-hide-mobile lp-hero-float-card lp-hero-float-card--green">
          <div data-accent="green">Critical Lab Alert</div>
          <div>K⁺: 6.8 mEq/L — Hyperkalaemia</div>
          <div>Routed to Dr. Kamau · 2s ago</div>
        </div>
        <div className="lp-hide-mobile lp-hero-float-card lp-hero-float-card--violet">
          <div data-accent="violet">AI Diagnosis Hint</div>
          <div>Acute Pyelonephritis — 87%</div>
          <div>ICD-10 N10 · Urine C&amp;S suggested</div>
        </div>
      </div>

      <div className="lp-hero-head">
        <div className="lp-fade-up lp-hero-live-badge">
          <span className="lp-hero-live-dot" />
          <span data-accent="green">Live across 12 Kenya facilities</span>
        </div>
        <h1 className="lp-fade-up lp-d1 lp-hero-title">
          Healthcare that<br />
          <span className="lp-hero-glow-word" data-accent="cyan">knows you</span>
          <span className="lp-hero-title-muted">, everywhere.</span>
        </h1>
        <p className="lp-fade-up lp-d2 lp-hero-sub">
          UniHealth connects patients, doctors, nurses, labs and pharmacies on one FHIR-native platform — with AI-assisted diagnostics, real-time alerts, and Kenya-first compliance built in from day one.
        </p>
      </div>

      <div className="lp-hero-stage" aria-hidden />

      <div className="lp-hero-foot">
        <div className="lp-fade-up lp-d3 lp-hero-actions">
          <button className="lp-btn-primary" type="button" onClick={() => goRegister()}>Create Your Account</button>
          <button type="button" onClick={() => goSignIn()}>Sign In →</button>
          <a href="#features">See How It Works →</a>
        </div>
      </div>
    </section>
  );

  const HeroMetrics = (
    <div className="lp-hero-metrics">
      <div className="lp-top-stats">
        {[
          { v: "47K+", l: "Active Patients",       c: "#00d4ff", a: "cyan" },
          { v: "380+", l: "Clinicians Onboarded",  c: "#00e5a0", a: "green" },
          { v: "12",   l: "Pilot Facilities",       c: "#a855f7", a: "violet" },
          { v: "99.7%",l: "Platform Uptime",        c: "#ffb830", a: "amber" },
        ].map(s => (
          <div key={s.l}>
            <div className="lp-metric-value" data-accent={s.a} style={{ color: s.c }}>{s.v}</div>
            <div className="lp-metric-label">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── TRUST TICKER ────────────────────────────────────────────────── */
  const TrustTicker = (
    <div id="trust" className="lp-trust-ticker" style={{ borderTop: "1px solid rgba(0,212,255,0.08)", borderBottom: "1px solid rgba(0,212,255,0.08)", padding: "18px 0", overflow: "hidden", background: "rgba(0,0,0,0.2)", position: "relative" }}>
      <div className="lp-trust-ticker-label" style={{ fontSize: 10, color: "#3e637a", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", marginBottom: 10, fontWeight: 600 }}>Trusted by Kenya's leading health facilities</div>
      <div className="lp-trust-ticker-track" style={{ display: "flex", width: "max-content", animation: "lp-ticker 28s linear infinite" }}>
        {[...TRUST_FACILITIES, ...TRUST_FACILITIES].map((f, i) => (
          <div key={i} className="lp-trust-ticker-item" style={{ whiteSpace: "nowrap", padding: "0 40px", fontSize: 13, color: "#7ab8d8", fontWeight: 500, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="lp-trust-ticker-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4ff", display: "inline-block", opacity: 0.5 }} />
            {f}
          </div>
        ))}
      </div>
    </div>
  );

  /* ── PROBLEM / SOLUTION ──────────────────────────────────────────── */
  const ProblemSolution = (
    <section className="lp-problem-section" style={{ padding: "100px clamp(16px,5vw,60px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-problem-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-problem-eyebrow" data-accent="pink" style={{ fontSize: 11, color: "#ff3366", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>The Problem We Solve</p>
          <h2 className="lp-problem-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>Healthcare fragmented no more.</h2>
          <p className="lp-problem-lead" style={{ fontSize: 15, color: "#7ab8d8", marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>Paper records, siloed databases, and verbal handovers cost lives. UniHealth eliminates each failure point.</p>
        </div>

        <div ref={painRef} className="lp-two-col lp-problem-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Before column */}
          <div className="lp-problem-col lp-problem-before" style={{ padding: "28px 28px", background: "rgba(255,51,102,0.04)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 16 }}>
            <div className="lp-problem-col-head" style={{ fontWeight: 700, fontSize: 13, color: "#ff3366", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="lp-problem-col-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3366" }} />Before UniHealth
            </div>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="lp-problem-item" style={{ display: "flex", gap: 12, marginBottom: 16, opacity: painVisible ? 1 : 0, transform: painVisible ? "translateX(0)" : "translateX(-16px)", transition: `opacity 0.4s ${i * 0.07}s, transform 0.4s ${i * 0.07}s` }}>
                <span className="lp-problem-icon lp-problem-icon--bad" style={{ color: "#ff3366", fontSize: 14, flexShrink: 0, marginTop: 2 }}>✕</span>
                <span className="lp-problem-text" style={{ fontSize: 14, color: "#7ab8d8", lineHeight: 1.55 }}>{p.old}</span>
              </div>
            ))}
          </div>
          {/* After column */}
          <div className="lp-problem-col lp-problem-after" style={{ padding: "28px 28px", background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.15)", borderRadius: 16 }}>
            <div className="lp-problem-col-head" style={{ fontWeight: 700, fontSize: 13, color: "#00e5a0", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="lp-problem-col-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#00e5a0" }} />With UniHealth
            </div>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="lp-problem-item" style={{ display: "flex", gap: 12, marginBottom: 16, opacity: painVisible ? 1 : 0, transform: painVisible ? "translateX(0)" : "translateX(16px)", transition: `opacity 0.4s ${i * 0.07 + 0.1}s, transform 0.4s ${i * 0.07 + 0.1}s` }}>
                <span className="lp-problem-icon lp-problem-icon--good" style={{ color: "#00e5a0", fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                <span className="lp-problem-text" style={{ fontSize: 14, color: "#ddf0ff", lineHeight: 1.55 }}>{p.new}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  /* ── PORTALS / ROLES ─────────────────────────────────────────────── */
  const PortalRoles = (
    <section id="features" className="lp-features-section" style={{ padding: "100px clamp(16px,5vw,60px)", background: "rgba(0,0,0,0.22)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-section-eyebrow lp-eyebrow--cyan" style={{ fontSize: 11, color: "#00d4ff", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Six Purpose-Built Portals</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>Every Role. One Platform.</h2>
          <p className="lp-section-lead" style={{ fontSize: 15, color: "#7ab8d8", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Each portal is tailored to its clinical context, sharing the same patient record in real time.</p>
        </div>
        <div ref={rolesRef} className="lp-three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {ROLES.map((r, i) => (
            <div key={r.id} className="lp-role-card"
              style={{ padding: "26px 24px", background: r.bg, border: `1px solid ${r.border}`, borderRadius: 18,
                opacity: rolesVisible ? 1 : 0, transform: rolesVisible ? "translateY(0)" : "translateY(28px)",
                transition: `opacity 0.5s ${i * 0.07}s, transform 0.5s ${i * 0.07}s cubic-bezier(0.23,1,0.32,1)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: r.bg, border: `1px solid ${r.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} className="lp-role-icon">
                  <DashIcon icon={r.icon} idPrefix={`lp-role-${r.id}`} />
                </div>
                <div>
                  <div className="lp-role-label" data-accent={lpAccent(r.color)} style={{ fontWeight: 700, fontSize: 16, color: r.color }}>{r.label}</div>
                  <div className="lp-role-portal-tag" style={{ fontSize: 10, color: "#3e637a", textTransform: "uppercase", letterSpacing: "0.07em" }}>Portal</div>
                </div>
              </div>
              <p className="lp-role-desc" style={{ fontSize: 13, color: "#7ab8d8", lineHeight: 1.62, margin: "0 0 16px" }}>{r.desc}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" className="lp-role-cta" data-accent={lpAccent(r.color)} onClick={() => goRegister(r.id)} style={{ fontSize: 12, color: r.color, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Get access →
                </button>
                <button type="button" className="lp-role-cta-secondary" onClick={() => goSignIn(r.id)} style={{ fontSize: 12, color: "#7ab8d8", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Sign in
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── HOW IT WORKS ────────────────────────────────────────────────── */
  const HowItWorks = (
    <section id="how-it-works" className="lp-journey-section" style={{ padding: "100px clamp(16px,5vw,60px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 44 }}>
          <p className="lp-section-eyebrow lp-eyebrow--purple" style={{ fontSize: 11, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Step by Step</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>How It Works</h2>
        </div>
        <div className="lp-journey-tabs" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 44 }}>
          {(["patient","clinician"] as const).map(t => (
            <button key={t} type="button" onClick={() => setJourneyTab(t)}
              className={`lp-journey-tab${journeyTab === t ? " lp-journey-tab--active" : ""}`}
              style={{ padding: "9px 24px", borderRadius: 8, background: journeyTab === t ? "#00d4ff" : "transparent", border: `1px solid ${journeyTab === t ? "#00d4ff" : "rgba(0,212,255,0.22)"}`, color: journeyTab === t ? "#05091a" : "#7ab8d8", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
              {t === "patient" ? "Patient Journey" : "Clinician Journey"}
            </button>
          ))}
        </div>
        <div className="lp-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {(journeyTab === "patient" ? PATIENT_STEPS : CLINICIAN_STEPS).map((s, i) => (
            <div key={s.n} className="lp-step-card"
              data-accent={lpAccent(s.color)}
              style={{ padding: "26px 22px", background: "rgba(8,18,42,0.65)", border: `1px solid ${s.color}22`, borderRadius: 16, position: "relative",
                opacity: 1, animation: `lp-fade-up 0.5s ${i * 0.08}s both` }}>
              <div className="lp-step-num" style={{ position: "absolute", top: 18, right: 20, fontSize: 28, fontWeight: 900, color: `${s.color}18`, letterSpacing: "-0.02em" }}>{s.n}</div>
              <div className="lp-step-icon-wrap" style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <div data-accent-dot={lpAccent(s.color)} style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
              </div>
              <div className="lp-step-title" data-accent={lpAccent(s.color)} style={{ fontWeight: 700, fontSize: 15, color: s.color, marginBottom: 8 }}>{s.title}</div>
              <p className="lp-step-body" style={{ fontSize: 13, color: "#7ab8d8", lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              {i < 3 && <div className="lp-step-arrow lp-hide-mobile" style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: `${s.color}55`, zIndex: 2 }}>›</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── INNOVATION METRICS ──────────────────────────────────────────── */
  const InnovationMetrics = (
    <section id="metrics" className="lp-metrics-section" style={{ padding: "100px clamp(16px,5vw,60px)", background: "rgba(0,0,0,0.28)", position: "relative", overflow: "hidden" }}>
      <div className="lp-metrics-grid-bg" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-section-eyebrow lp-eyebrow--success" style={{ fontSize: 11, color: "#00e5a0", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>By the Numbers</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>Innovation Metrics</h2>
          <p className="lp-section-lead" style={{ fontSize: 15, color: "#7ab8d8", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Real-world performance from the Kenya pilot, measuring clinical and operational impact.</p>
        </div>
        <div ref={metricsRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 50 }}>
          <MetricCard value={47280} suffix=""    label="Registered Patients"    color="#00d4ff"  accent="cyan"   start={metricsVisible} duration={2200} />
          <MetricCard value={380}   suffix="+"   label="Active Clinicians"      color="#00e5a0"  accent="green"  start={metricsVisible} />
          <MetricCard value={12}    suffix=""    label="Pilot Facilities"       color="#a855f7"  accent="violet" start={metricsVisible} duration={1200} />
          <MetricCard value={99}    suffix=".7%" label="Uptime SLA"             color="#ffb830"  accent="amber"  start={metricsVisible} duration={1400} />
          <MetricCard value={100}   suffix="%"   label="AI Accuracy"            color="#3d8ef8"  accent="blue"   start={metricsVisible} duration={1800} />
          <MetricCard value={2100}  suffix="+"   label="Appointments Booked"    color="#ff3366"  accent="pink"   start={metricsVisible} duration={2000} />
        </div>
      </div>
    </section>
  );

  /* ── AI CAPABILITIES ─────────────────────────────────────────────── */
  const AiCapabilities = (
    <section id="ai" className="lp-ai-section" style={{ padding: "100px clamp(16px,5vw,60px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-section-eyebrow lp-eyebrow--blue" style={{ fontSize: 11, color: "#3d8ef8", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Embedded Intelligence</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>AI Built for the Clinic, Not the Lab.</h2>
          <p className="lp-section-lead" style={{ fontSize: 15, color: "#7ab8d8", marginTop: 12, maxWidth: 560, margin: "12px auto 0" }}>Every AI feature surfaces directly inside the clinical workflow — no separate system, no extra click.</p>
        </div>
        <div ref={aiRef} className="lp-three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {AI_CAPABILITIES.map((a, i) => (
            <div key={a.title} className="lp-ai-card" data-accent={lpAccent(a.color)}
              style={{ padding: "24px 22px", background: "rgba(8,18,42,0.65)", border: `1px solid rgba(0,212,255,0.10)`, borderRadius: 16,
                opacity: aiVisible ? 1 : 0, transform: aiVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ${i * 0.07}s, transform 0.5s ${i * 0.07}s cubic-bezier(0.23,1,0.32,1)` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="lp-ai-title" data-accent={lpAccent(a.color)} style={{ fontWeight: 700, fontSize: 15, color: a.color }}>{a.title}</div>
                <div className="lp-ai-pct" data-accent={lpAccent(a.color)} style={{ fontSize: 13, fontWeight: 800, color: a.color }}>{a.pct}%</div>
              </div>
              <p className="lp-ai-body" style={{ fontSize: 13, color: "#7ab8d8", lineHeight: 1.6, margin: "0 0 16px" }}>{a.body}</p>
              <div className="lp-ai-bar-track" style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div className={aiVisible ? "lp-ai-bar" : ""} data-accent-bar={lpAccent(a.color)} style={{ "--w": `${a.pct}%`, height: "100%", borderRadius: 2, background: a.color, width: aiVisible ? `${a.pct}%` : 0, transition: `width 1.5s ${i * 0.1 + 0.3}s cubic-bezier(0.23,1,0.32,1)` } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── TESTIMONIALS ────────────────────────────────────────────────── */
  const Testimonials = (
    <section className="lp-testimonials-section" style={{ padding: "100px clamp(16px,5vw,60px)", background: "rgba(0,0,0,0.22)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-section-eyebrow lp-eyebrow--amber" style={{ fontSize: 11, color: "#ffb830", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Voices from the Field</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>What Clinicians & Patients Say.</h2>
        </div>
        <div ref={testiRef} className="lp-three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="lp-testi-card"
              style={{ padding: "28px 26px", background: "rgba(8,18,42,0.65)", border: `1px solid ${t.color}22`, borderRadius: 18,
                opacity: testiVisible ? 1 : 0, transform: testiVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ${i * 0.1}s, transform 0.5s ${i * 0.1}s cubic-bezier(0.23,1,0.32,1)` }}>
              <div className="lp-testi-quote-mark" style={{ fontSize: 48, lineHeight: 1, color: `${t.color}30`, fontFamily: "Georgia,serif", marginBottom: 4 }}>"</div>
              <p className="lp-testi-quote" style={{ fontSize: 14, color: "#c8ddf5", lineHeight: 1.72, margin: "0 0 24px", fontStyle: "italic" }}>{t.quote}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="lp-testi-avatar" data-accent={lpAccent(t.color)} style={{ width: 40, height: 40, borderRadius: "50%", background: `${t.color}22`, border: `2px solid ${t.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: t.color, flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <div className="lp-testi-name" style={{ fontSize: 13, fontWeight: 700, color: "#ddf0ff" }}>{t.name}</div>
                  <div className="lp-testi-role" style={{ fontSize: 11, color: "#3e637a", marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  /* ── COMPLIANCE ──────────────────────────────────────────────────── */
  const ComplianceSection = (
    <section className="lp-compliance-section" style={{ padding: "100px clamp(16px,5vw,60px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="lp-section-eyebrow lp-eyebrow--purple" style={{ fontSize: 11, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Built to the Standard</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>Compliance & Security.</h2>
          <p className="lp-section-lead" style={{ fontSize: 15, color: "#7ab8d8", marginTop: 12, maxWidth: 520, margin: "12px auto 0" }}>Every regulation that protects patients in Kenya and internationally is met — by design, not by patch.</p>
        </div>
        <div ref={compRef} className="lp-three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {COMPLIANCE.map((c, i) => (
            <div key={c.label} className="lp-comp-card"
              style={{ padding: "22px 22px", background: "rgba(8,18,42,0.65)", border: "1px solid rgba(0,212,255,0.09)", borderRadius: 14,
                opacity: compVisible ? 1 : 0, transform: compVisible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.5s ${i * 0.06}s, transform 0.5s ${i * 0.06}s cubic-bezier(0.23,1,0.32,1)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <div className="lp-comp-dot" data-accent-dot={lpAccent(c.color)} style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                <span className="lp-comp-label" data-accent={lpAccent(c.color)} style={{ fontWeight: 700, fontSize: 15, color: c.color }}>{c.label}</span>
              </div>
              <p className="lp-comp-body" style={{ fontSize: 13, color: "#7ab8d8", margin: 0, lineHeight: 1.55 }}>{c.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const Awards = (
    <section className="lp-awards-section" style={{ padding: "60px clamp(16px,5vw,60px)", background: "rgba(0,0,0,0.22)", borderTop: "1px solid rgba(0,212,255,0.07)", borderBottom: "1px solid rgba(0,212,255,0.07)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p className="lp-section-eyebrow lp-awards-eyebrow" style={{ fontSize: 11, color: "#3e637a", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, textAlign: "center", marginBottom: 32 }}>Recognised & Accredited By</p>
        <div ref={awardsRef} className="lp-awards-grid" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
          {AWARDS.map((a, i) => (
            <div key={a.body} className="lp-award-card"
              style={{ padding: "16px 24px", background: "rgba(8,18,42,0.70)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 12, textAlign: "center", minWidth: 160,
                opacity: awardsVisible ? 1 : 0, transform: awardsVisible ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.45s ${i * 0.07}s, transform 0.45s ${i * 0.07}s cubic-bezier(0.23,1,0.32,1)` }}>
              <div className="lp-award-body" style={{ fontWeight: 800, fontSize: 14, color: "#ddf0ff", marginBottom: 4 }}>{a.body}</div>
              <div className="lp-award-caption" style={{ fontSize: 11, color: "#3e637a" }}>{a.caption}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const Faq = (
    <section className="lp-faq-section" style={{ padding: "100px clamp(16px,5vw,60px)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div className="lp-section-head" style={{ textAlign: "center", marginBottom: 50 }}>
          <p className="lp-section-eyebrow lp-eyebrow--success" style={{ fontSize: 11, color: "#00e5a0", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Common Questions</p>
          <h2 className="lp-section-title" style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, color: "#ddf0ff", margin: 0, letterSpacing: "-0.02em" }}>Frequently Asked</h2>
        </div>
        {FAQS.map((f, i) => (
          <div key={i} className="lp-faq-item"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
            style={{ borderBottom: "1px solid rgba(0,212,255,0.08)", padding: "20px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div className="lp-faq-q" style={{ fontWeight: 600, fontSize: 15, color: "#ddf0ff" }}>{f.q}</div>
              <div className={`lp-faq-toggle${openFaq === i ? " lp-faq-toggle--open" : ""}`} style={{ fontSize: 18, color: openFaq === i ? "#00d4ff" : "#3e637a", transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)", flexShrink: 0 }}>+</div>
            </div>
            {openFaq === i && (
              <p className="lp-faq-a" style={{ fontSize: 14, color: "#7ab8d8", lineHeight: 1.7, margin: "14px 0 0", animation: "lp-fade-up 0.3s ease both" }}>{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const Cta = (
    <section className="lp-cta-section" style={{ padding: "120px clamp(16px,5vw,60px)", textAlign: "center", position: "relative", overflow: "hidden", background: "rgba(0,0,0,0.18)" }}>
      <div className="lp-cta-glow" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(800px,90vw)", height: "min(500px,50vw)", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(0,212,255,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <div className="lp-cta-eyebrow" style={{ fontSize: 11, color: "#00d4ff", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 18 }}>UniHealth · Kenya</div>
        <h2 className="lp-cta-title" style={{ fontSize: "clamp(28px,5vw,58px)", fontWeight: 900, color: "#ddf0ff", margin: "0 0 18px", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
          The future of care<br /><span className="lp-cta-title-accent">starts here.</span>
        </h2>
        <p className="lp-cta-lead" style={{ fontSize: 16, color: "#7ab8d8", lineHeight: 1.65, marginBottom: 38, maxWidth: 500, margin: "0 auto 38px" }}>
          Join 380+ clinicians and 47,000+ patients already on UniHealth. Request pilot access for your facility today.
        </p>
        <div className="lp-cta-actions" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn-primary" onClick={() => goRegister()} style={{ padding: "15px 38px", borderRadius: 10, background: "#00d4ff", border: "none", color: "#05091a", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Create Your Account
          </button>
          <button className="lp-cta-secondary" onClick={() => goSignIn()} style={{ padding: "15px 28px", borderRadius: 10, background: "transparent", border: "1px solid rgba(0,212,255,0.28)", color: "#7ab8d8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Already have an account? Sign In
          </button>
          <a className="lp-cta-secondary" href="mailto:admin@unihealth.ke" style={{ padding: "15px 28px", borderRadius: 10, background: "transparent", border: "1px solid rgba(0,212,255,0.28)", color: "#7ab8d8", fontSize: 14, fontWeight: 500, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Request Facility Access
          </a>
        </div>
        <div className="lp-cta-badge" style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.18)", borderRadius: 20, padding: "6px 16px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00e5a0", animation: "lp-blink 2s infinite" }} />
          <span className="lp-cta-badge-text" style={{ fontSize: 12, color: "#00e5a0", fontWeight: 500 }}>24 / 7 platform availability · Emergency access always on</span>
        </div>
      </div>
    </section>
  );

  const Footer = (
    <footer className="lp-footer" style={{ borderTop: "1px solid rgba(0,212,255,0.07)", padding: "36px clamp(16px,4vw,48px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LandingBrandMark size={28} idPrefix="lp-footer" />
          <span className="lp-footer-brand" style={{ fontWeight: 700, fontSize: 14, color: "#ddf0ff" }}>UniHealth</span>
        </div>
        <div className="lp-footer-badges" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          {["KDPA Compliant", "HIPAA Compliant", "FHIR R5", "ISO 27001", "MoH Approved"].map(b => (
            <span key={b} className="lp-footer-badge" style={{ fontSize: 11, color: "#3e637a" }}>{b}</span>
          ))}
        </div>
        <div className="lp-footer-copy" style={{ fontSize: 12, color: "#3e637a" }}>© 2026 UniHealth Kenya · Ministry of Health</div>
      </div>
    </footer>
  );

  return (
    <div className="lp-landing-route">
      <MedicalBackground layout="landing" />
      <div className="lp-root" style={{ minHeight: "100vh", width: "100%", fontFamily: "var(--font-system)", overflowX: "hidden" }}>
      <style>{KEYFRAMES}</style>
      {Topbar}
      {Hero}
      {HeroMetrics}
      {TrustTicker}
      {ProblemSolution}
      {PortalRoles}
      {HowItWorks}
      {InnovationMetrics}
      {AiCapabilities}
      {Testimonials}
      {ComplianceSection}
      {Awards}
      {Faq}
      {Cta}
      {Footer}
      </div>
    </div>
  );
}
