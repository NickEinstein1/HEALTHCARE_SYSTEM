import { useEffect, useState } from "react";
import type { RoleKey } from "../theme/tokens";
import { computeRiskState } from "../lib/risk";

export type MfaTab = "otp" | "bio" | "p360";

type Props = {
  role: RoleKey;
  contact: string;
  via: "sms" | "email";
  staffFailedAttempts: number;
  onBack: () => void;
  onSuccess: () => void;
  addAudit: (m: string) => void;
};

function otpNoteText(contact: string, via: "sms" | "email") {
  if (via === "sms") {
    const c = contact.replace(/\s/g, "");
    return `A 6-digit OTP was sent via SMS to ${c.slice(0, 4)}•••${c.slice(-2)}`;
  }
  return `A 6-digit OTP was sent to ${contact.replace(/(.{2}).+(@.+)/, "$1•••$2")} and your registered phone`;
}

export function StepMFA({ role, contact, via, staffFailedAttempts, onBack, onSuccess, addAudit }: Props) {
  const [tab, setTab] = useState<MfaTab>("otp");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendLeft, setResendLeft] = useState(30);
  const [resendSending, setResendSending] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [p360Loading, setP360Loading] = useState(false);

  const risk = computeRiskState(staffFailedAttempts);
  const otpComplete = otp.every((d) => d.length === 1);

  useEffect(() => {
    if (tab !== "otp") return;
    const t = window.setTimeout(() => document.getElementById("mfa-o1")?.focus(), 80);
    return () => clearTimeout(t);
  }, [tab]);

  useEffect(() => {
    if (tab !== "otp" || resendLeft <= 0 || resendSending) return;
    const t = window.setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [tab, resendLeft, resendSending]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Backspace") return;
      const a = document.activeElement;
      if (!a || !(a instanceof HTMLInputElement)) return;
      if (!a.classList.contains("obox") || a.value) return;
      const ids = ["mfa-o1", "mfa-o2", "mfa-o3", "mfa-o4", "mfa-o5", "mfa-o6"];
      const i = ids.indexOf(a.id);
      if (i > 0) document.getElementById(ids[i - 1])?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function setOtpDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setOtp((o) => {
      const n = [...o];
      n[i] = d;
      return n;
    });
    if (d && i < 5) document.getElementById(`mfa-o${i + 2}`)?.focus();
  }

  function verifyOtp() {
    setOtpLoading(true);
    addAudit("AUTH OTP_VERIFY role=" + role);
    window.setTimeout(() => {
      setOtpLoading(false);
      onSuccess();
    }, 1600);
  }

  function doBio() {
    setBioLoading(true);
    addAudit("AUTH BIOMETRIC_SCAN role=" + role);
    window.setTimeout(() => {
      setBioLoading(false);
      onSuccess();
    }, 2300);
  }

  function doP360() {
    setP360Loading(true);
    addAudit("AUTH P360_PUSH_SENT role=" + role);
    window.setTimeout(() => {
      setP360Loading(false);
      onSuccess();
    }, 3000);
  }

  function resend() {
    if (resendLeft > 0 || resendSending) return;
    setResendSending(true);
    addAudit("AUTH OTP_RESEND role=" + role);
    window.setTimeout(() => {
      setResendSending(false);
      setResendLeft(30);
    }, 800);
  }

  return (
    <div className="fade">
      <div className="stepper">
        <div className="sdot done">✓</div>
        <div className="sline done" />
        <div className="sdot done">✓</div>
        <div className="sline done" />
        <div className="sdot act">3</div>
      </div>
      <button type="button" className="bkbn" onClick={onBack}>
        ← Back
      </button>
      <div className="vtabs">
        <button type="button" className={`vtab${tab === "otp" ? " act" : ""}`} onClick={() => setTab("otp")}>
          📱 SMS OTP
        </button>
        <button type="button" className={`vtab${tab === "bio" ? " act" : ""}`} onClick={() => setTab("bio")}>
          👁️ Biometric
        </button>
        <button type="button" className={`vtab${tab === "p360" ? " act" : ""}`} onClick={() => setTab("p360")}>
          📱 Practice 360
        </button>
      </div>

      <div id="pan-otp" className={tab === "otp" ? "" : "hidden"}>
        <div className={`risk-panel ${risk.level}`}>
          <div className="risk-hd">
            <div className={`risk-lbl ${risk.level}`}>🤖 AI Risk Assessment</div>
            <div className={`risk-score ${risk.level}`}>{risk.scoreLabel}</div>
          </div>
          <div className="risk-signals">
            {risk.signals.map((s, i) => (
              <div key={i} className="risk-sig" style={{ color: s.color }}>
                {s.text}
              </div>
            ))}
          </div>
        </div>
        <div className="shd" style={{ marginBottom: 10 }}>
          <div className="sico">📱</div>
          <div className="stitle">Enter OTP</div>
          <div className="ssub">{otpNoteText(contact, via)}</div>
        </div>
        <div className="otp-grid">
          {otp.map((d, i) => (
            <input
              key={i}
              id={`mfa-o${i + 1}`}
              className={`obox${d ? " f" : ""}`}
              maxLength={1}
              type="text"
              inputMode="numeric"
              value={d}
              onChange={(e) => setOtpDigit(i, e.target.value)}
            />
          ))}
        </div>
        <button className="btn" type="button" disabled={!otpComplete || otpLoading} onClick={verifyOtp}>
          <div className="bspin" style={{ display: otpLoading ? "block" : "none" }} />
          <span>{otpLoading ? "Verifying…" : "Verify Code"}</span>
        </button>
        <div className="resend-row">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            id="resendBtn"
            disabled={resendLeft > 0 || resendSending}
            onClick={resend}
          >
            {resendSending
              ? "Sending…"
              : resendLeft > 0
                ? (
                    <>
                      Resend in <span>{resendLeft}</span>s
                    </>
                  )
                : "Resend code"}
          </button>
        </div>
        <div
          className={`nbox amb${role === "patient" ? "" : " hidden"}`}
          style={{ marginTop: 12 }}
        >
          <span className="ni">⚠️</span>
          <span>
            At Level 4, 5 and 6 facilities, <strong>UniHealth no longer accepts OTP</strong> for service
            approvals (August 2025). Switch to <strong>Biometric</strong> or <strong>Practice 360</strong> tab if
            you are at a hospital.
          </span>
        </div>
      </div>

      <div id="pan-bio" className={tab === "bio" ? "" : "hidden"}>
        <div className="bio">
          <div className="bio-ring">👁️</div>
          <div className="bio-title">Fingerprint / Biometric</div>
          <div className="bio-desc">
            Place your registered finger on the UniHealth biometric reader. Biometric verification is required
            at 3 UniHealth touchpoints.
          </div>
          <div className="bio-3pts">
            <div className="bio-pt">
              <div className="dot2" />
              Admission
            </div>
            <div className="bio-pt">
              <div className="dot2" />
              Procedure Auth.
            </div>
            <div className="bio-pt">
              <div className="dot2" />
              Discharge
            </div>
          </div>
          <div className="nbox grn" style={{ textAlign: "left", marginBottom: 14 }}>
            <span className="ni">✅</span>
            <span>
              Biometric is now <strong>mandatory</strong> at all Level 4, 5 and 6 hospitals under UniHealth
              (August 2025). Fingerprint data is validated in real-time against the central UniHealth registry.
            </span>
          </div>
          <button className="btn" type="button" onClick={doBio} disabled={bioLoading}>
            <div className="bspin" style={{ display: bioLoading ? "block" : "none" }} />
            <span>{bioLoading ? "Scanning…" : "Scan Fingerprint"}</span>
          </button>
        </div>
      </div>

      <div id="pan-p360" className={tab === "p360" ? "" : "hidden"}>
        <div className="bio">
          <div className="bio-ring">📱</div>
          <div className="bio-title">Practice 360 App</div>
          <div className="bio-desc">
            Open the UniHealth <strong>Practice 360</strong> app on your registered device and tap{" "}
            <em>Approve</em> on the push notification to authorise this session.
          </div>
          <div className="nbox amb" style={{ textAlign: "left", marginBottom: 12 }}>
            <span className="ni">📍</span>
            <span>
              <strong>Geo-fenced &amp; geo-tagged:</strong> Practice 360 verifies you are physically at the
              registered facility. Pre-authorisation codes can no longer be shared between healthcare workers
              (UniHealth policy Aug 2025).
            </span>
          </div>
          <div className="nbox blu" style={{ textAlign: "left", marginBottom: 14 }}>
            <span className="ni">📱</span>
            <span>
              Don&apos;t have the app?{" "}
              <a href="#" style={{ color: "#1d4ed8", fontWeight: 700 }}>
                Download Practice 360 from Google Play
              </a>{" "}
              using your UniHealth provider credentials.
            </span>
          </div>
          <button className="btn" type="button" onClick={doP360} disabled={p360Loading}>
            <div className="bspin" style={{ display: p360Loading ? "block" : "none" }} />
            <span>{p360Loading ? "Waiting…" : "Awaiting App Approval…"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
