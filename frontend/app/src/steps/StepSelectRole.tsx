import { useEffect } from "react";
import { DashIcon } from "../components/brand/DashIcon";
import { isBrandIcon } from "../components/brand/brandIcon";
import type { RoleKey } from "../theme/tokens";
import { ROLE_CONFIG } from "../lib/signInConfig";
import { getPilotRole, PILOT_ROLE_ORDER } from "../lib/pilotRoles";

type Props = {
  selected: RoleKey | null;
  onSelect: (r: RoleKey) => void;
  onContinue: () => void;
};

export function StepSelectRole({ selected, onSelect, onContinue }: Props) {
  const cfg = selected ? ROLE_CONFIG[selected] : null;

  useEffect(() => {
    if (!selected) return;
    document.getElementById(`role-opt-${selected}`)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

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
        <div className="sico" aria-hidden>
          <DashIcon icon="role.patient" idPrefix="signin-pick-role" />
        </div>
        <div className="stitle">Select your role</div>
        <div className="ssub">Choose the role that matches your access level</div>
      </div>

      {/* ── Role picker — horizontal scroll ── */}
      <div className="rscroll-wrap">
        <p className="rscroll-hint" aria-hidden="true">
          <span>Scroll for more roles</span>
          <span className="rscroll-arrows">← →</span>
        </p>
        <div
          className="rscroll"
          role="listbox"
          aria-label="Select your role"
          aria-activedescendant={selected ? `role-opt-${selected}` : undefined}
        >
          {PILOT_ROLE_ORDER.map((r) => {
            const pilot = getPilotRole(r);
            const isSel = selected === r;
            return (
              <button
                key={r}
                id={`role-opt-${r}`}
                type="button"
                role="option"
                aria-selected={isSel}
                className={`rc${isSel ? " sel" : ""}`}
                onClick={() => onSelect(r)}
              >
                <div className="rchk" aria-hidden>✓</div>
                <div className="remi" aria-hidden style={{ color: pilot.color }}>
                  <DashIcon icon={pilot.icon} idPrefix={`role-tile-${r}`} />
                </div>
                <div className="rnm">{pilot.signInName}</div>
                <div className="rds">{pilot.signInDesc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Role notice box ── */}
      {cfg && (
        <div className={`role-note ${cfg.noteClass}`} role="status" aria-live="polite">
          <DashIcon
            icon={cfg.noteIco}
            idPrefix={`role-note-${selected ?? "none"}`}
            className="role-note-ico"
            size={isBrandIcon(cfg.noteIco) ? 22 : undefined}
          />
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
