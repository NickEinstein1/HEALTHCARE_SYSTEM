import { useCallback, useEffect, useState } from "react";
import type { RoleKey } from "../theme/tokens";
import { BrandPanel } from "../components/sign-in/BrandPanel";
import { StaffSignInForm } from "../components/sign-in/StaffSignInForm";
import { PatientSignInForm } from "../components/sign-in/PatientSignInForm";
import { StepSelectRole } from "../steps/StepSelectRole";
import { StepMFA } from "../steps/StepMFA";
import { StepSuccess } from "../steps/StepSuccess";
import { formatAuditMessage } from "../lib/audit";

const HEARTBEAT_MSGS = [
  "AUTH SESSION_HEARTBEAT uid=system",
  "RBAC POLICY_CHECK resource=ward4B",
  "DATA INTEGRITY_CHECK hash=ok",
  "AI ANOMALY_SCAN result=nominal",
  "AUTH TOKEN_REFRESH uid=admin_ke",
] as const;

const INITIAL_AUDIT: [string, string, string] = [
  "→ AUTH LOGIN_ATTEMPT role=patient ip=197.x.x.x",
  "→ AUTH SESSION_EXPIRE uid=dr_osei_knh",
  "→ RBAC ACCESS_GRANTED ward=4B role=nurse",
];

export function SignInPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<RoleKey | null>(null);
  const [mfaContact, setMfaContact] = useState("");
  const [mfaVia, setMfaVia] = useState<"sms" | "email">("email");
  const [staffFailedAttempts, setStaffFailedAttempts] = useState(0);
  const [aiAttempts, setAiAttempts] = useState(0);
  const [auditLines, setAuditLines] = useState<[string, string, string]>(INITIAL_AUDIT);

  const addAudit = useCallback((msg: string) => {
    const line = formatAuditMessage(msg);
    setAuditLines((prev) => [line, prev[0], prev[1]]);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const msg = HEARTBEAT_MSGS[Math.floor(Math.random() * HEARTBEAT_MSGS.length)];
      addAudit(msg);
    }, 4000);
    return () => clearInterval(id);
  }, [addAudit]);

  function resetToRoleSelect() {
    setStep(1);
    setRole(null);
    setStaffFailedAttempts(0);
  }

  function goStep2(r: RoleKey) {
    setRole(r);
    setStaffFailedAttempts(0);
    setStep(2);
    addAudit("AUTH STEP2_ENTER role=" + r);
  }

  function goMfa(contact: string, via: "sms" | "email") {
    setMfaContact(contact);
    setMfaVia(via);
    addAudit("AUTH MFA_INITIATED role=" + (role ?? "?") + " method=" + via);
    setStep(3);
  }

  function mfaSuccess() {
    addAudit("AUTH LOGIN_SUCCESS role=" + (role ?? "?") + " mfa=verified");
    setStep(4);
  }

  return (
    <>
      <BrandPanel aiAttempts={aiAttempts} auditLines={auditLines} />
      <div className="rp">
        <div className="card">
          <div className="cstripe" />
          <div className="cbody">
            {step === 1 && (
              <StepSelectRole
                selected={role}
                onSelect={setRole}
                onContinue={() => role && goStep2(role)}
              />
            )}
            {step === 2 && role === "patient" && (
              <PatientSignInForm
                onBack={resetToRoleSelect}
                onSuccess={(phone) => goMfa(phone, "sms")}
                addAudit={addAudit}
              />
            )}
            {step === 2 && role && role !== "patient" && (
              <StaffSignInForm
                role={role}
                onBack={resetToRoleSelect}
                onSuccess={(email) => goMfa(email, "email")}
                addAudit={addAudit}
                onLockoutIntrusion={() => setAiAttempts((n) => n + 1)}
                onStaffFailedAttempts={setStaffFailedAttempts}
              />
            )}
            {step === 3 && role && (
              <StepMFA
                role={role}
                contact={mfaContact}
                via={mfaVia}
                staffFailedAttempts={staffFailedAttempts}
                onBack={() => setStep(2)}
                onSuccess={mfaSuccess}
                addAudit={addAudit}
              />
            )}
            {step === 4 && role && <StepSuccess role={role} addAudit={addAudit} />}
          </div>
          <div className="cfoot">
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)" }}>v2.0</div>
          </div>
        </div>
      </div>
    </>
  );
}
