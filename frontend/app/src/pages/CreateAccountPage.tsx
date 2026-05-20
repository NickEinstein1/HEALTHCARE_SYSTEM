/**
 * UniHealth — Create Account
 * ================================
 * Four-step registration flow, role-aware:
 *   Step 1 — Choose your role
 *   Step 2 — Fill role-specific details
 *   Step 3 — Verify OTP (simulated)
 *   Step 4 — Account created ✓
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UniHealthLogo } from "../components/brand/UniHealthLogo";
import type { RoleKey } from "../theme/tokens";

// ── Colour tokens (mirrors the sign-in dark theme) ──────────────────
const R: Record<RoleKey, { color: string; bg: string; border: string; label: string; icon: string; tagline: string }> = {
  patient:  { color: "#3d8ef8", bg: "rgba(61,142,248,0.08)",  border: "rgba(61,142,248,0.30)",  label: "Patient",      icon: "🙋", tagline: "Book appointments, view results, manage your health." },
  doctor:   { color: "#00d4ff", bg: "rgba(0,212,255,0.08)",   border: "rgba(0,212,255,0.30)",   label: "Doctor",       icon: "🩺", tagline: "Clinical notes, e-prescriptions, lab orders & AI hints." },
  nurse:    { color: "#00e5a0", bg: "rgba(0,229,160,0.08)",   border: "rgba(0,229,160,0.30)",   label: "Nurse / CO",   icon: "💉", tagline: "Triage, vitals, SBAR handover, ward management." },
  admin:    { color: "#a855f7", bg: "rgba(168,85,247,0.08)",  border: "rgba(168,85,247,0.30)",  label: "Admin",        icon: "⚙",  tagline: "Facility control, user provisioning, analytics." },
  lab:      { color: "#ffb830", bg: "rgba(255,184,48,0.08)",  border: "rgba(255,184,48,0.30)",  label: "Lab Technician", icon: "🔬", tagline: "Lab orders, specimen tracking, critical-value alerts." },
  pharmacy: { color: "#ff3366", bg: "rgba(255,51,102,0.08)",  border: "rgba(255,51,102,0.30)",  label: "Pharmacist",   icon: "💊", tagline: "Prescriptions, dispensing, drug interactions, stock." },
};

const FACILITIES = [
  "Kenyatta National Hospital",
  "Aga Khan University Hospital",
  "Moi Teaching & Referral Hospital",
  "Pumwani Maternity Hospital",
  "Thika Level 5 Hospital",
  "Meru General Hospital",
  "Coast General Hospital",
  "Nyeri County Referral",
  "Nakuru Level 5 Hospital",
  "Kisumu County Hospital",
  "Kakamega County Referral",
  "Other",
];

const SPECIALTIES = [
  "Internal Medicine","Cardiology","Paediatrics","Obstetrics & Gynaecology",
  "Surgery (General)","Orthopaedics","Neurology","Oncology","Psychiatry",
  "Emergency Medicine","Anaesthesiology","Dermatology","Radiology","Pathology",
  "Family Medicine","Other",
];

const ID_TYPES = [
  { value: "national",  label: "National ID" },
  { value: "passport",  label: "Passport" },
  { value: "alien",     label: "Alien ID" },
  { value: "refugee",   label: "Refugee ID" },
];

// ── CSS keyframes injected once ─────────────────────────────────────
const KEYFRAMES = `
@keyframes reg-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes reg-stripe   { 0%{background-position:0% 0} 100%{background-position:400% 0} }
@keyframes reg-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes reg-blink    { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes reg-pop      { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }

.reg-card-in { animation: reg-fade-up 0.5s cubic-bezier(0.23,1,0.32,1) both }
.reg-role-card { transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; cursor: pointer }
.reg-role-card:hover { transform: translateY(-5px) }
.reg-input:focus { outline: none }
.reg-btn:disabled { opacity: 0.55; cursor: not-allowed }
.reg-select:focus { outline: none }
`;

// ── Field helpers ────────────────────────────────────────────────────
interface FieldProps {
  label: string; hint?: string; error?: string;
  children: React.ReactNode;
}
function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#7ab8d8",
        textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: 11, color: "#3e637a", marginTop: 4 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: "#ff3366", marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(0,212,255,0.18)", borderRadius: 9, color: "#ddf0ff",
  fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  transition: "border-color 0.15s",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none", cursor: "pointer",
  background: "rgba(8,18,42,0.9)",
};

// ── Step 1: Role picker ──────────────────────────────────────────────
function StepPickRole({ onSelect }: { onSelect: (r: RoleKey) => void }) {
  const [hovered, setHovered] = useState<RoleKey | null>(null);
  return (
    <div className="reg-card-in">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#ddf0ff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Create your account
        </h2>
        <p style={{ fontSize: 13, color: "#7ab8d8", margin: 0, lineHeight: 1.55 }}>
          Select your role to see the registration form tailored for you.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(Object.keys(R) as RoleKey[]).map(role => {
          const cfg = R[role];
          const isHov = hovered === role;
          return (
            <div key={role} className="reg-role-card"
              onClick={() => onSelect(role)}
              onMouseEnter={() => setHovered(role)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "16px 14px", background: isHov ? cfg.bg : "rgba(8,18,42,0.6)",
                border: `1.5px solid ${isHov ? cfg.color : "rgba(0,212,255,0.12)"}`,
                borderRadius: 14,
                boxShadow: isHov ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${cfg.border}` : "none",
              }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{cfg.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: isHov ? cfg.color : "#ddf0ff", marginBottom: 3 }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: 11, color: "#7ab8d8", lineHeight: 1.4 }}>{cfg.tagline}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "#3e637a" }}>
        Already have an account?{" "}
        <a href="/sign-in" style={{ color: "#00d4ff", textDecoration: "none", fontWeight: 600 }}>Sign in</a>
      </div>
    </div>
  );
}

// ── Step 2: Registration form (role-specific) ────────────────────────
interface FormState {
  fullName: string; email: string; phone: string; password: string; confirmPwd: string;
  // patient
  idType: string; idNumber: string; dob: string; gender: string; pin: string; facilityPref: string;
  nhifNumber: string;
  // staff
  regNumber: string; facility: string; department: string; specialty: string;
  facilityLevel: string; yearsExp: string;
}
const EMPTY_FORM: FormState = {
  fullName: "", email: "", phone: "", password: "", confirmPwd: "",
  idType: "national", idNumber: "", dob: "", gender: "", pin: "", facilityPref: "", nhifNumber: "",
  regNumber: "", facility: "", department: "", specialty: "", facilityLevel: "", yearsExp: "",
};

function StepFillForm({ role, onBack, onSubmit }: {
  role: RoleKey;
  onBack: () => void;
  onSubmit: (f: FormState) => void;
}) {
  const cfg = R[role];
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPwd, setShowPwd] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address.";
    if (!form.phone.trim() || !/^(?:\+254|0)[17]\d{8}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Enter a valid Kenyan phone number (e.g. 0712 345678).";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPwd) e.confirmPwd = "Passwords do not match.";

    if (role === "patient") {
      if (!form.idNumber.trim()) e.idNumber = "ID number is required.";
      if (!form.dob) e.dob = "Date of birth is required.";
      if (!form.gender) e.gender = "Select a gender.";
      if (!/^\d{4}$/.test(form.pin)) e.pin = "PIN must be exactly 4 digits.";
    } else {
      if (!form.regNumber.trim()) e.regNumber = "Registration / employee ID is required.";
      if (!form.facility) e.facility = "Select your primary facility.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  };

  const inp = (k: keyof FormState, type = "text", ph = "") => (
    <input
      className="reg-input"
      type={type === "password" && showPwd ? "text" : type}
      value={form[k] as string}
      onChange={e => set(k, e.target.value)}
      placeholder={ph}
      style={{ ...inputStyle, borderColor: errors[k] ? "#ff3366" : "rgba(0,212,255,0.18)" }}
      autoComplete="off"
    />
  );

  const sel = (k: keyof FormState, options: { value: string; label: string }[]) => (
    <select
      className="reg-select"
      value={form[k] as string}
      onChange={e => set(k, e.target.value)}
      style={{ ...selectStyle, borderColor: errors[k] ? "#ff3366" : "rgba(0,212,255,0.18)", color: form[k] ? "#ddf0ff" : "#3e637a" }}>
      <option value="">— select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="reg-card-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#3e637a",
          cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 6,
          transition: "color 0.15s" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>{cfg.icon}</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: cfg.color }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 12, color: "#3e637a", marginTop: 2 }}>Registration — fill your details below</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Common fields ─────────────────────── */}
        <Field label="Full Name" error={errors.fullName}>
          {inp("fullName", "text", "e.g. Grace Wanjiku Kamau")}
        </Field>

        {/* ── Patient-specific identity ─────────── */}
        {role === "patient" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="ID Type" error={errors.idType}>
                {sel("idType", ID_TYPES)}
              </Field>
              <Field label="ID Number" error={errors.idNumber}>
                {inp("idNumber", "text", "e.g. 12345678")}
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Date of Birth" error={errors.dob}>
                {inp("dob", "date")}
              </Field>
              <Field label="Gender" error={errors.gender}>
                {sel("gender", [
                  { value: "female", label: "Female" },
                  { value: "male",   label: "Male" },
                  { value: "other",  label: "Prefer not to say" },
                ])}
              </Field>
            </div>
            <Field label="NHIF / SHA Member Number" hint="Optional — links your insurance coverage">
              {inp("nhifNumber", "text", "e.g. 123456789")}
            </Field>
            <Field label="Preferred Facility" hint="Where you mainly receive care" error={errors.facilityPref}>
              {sel("facilityPref", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Doctor ────────────────────────────── */}
        {role === "doctor" && (
          <>
            <Field label="Medical Registration No." hint="As on your Kenya Medical Practitioners licence" error={errors.regNumber}>
              {inp("regNumber", "text", "e.g. A4821 or M/12345")}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Specialty" error={errors.specialty}>
                {sel("specialty", SPECIALTIES.map(s => ({ value: s, label: s })))}
              </Field>
              <Field label="Years of Experience">
                {inp("yearsExp", "number", "e.g. 5")}
              </Field>
            </div>
            <Field label="Primary Facility" error={errors.facility}>
              {sel("facility", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Nurse / CO ────────────────────────── */}
        {role === "nurse" && (
          <>
            <Field label="Nursing Registration No." hint="From your NCK certificate (e.g. RN/12345)" error={errors.regNumber}>
              {inp("regNumber", "text", "e.g. RN/12345 or CO/7890")}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Ward / Unit" error={errors.department}>
                {inp("department", "text", "e.g. Ward 4B, ICU")}
              </Field>
              <Field label="Years of Experience">
                {inp("yearsExp", "number", "e.g. 3")}
              </Field>
            </div>
            <Field label="Primary Facility" error={errors.facility}>
              {sel("facility", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Admin ─────────────────────────────── */}
        {role === "admin" && (
          <>
            <Field label="HRIS Employee ID" hint="From your HR system (e.g. ADMIN-KE-00441)" error={errors.regNumber}>
              {inp("regNumber", "text", "e.g. ADMIN-KE-00441")}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Department" error={errors.department}>
                {inp("department", "text", "e.g. Health Informatics")}
              </Field>
              <Field label="Facility Level">
                {sel("facilityLevel", [
                  { value: "level4", label: "Level 4" },
                  { value: "level5", label: "Level 5" },
                  { value: "level6", label: "Level 6" },
                  { value: "moh",    label: "MOH HQ" },
                ])}
              </Field>
            </div>
            <Field label="Primary Facility" error={errors.facility}>
              {sel("facility", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Lab Technician ────────────────────── */}
        {role === "lab" && (
          <>
            <Field label="Laboratory Staff ID" hint="As issued by your facility (e.g. LAB-KE-00231)" error={errors.regNumber}>
              {inp("regNumber", "text", "e.g. LAB-KE-00231")}
            </Field>
            <Field label="Laboratory Department" hint="e.g. Biochemistry, Haematology, Microbiology" error={errors.department}>
              {sel("department", [
                { value: "biochemistry",  label: "Biochemistry" },
                { value: "haematology",   label: "Haematology" },
                { value: "microbiology",  label: "Microbiology" },
                { value: "pathology",     label: "Histopathology" },
                { value: "imaging",       label: "Diagnostic Imaging" },
                { value: "other",         label: "Other" },
              ])}
            </Field>
            <Field label="Primary Facility" error={errors.facility}>
              {sel("facility", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Pharmacist ────────────────────────── */}
        {role === "pharmacy" && (
          <>
            <Field label="Pharmacy Registration ID" hint="e.g. PHARM-00441 from your PPB licence" error={errors.regNumber}>
              {inp("regNumber", "text", "e.g. PHARM-00441")}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Practice Setting">
                {sel("department", [
                  { value: "inpatient",  label: "Inpatient Pharmacy" },
                  { value: "outpatient", label: "Outpatient Pharmacy" },
                  { value: "oncology",   label: "Oncology Pharmacy" },
                  { value: "community",  label: "Community Pharmacy" },
                  { value: "other",      label: "Other" },
                ])}
              </Field>
              <Field label="Years of Experience">
                {inp("yearsExp", "number", "e.g. 4")}
              </Field>
            </div>
            <Field label="Primary Facility" error={errors.facility}>
              {sel("facility", FACILITIES.map(f => ({ value: f, label: f })))}
            </Field>
          </>
        )}

        {/* ── Common: contact + credentials ─────── */}
        <div style={{ borderTop: "1px solid rgba(0,212,255,0.08)", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#3e637a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 600 }}>
            Contact & Credentials
          </div>
          <Field label="Institutional / Personal Email" error={errors.email}>
            {inp("email", "email", "e.g. grace.kamau@knh.go.ke")}
          </Field>
          <Field label="Mobile Number" hint="Kenyan number — used for OTP verification" error={errors.phone}>
            {inp("phone", "tel", "e.g. 0712 345 678")}
          </Field>
          <Field label="Password" hint="Minimum 8 characters, mix letters and numbers" error={errors.password}>
            <div style={{ position: "relative" }}>
              {inp("password", "password", "Create a strong password")}
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#3e637a", cursor: "pointer", fontSize: 13 }}>
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password" error={errors.confirmPwd}>
            {inp("confirmPwd", "password", "Re-enter your password")}
          </Field>
          {role === "patient" && (
            <Field label="4-Digit UniHealth PIN" hint="Used for quick access — keep this private" error={errors.pin}>
              <input
                className="reg-input"
                type="password"
                maxLength={4}
                value={form.pin}
                onChange={e => set("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="● ● ● ●"
                style={{ ...inputStyle, letterSpacing: "0.4em", textAlign: "center", fontSize: 18,
                  borderColor: errors.pin ? "#ff3366" : "rgba(0,212,255,0.18)" }}
              />
            </Field>
          )}
        </div>

        {/* ── Password strength bar ─────────────── */}
        {form.password.length > 0 && (() => {
          const len = form.password.length;
          const hasUpper = /[A-Z]/.test(form.password);
          const hasNum   = /\d/.test(form.password);
          const hasSpec  = /[^A-Za-z0-9]/.test(form.password);
          const score    = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);
          const label    = ["", "Weak", "Fair", "Good", "Strong"][score];
          const color    = ["", "#ff3366", "#ffb830", "#00d4ff", "#00e5a0"][score];
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#3e637a" }}>Password strength</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${score * 25}%`,
                  background: color, transition: "width 0.3s, background 0.3s" }} />
              </div>
            </div>
          );
        })()}

        {/* ── KDPA consent ──────────────────────── */}
        <div style={{ padding: "12px 14px", background: "rgba(0,212,255,0.04)",
          border: "1px solid rgba(0,212,255,0.12)", borderRadius: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "#7ab8d8", lineHeight: 1.65 }}>
            By creating an account you agree to UniHealth's{" "}
            <span style={{ color: "#00d4ff", cursor: "pointer" }}>Terms of Service</span> and{" "}
            <span style={{ color: "#00d4ff", cursor: "pointer" }}>Privacy Policy</span>.
            Your data is protected under the{" "}
            <strong style={{ color: "#00e5a0" }}>Kenya Data Protection Act 2019 (KDPA)</strong>.
            You may request erasure or portability at any time from your profile settings.
          </div>
        </div>

        <button type="submit" className="reg-btn"
          style={{ width: "100%", padding: "13px", borderRadius: 10, background: cfg.color,
            border: "none", color: "#05091a", fontSize: 15, fontWeight: 800, cursor: "pointer",
            transition: "transform 0.15s, box-shadow 0.15s",
            boxShadow: `0 0 24px ${cfg.color}44` }}>
          Continue to Verification →
        </button>
      </form>
    </div>
  );
}

// ── Step 3: OTP verification ─────────────────────────────────────────
function StepOtp({ role, email, onBack, onVerify }: {
  role: RoleKey; email: string; onBack: () => void; onVerify: () => void;
}) {
  const cfg = R[role];
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleDigit = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    setError("");
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs[i - 1].current?.focus();
    if (e.key === "ArrowLeft" && i > 0)  refs[i - 1].current?.focus();
    if (e.key === "ArrowRight" && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setCode(digits.split(""));
      refs[5].current?.focus();
    }
  };

  const submit = () => {
    const full = code.join("");
    if (full.length < 6) { setError("Enter the complete 6-digit code."); return; }
    // In production: validate against backend. For demo, any 6-digit code passes.
    onVerify();
  };

  const resend = () => {
    setResent(true); setCountdown(30);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="reg-card-in">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📲</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ddf0ff", margin: "0 0 8px" }}>
          Verify your identity
        </h2>
        <p style={{ fontSize: 13, color: "#7ab8d8", margin: 0, lineHeight: 1.6 }}>
          A 6-digit verification code was sent to{" "}
          <strong style={{ color: cfg.color }}>{email || "your email"}</strong>
          <br />Enter it below to activate your {cfg.label} account.
        </p>
      </div>

      {/* OTP digit inputs */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        {code.map((d, i) => (
          <input key={i} ref={refs[i]}
            type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            style={{
              width: 46, height: 54, textAlign: "center", fontSize: 22, fontWeight: 800,
              background: d ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${error ? "#ff3366" : d ? cfg.color : "rgba(0,212,255,0.18)"}`,
              borderRadius: 10, color: "#ddf0ff", outline: "none", fontFamily: "inherit",
              transition: "border-color 0.15s, background 0.15s",
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#ff3366", marginBottom: 12 }}>{error}</div>
      )}

      <button onClick={submit} className="reg-btn"
        style={{ width: "100%", padding: "13px", borderRadius: 10, background: cfg.color,
          border: "none", color: "#05091a", fontSize: 15, fontWeight: 800, cursor: "pointer",
          marginBottom: 16, boxShadow: `0 0 20px ${cfg.color}44` }}>
        Verify & Create Account
      </button>

      <div style={{ textAlign: "center", fontSize: 12, color: "#3e637a" }}>
        {countdown > 0 ? (
          <span>Resend code in <strong style={{ color: "#7ab8d8" }}>{countdown}s</strong></span>
        ) : (
          <button onClick={resend} style={{ background: "none", border: "none", color: "#00d4ff",
            cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {resent ? "✓ Code resent!" : "Resend code"}
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#3e637a",
          cursor: "pointer", fontSize: 12 }}>
          ← Back to registration
        </button>
      </div>

      <div style={{ marginTop: 18, padding: "10px 12px", background: "rgba(0,212,255,0.04)",
        border: "1px solid rgba(0,212,255,0.10)", borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: "#3e637a", lineHeight: 1.6 }}>
          <strong style={{ color: "#7ab8d8" }}>Demo mode:</strong>{" "}
          Enter any 6 digits to proceed. In production, a real OTP is delivered via{" "}
          {role === "patient" ? "SMS to your phone number." : "email to your institutional address."}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Account created ──────────────────────────────────────────
function StepSuccess({ role, name }: { role: RoleKey; name: string }) {
  const navigate = useNavigate();
  const cfg = R[role];

  useEffect(() => {
    const t = setTimeout(() => navigate("/sign-in"), 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="reg-card-in" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 16, animation: "reg-pop 0.5s ease both" }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "#ddf0ff", margin: "0 0 10px" }}>
        Account created!
      </h2>
      <p style={{ fontSize: 14, color: "#7ab8d8", lineHeight: 1.65, marginBottom: 22 }}>
        Welcome to UniHealth, <strong style={{ color: cfg.color }}>{name || "new member"}</strong>.
        Your <strong style={{ color: cfg.color }}>{cfg.label}</strong> account is pending review by your facility administrator.
        You will receive a confirmation email once access is granted.
      </p>

      <div style={{ padding: "16px 18px", background: cfg.bg,
        border: `1px solid ${cfg.border}`, borderRadius: 14, marginBottom: 22 }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>{cfg.icon}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: cfg.color, marginBottom: 4 }}>{cfg.label} Portal</div>
        <div style={{ fontSize: 12, color: "#7ab8d8" }}>
          {role === "patient"
            ? "You can sign in now and book your first appointment."
            : "Your facility admin will activate your account within 24 hours."}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => navigate("/sign-in")}
          style={{ padding: "12px", borderRadius: 10, background: cfg.color,
            border: "none", color: "#05091a", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          Sign In Now →
        </button>
        <button onClick={() => navigate("/")}
          style={{ padding: "11px", borderRadius: 10, background: "transparent",
            border: "1px solid rgba(0,212,255,0.22)", color: "#7ab8d8",
            fontSize: 13, cursor: "pointer" }}>
          Back to Home
        </button>
      </div>

      <div style={{ marginTop: 18, fontSize: 11, color: "#3e637a" }}>
        <span style={{ animation: "reg-blink 1.8s infinite", display: "inline-block" }}>●</span>
        {" "}Redirecting to sign-in in 5 seconds…
      </div>
    </div>
  );
}

// ── Left brand panel (register-specific) ────────────────────────────
function RegisterBrandPanel({ step }: { step: number }) {
  const STEPS = [
    { n: 1, label: "Choose Role" },
    { n: 2, label: "Your Details" },
    { n: 3, label: "Verify OTP" },
    { n: 4, label: "Account Ready" },
  ];

  const BENEFITS = [
    { icon: "🔒", title: "KDPA Compliant", body: "Your data is protected under Kenya's Data Protection Act 2019. Full audit trail, consent management, and right to erasure." },
    { icon: "🌐", title: "One Record, Every Hospital", body: "Your UniHealth profile follows you across all 12 pilot facilities — no re-registration, no lost files." },
    { icon: "📱", title: "Works on Any Device", body: "Optimised for mobile, tablet, and desktop. Access your health records from anywhere in Kenya." },
    { icon: "🤖", title: "AI-Assisted Care", body: "Phase 3 AI features flag abnormal results, assist diagnosis, and forecast care needs — all within your dashboard." },
  ];

  return (
    <div className="lp" style={{ background: "none" }}>
      <div className="flag" />
      <div className="li">
        {/* Brand */}
        <div style={{ marginBottom: 32 }}>
          <div className="brand">
            <div className="brand-sq brand-sq--logo" aria-hidden>
              <UniHealthLogo idPrefix="register" className="unihealth-logo" />
            </div>
            <div>
              <div className="brand-nm">UniHealth</div>
              <div className="brand-tg">Innovation at its core</div>
            </div>
          </div>
          <div className="sys-pill">
            <div className="dot" />
            Create your account — 2 minutes
          </div>
        </div>

        {/* Step tracker */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
            letterSpacing: "0.12em", fontWeight: 600, marginBottom: 14 }}>Registration Steps</div>
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "#00e5a0" : active ? "rgba(0,229,160,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${done || active ? "#00e5a0" : "rgba(255,255,255,0.12)"}`,
                  fontSize: 11, fontWeight: 800, color: done ? "#05091a" : active ? "#00e5a0" : "rgba(255,255,255,0.2)",
                }}>
                  {done ? "✓" : s.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 400,
                  color: done ? "#00e5a0" : active ? "#ddf0ff" : "rgba(255,255,255,0.3)" }}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", left: 33, marginTop: 28, width: 1.5, height: 10,
                    background: done ? "#00e5a0" : "rgba(255,255,255,0.08)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div style={{ flex: 1 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#ddf0ff" }}>{b.title}</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, margin: "0 0 0 24px" }}>
                {b.body}
              </p>
            </div>
          ))}
        </div>

        <div className="lfooter">
          <span>KDPA 2019 · FHIR R5 · ISO 27001</span>
          <span>© UniHealth 2026</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export function CreateAccountPage() {
  const [step, setStep]       = useState(1);
  const [role, setRole]       = useState<RoleKey | null>(null);
  const [form, setForm]       = useState<FormState | null>(null);

  const handleRoleSelect = (r: RoleKey) => {
    setRole(r);
    setStep(2);
  };

  const handleFormSubmit = (f: FormState) => {
    setForm(f);
    setStep(3);
  };

  return (
    <div className="sign-in-root">
      <style>{KEYFRAMES}</style>
      <RegisterBrandPanel step={step} />
      <div className="rp">
        <div className="card">
          <div className="cstripe" />
          <div className="cbody" style={{ minHeight: step === 1 ? 520 : 480 }}>
            {step === 1 && <StepPickRole onSelect={handleRoleSelect} />}
            {step === 2 && role && (
              <StepFillForm
                role={role}
                onBack={() => { setStep(1); setRole(null); }}
                onSubmit={handleFormSubmit}
              />
            )}
            {step === 3 && role && form && (
              <StepOtp
                role={role}
                email={form.email}
                onBack={() => setStep(2)}
                onVerify={() => setStep(4)}
              />
            )}
            {step === 4 && role && form && (
              <StepSuccess role={role} name={form.fullName} />
            )}
          </div>
          <div className="cfoot">
            <span>UniHealth · Registration · 2026</span>
            <span>v2.0 · KDPA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
