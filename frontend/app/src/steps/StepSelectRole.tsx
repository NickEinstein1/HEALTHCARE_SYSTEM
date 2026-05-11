import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";

const ROLES: RoleKey[] = ["doctor", "nurse", "lab", "pharmacy", "admin", "patient"];

const ROLE_LABELS: Record<RoleKey, { name: string; desc: string }> = {
  doctor:   { name: "Doctor",        desc: "Physician · Specialist"   },
  nurse:    { name: "Nurse / CO",    desc: "Nurse · Clinical Officer" },
  lab:      { name: "Laboratory",    desc: "Diagnostics · Lab Staff"  },
  pharmacy: { name: "Pharmacy",      desc: "Dispensing · Pharmacist"  },
  admin:    { name: "Administrator", desc: "System · Facility Admin"  },
  patient:  { name: "Patient",       desc: "Health records portal"    },
};

type Props = {
  selected: RoleKey | null;
  onSelect: (r: RoleKey) => void;
  onContinue: () => void;
};

export function StepSelectRole({ selected, onSelect, onContinue }: Props) {
  const cfg = selected ? ROLE_CONFIG[selected] : null;

  return (
    <div className="fade">
      {/* ── Step indicator ── */}
      <div className="stepper">
        <div className="sdot act">1</div>
        <div className="sline" />
        <div className="sdot">2</div>
        <div className="sline" />
        <div className="sdot">3</div>
      </div>

      {/* ── Header ── */}
      <div className="shd">
        <div className="sico" aria-hidden>👤</div>
        <div className="stitle">Select your role</div>
        <div className="ssub">Choose the role that matches your access level</div>
      </div>

      {/* ── Role grid ── */}
      <div className="rgrid">
        {ROLES.map((r) => {
          const lbl = ROLE_LABELS[r];
          const roleCfg = ROLE_CONFIG[r];
          return (
            <button
              key={r}
              type="button"
              className={`rc${selected === r ? " sel" : ""}`}
              onClick={() => onSelect(r)}
              aria-pressed={selected === r}
            >
              <div className="rchk" aria-hidden>✓</div>
              <div className="remi" aria-hidden>{roleCfg.ico}</div>
              <div className="rnm">{lbl.name}</div>
              <div className="rds">{lbl.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Role notice box ── */}
      {cfg && (
        <div className={`role-note ${cfg.noteClass}`} role="status" aria-live="polite">
          <span className="role-note-ico" aria-hidden>{cfg.noteIco}</span>
          <div className="role-note-content">
            <div className="role-note-head">{cfg.noteHead}</div>
            <div className="role-note-body">{cfg.noteBody}</div>
          </div>
        </div>
      )}

      {/* ── Continue button ── */}
      <button
        className="btn"
        type="button"
        disabled={!selected}
        onClick={onContinue}
      >
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
