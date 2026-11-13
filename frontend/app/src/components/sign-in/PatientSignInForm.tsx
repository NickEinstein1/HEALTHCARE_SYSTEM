import { useEffect, useState, type KeyboardEvent } from "react";
import { DashIcon } from "../brand/DashIcon";
import { ROLE_CONFIG, ID_TYPES, type IdTypeKey } from "../../lib/signInConfig";
import { fetchPasswordGrantToken, oidcEnabled } from "../../lib/oidc";

const PHONE_RX = /^(\+2547|\+2541|07|01)\d{8,9}$/;

type Props = {
  onBack: () => void;
  onSuccess: (phone: string, via: "sms") => void;
  addAudit: (m: string) => void;
};

export function PatientSignInForm({ onBack, onSuccess, addAudit }: Props) {
  const c = ROLE_CONFIG.patient;
  const [idType, setIdType] = useState<IdTypeKey>("national");
  const [patId, setPatId] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [patErr, setPatErr] = useState("");
  const [loading, setLoading] = useState(false);

  const ic = ID_TYPES[idType];

  useEffect(() => {
    setPatId("");
  }, [idType]);

  function setPinDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setPin((p) => {
      const n = [...p];
      n[i] = d;
      return n;
    });
    if (d && i < 3) {
      const el = document.getElementById(`patient-pin-${i + 2}`);
      el?.focus();
    }
  }

  function onPinKeyDown(i: number, e: KeyboardEvent) {
    if (e.key !== "Backspace") return;
    if (pin[i]) return;
    if (i > 0) document.getElementById(`patient-pin-${i}`)?.focus(); // i = 1-based id of previous cell
  }

  function submit() {
    setPatErr("");
    const id = patId.replace(/\s/g, "");
    const pinStr = pin.join("");
    const ph = phone.replace(/[\s-]/g, "");
    if (!id || !ic.rx.test(id)) {
      setPatErr(ic.err);
      return;
    }
    if (pinStr.length < 4) {
      setPatErr("Enter your complete 4-digit UniHealth PIN.");
      return;
    }
    if (!ph || !PHONE_RX.test(ph)) {
      setPatErr(
        "Enter your registered mobile phone number (e.g. 0712 345 678)."
      );
      return;
    }
    setLoading(true);
    addAudit("AUTH PATIENT_LOGIN_ATTEMPT id_type=" + idType);
    (async () => {
      try {
        if (oidcEnabled()) {
          await fetchPasswordGrantToken("patient", "Changeme1!");
          addAudit("AUTH OIDC_TOKEN role=patient");
        }
        onSuccess(ph, "sms");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        setPatErr(msg);
        addAudit("AUTH OIDC_FAILED role=patient");
      } finally {
        setLoading(false);
      }
    })();
  }

  function stubAlt(kind: string) {
    addAudit(`AUTH ALT_${kind} role=patient`);
    window.setTimeout(() => {
      onSuccess(phone.replace(/[\s-]/g, "") || "0712345678", "sms");
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
          <DashIcon icon={c.ico} idPrefix="signin-patient" />
        </div>
        <div className="stitle">{c.title}</div>
        <div className="ssub">{c.sub}</div>
      </div>

      <div className="si-hint blu">
        <span className="si-hint-ico" aria-hidden>🏛️</span>
        <div className="si-hint-body">
          <span className="si-hint-head">ID type · ID number · 4-digit UniHealth PIN</span>
          <span className="si-hint-sub">Verify via SMS OTP or fingerprint biometric.</span>
        </div>
      </div>
      <div className={`errbanner${patErr ? " is-visible" : ""}`} role="alert">
        <span>⚠️</span>
        <span>{patErr || "ID number or PIN is incorrect. Please try again."}</span>
      </div>
      <div className="fields">
        <div className="field">
          <label htmlFor="idTypeIn">ID Type</label>
          <div className="fw">
            <span className="fi">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <select
              id="idTypeIn"
              value={idType}
              onChange={(e) => setIdType(e.target.value as IdTypeKey)}
            >
              <option value="national">National / Citizen ID</option>
              <option value="passport">🌍 Passport</option>
              <option value="alien">👤 Foreign Resident ID (Alien ID)</option>
              <option value="refugee">🏳️ Refugee ID</option>
              <option value="mandate">📃 Mandate Number</option>
              <option value="temp">📄 Temporary ID</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="patIdIn">{ic.lbl}</label>
          <div className="fw">
            <span className="fi">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 000 6H4a3 3 0 000-6zm2 5a1 1 0 100-2 1 1 0 000 2zm-2 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <input
              id="patIdIn"
              type="text"
              placeholder={ic.ph}
              inputMode={idType === "national" ? "numeric" : "text"}
              maxLength={idType === "national" ? 12 : 24}
              autoComplete="username"
              value={patId}
              onChange={(e) => setPatId(e.target.value)}
            />
          </div>
          <span className="fhint">{ic.hint}</span>
        </div>
        <div className="field">
          <div className="lbl-row">
            <label>4-Digit UniHealth PIN</label>
            <button type="button" className="fgt">
              Forgot PIN?
            </button>
          </div>
          <div className="pin-grid">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                id={`patient-pin-${i + 1}`}
                className={`pin-box${pin[i] ? " f" : ""}`}
                type="password"
                maxLength={1}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin[i]}
                onChange={(e) => setPinDigit(i, e.target.value)}
                onKeyDown={(e) => onPinKeyDown(i, e)}
              />
            ))}
          </div>
          <span className="fhint">The 4-digit PIN you set when registering on UniHealth Patient Portal</span>
        </div>
        <div className="field">
          <label htmlFor="patPhIn">Registered Phone Number</label>
          <div className="fw">
            <span className="fi">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </span>
            <input
              id="patPhIn"
              type="tel"
              placeholder="e.g. 0712 345 678"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <span className="fhint">Phone number linked to your UniHealth Patient Portal account</span>
        </div>
      </div>
      </div>

      <div className="si-step-actions">
        <button className="btn" type="button" disabled={loading} onClick={submit}>
          <div className="bspin" style={{ display: loading ? "block" : "none" }} />
          <span>{loading ? "Verifying with UniHealth…" : "Verify with UniHealth"}</span>
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
          <span>or verify with</span>
        </div>
        <div className="alt-row">
          <AltBusy label="👁️ Biometric" onClick={() => stubAlt("bio")} />
          <AltBusy label="📱 Practice 360" onClick={() => stubAlt("p360")} />
          <AltBusy
            label="📞 *147# USSD"
            onClick={() => {
              addAudit("AUTH ALT_ussd role=patient");
              window.alert("Dial *147# on your UniHealth-registered phone to verify via USSD.");
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AltBusy({ label, onClick }: { label: string; onClick: () => void }) {
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
          onClick();
        }, activeDelay(label));
      }}
    >
      {busy ? "⏳ Connecting…" : label}
    </button>
  );
}

function activeDelay(label: string) {
  if (label.includes("USSD")) return 0;
  return 800;
}
