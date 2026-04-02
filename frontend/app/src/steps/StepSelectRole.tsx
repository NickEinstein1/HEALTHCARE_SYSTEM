import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";

const ROLES: RoleKey[] = ["doctor", "nurse", "admin", "patient"];

type Props = {
  selected: RoleKey | null;
  onSelect: (r: RoleKey) => void;
  onContinue: () => void;
};

export function StepSelectRole({ selected, onSelect, onContinue }: Props) {
  const cfg = selected ? ROLE_CONFIG[selected] : null;

  return (
    <div className="fade">
      <div className="stepper">
        <div className="sdot act">1</div>
        <div className="sline" />
        <div className="sdot">2</div>
        <div className="sline" />
        <div className="sdot">3</div>
      </div>
      <div className="shd">
        <div className="sico">👤</div>
        <div className="stitle">Select your role</div>
        <div className="ssub">Your role determines which verification system is used</div>
      </div>
      <div className="rgrid">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={`rc${selected === r ? " sel" : ""}`}
            onClick={() => onSelect(r)}
          >
            <div className="rchk">✓</div>
            <div className="remi">{ROLE_CONFIG[r].ico}</div>
            <div className="rnm">
              {r === "doctor" && "Doctor"}
              {r === "nurse" && "Nurse / CO"}
              {r === "admin" && "Administrator"}
              {r === "patient" && "Patient"}
            </div>
            <div className="rds">
              {r === "doctor" && "Physician · Specialist"}
              {r === "nurse" && "Nurse · Clinical Officer"}
              {r === "admin" && "Hospital · System Admin"}
              {r === "patient" && "View health records"}
            </div>
          </button>
        ))}
      </div>
      {cfg && (
        <div className={`nbox ${cfg.noteClass}`}>
          <span className="ni">{cfg.noteIco}</span>
          <span dangerouslySetInnerHTML={{ __html: cfg.note }} />
        </div>
      )}
      <button className="btn" type="button" disabled={!selected} onClick={onContinue}>
        Continue
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
