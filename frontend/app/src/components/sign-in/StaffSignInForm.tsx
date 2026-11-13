import { useEffect, useState } from "react";
import { DashIcon } from "../brand/DashIcon";
import type { RoleKey } from "../../theme/tokens";
import { ROLE_CONFIG } from "../../lib/signInConfig";
import { newCaptchaChallenge } from "../../lib/captcha";
import { computePasswordStrength } from "../../lib/passwordStrength";
import { fetchPasswordGrantToken, oidcEnabled } from "../../lib/oidc";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECS = 30;

type Props = {
  role: Exclude<RoleKey, "patient">;
  onBack: () => void;
  onSuccess: (contact: string, via: "email") => void;
  addAudit: (m: string) => void;
  onLockoutIntrusion: () => void;
  onStaffFailedAttempts?: (n: number) => void;
};

export function StaffSignInForm({
  role,
  onBack,
  onSuccess,
  addAudit,
  onLockoutIntrusion,
  onStaffFailedAttempts,
}: Props) {
  const c = ROLE_CONFIG[role];
  const [reg, setReg] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwVisible, setPwVisible] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemain, setLockoutRemain] = useState(0);
  const [captcha, setCaptcha] = useState(() => newCaptchaChallenge());
  const [captchaInput, setCaptchaInput] = useState("");
  const [staffErr, setStaffErr] = useState("");
  const [loading, setLoading] = useState(false);

  const pwStrength = computePasswordStrength(pw);

  useEffect(() => {
    onStaffFailedAttempts?.(failedAttempts);
  }, [failedAttempts, onStaffFailedAttempts]);

  useEffect(() => {
    if (lockoutRemain <= 0) return;
    const t = window.setTimeout(() => {
      setLockoutRemain((r) => {
        if (r <= 1) {
          setFailedAttempts(0);
          onLockoutIntrusion();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [lockoutRemain, onLockoutIntrusion]);

  const showCaptcha = failedAttempts >= 2;
  const lockoutActive = lockoutRemain > 0;

  function refreshCaptcha() {
    setCaptcha(newCaptchaChallenge());
    setCaptchaInput("");
  }

  function triggerLockout() {
    addAudit("SECURITY LOCKOUT_TRIGGERED role=" + role + " attempts=3");
    setLockoutRemain(LOCKOUT_SECS);
  }

  function submit() {
    setStaffErr("");
    if (lockoutActive) return;

    if (showCaptcha) {
      const ans = parseInt(captchaInput, 10);
      if (Number.isNaN(ans) || ans !== captcha.answer) {
        setStaffErr("Security check failed. Please solve the CAPTCHA correctly.");
        refreshCaptcha();
        return;
      }
    }

    if (!reg.trim()) {
      setStaffErr(`Please enter your ${c.regLbl}.`);
      return;
    }
    if (!c.regRx!.test(reg.replace(/\s/g, ""))) {
      setStaffErr(c.regErr!);
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStaffErr("Enter a valid institutional email address.");
      return;
    }
    if (!pw || pw.length < 8) {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      addAudit(`AUTH FAILED_ATTEMPT role=${role} reason=weak_password attempts=${next}`);
      if (next >= MAX_ATTEMPTS) triggerLockout();
      else setStaffErr("Password must be at least 8 characters. Please use a strong password.");
      return;
    }
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      addAudit(`AUTH FAILED_ATTEMPT role=${role} reason=policy_violation attempts=${next}`);
      if (next >= MAX_ATTEMPTS) triggerLockout();
      else setStaffErr("Password must contain uppercase letters and numbers.");
      return;
    }

    setLoading(true);
    addAudit(`AUTH LOGIN_ATTEMPT role=${role} email=${email.replace(/(.{2}).+(@.+)/, "$1***$2")}`);
    (async () => {
      try {
        if (oidcEnabled()) {
          await fetchPasswordGrantToken(role, pw);
          addAudit(`AUTH OIDC_TOKEN role=${role}`);
        }
        onSuccess(email, "email");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        setStaffErr(msg);
        addAudit(`AUTH OIDC_FAILED role=${role}`);
      } finally {
        setLoading(false);
      }
    })();
  }

  const lockoutDisplay =
    lockoutRemain >= 0
      ? `${String(Math.floor(lockoutRemain / 60)).padStart(2, "0")}:${String(lockoutRemain % 60).padStart(2, "0")}`
      : "00:00";

  function stubbedAlt(kind: string) {
    addAudit(`AUTH ALT_${kind} role=${role}`);
    window.setTimeout(() => {
      onSuccess(email || "staff@hospital.go.ke", "email");
    }, 1100);
  }

  return (
    <div className="si-step">
      <div className="si-step-scroll">
      <div className="stepper">
        <div className="sdot done">✓</div>
        <div className="sline done" />
        <div className="sdot act">2</div>
        <div className="sline" />
        <div className="sdot">3</div>
      </div>
      <button type="button" className="bkbn" onClick={onBack}>
        ← Back
      </button>
      <div className="shd">
        <div className="sico" aria-hidden>
          <DashIcon icon={c.ico} idPrefix={`signin-staff-${role}`} />
        </div>
        <div className="stitle">{c.title}</div>
        <div className="ssub">{c.sub}</div>
      </div>

      <div
        id="lockoutBanner"
        className={`lockout${lockoutActive ? " is-visible" : ""}`}
        aria-live="polite"
      >
        <div className="lockout-ico">🔒</div>
        <div className="lockout-ti">Account Temporarily Locked</div>
        <div className="lockout-su">
          Too many failed attempts. Account locked for security.
          <br />
          Your attempt has been logged in the audit trail.
        </div>
        <div className="lockout-cd">{lockoutDisplay}</div>
        <div style={{ fontSize: "10.5px", color: "#b91c1c" }}>
          AI anomaly detection has been notified. Contact your facility administrator if this wasn&apos;t
          you.
        </div>
      </div>

      <div className={`captcha-wrap${showCaptcha && !lockoutActive ? " is-visible" : ""}${showCaptcha && !lockoutActive ? "" : " hidden"}`}>
        <div className="captcha-lbl">🤖 Security Check — Confirm you are human</div>
        <div className="captcha-q">{captcha.question}</div>
        <div className="captcha-row">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Your answer"
            maxLength={4}
            autoComplete="off"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
          />
          <button type="button" className="captcha-refresh" onClick={refreshCaptcha} title="New question">
            🔄
          </button>
        </div>
      </div>

      <div id="staffFormInner" className={lockoutActive ? "form-locked" : ""}>
        <div className="si-hint grn">
          <span className="si-hint-ico" aria-hidden>🔐</span>
          <div className="si-hint-body">
            <span className="si-hint-head">{c.staffNote}</span>
          </div>
        </div>
        <div className={`errbanner${staffErr ? " is-visible" : ""}`} role="alert">
          <span>⚠️</span>
          <span>{staffErr || "Please check your credentials and try again."}</span>
        </div>
        <div className="fields">
          <div className="field">
            <label htmlFor="regIn">{c.regLbl}</label>
            <div className="fw">
              <span className="fi">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                id="regIn"
                type="text"
                placeholder={c.regPH}
                autoComplete="username"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
              />
            </div>
            <span className="fhint">{c.regHint}</span>
          </div>
          <div className="field">
            <label htmlFor="emailIn">Institutional Email</label>
            <div className="fw">
              <span className="fi">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </span>
              <input
                id="emailIn"
                type="email"
                placeholder="you@hospital.go.ke"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <div className="lbl-row">
              <label htmlFor="pwIn">Password</label>
              <button type="button" className="fgt">
                Forgot password?
              </button>
            </div>
            <div className="fw">
              <span className="fi">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                id="pwIn"
                type={pwVisible ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <button type="button" className="eyebn" onClick={() => setPwVisible((v) => !v)} aria-label="Toggle password visibility">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  {pwVisible ? (
                    <path
                      fillRule="evenodd"
                      d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <>
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {!!pw && (
              <div className="pw-strength">
                <div className="pw-bars">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`pw-bar${i < Math.min(pwStrength.score, 4) ? " " + pwStrength.cls : ""}`}
                    />
                  ))}
                </div>
                <div className="pw-lbl" style={{ color: pwStrength.labelColor }}>
                  {pwStrength.label}
                </div>
                <div className="pw-reqs">
                  <div className={`req${pwStrength.hasLen ? " met" : ""}`}>At least 8 characters</div>
                  <div className={`req${pwStrength.hasUpper ? " met" : ""}`}>Uppercase letter (A–Z)</div>
                  <div className={`req${pwStrength.hasNum ? " met" : ""}`}>Number (0–9)</div>
                  <div className={`req${pwStrength.hasSym ? " met" : ""}`}>Special character (!@#$…)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {failedAttempts > 0 && (
          <div className="attempts-row" style={{ display: "flex" }}>
            <span style={{ fontSize: "10px" }}>Attempts:</span>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`att-dot${i <= failedAttempts ? " used" : ""}`} />
            ))}
            <span style={{ fontSize: "10px", color: "var(--r)", fontWeight: 700 }}>
              {MAX_ATTEMPTS - failedAttempts > 0
                ? `${MAX_ATTEMPTS - failedAttempts} attempt${MAX_ATTEMPTS - failedAttempts === 1 ? "" : "s"} remaining`
                : ""}
            </span>
          </div>
        )}
      </div>
      </div>

      <div className="si-step-actions">
        <button
          className="btn"
          type="button"
          disabled={loading || lockoutActive}
          onClick={submit}
        >
          <div className="bspin" style={{ display: loading ? "block" : "none" }} />
          <span>{loading ? "Signing in…" : "Sign In"}</span>
          {!loading && (
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        <div className="orline">
          <span>or sign in with</span>
        </div>
        <div className="alt-row">
          <AltButton label="💳 Smart Card" onActivate={() => stubbedAlt("smartcard")} />
          <AltButton label="📱 Practice 360" onActivate={() => stubbedAlt("p360")} />
        </div>
      </div>
    </div>
  );
}

function AltButton({ label, onActivate }: { label: string; onActivate: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="altbn"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        window.setTimeout(() => {
          setBusy(false);
          onActivate();
        }, 800);
      }}
    >
      {busy ? "⏳ Connecting…" : label}
    </button>
  );
}
