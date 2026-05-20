import { UniHealthLogo } from "../brand/UniHealthLogo";

/** Compact UniHealth mark on the sign-in card (right panel). */
export function SignInCardBrand() {
  return (
    <div className="sign-in-card-brand">
      <div className="sign-in-card-brand-mark" aria-hidden>
        <UniHealthLogo idPrefix="card" className="unihealth-logo" />
      </div>
      <div className="sign-in-card-brand-text">
        <span className="sign-in-card-brand-name">UniHealth</span>
        <span className="sign-in-card-brand-tag">Innovation at its core</span>
      </div>
    </div>
  );
}
