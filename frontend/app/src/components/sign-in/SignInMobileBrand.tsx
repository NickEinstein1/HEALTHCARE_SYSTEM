import { UniHealthLogo } from "../brand/UniHealthLogo";

/** Logo + wordmark above the sign-in card on phones and tablets (left panel hidden). */
export function SignInMobileBrand() {
  return (
    <div className="sign-in-mobile-brand" aria-label="UniHealth">
      <div className="sign-in-mobile-brand-mark" aria-hidden>
        <UniHealthLogo idPrefix="mobile" className="unihealth-logo" />
      </div>
      <div className="sign-in-mobile-brand-text">
        <span className="sign-in-mobile-brand-name">UniHealth</span>
        <span className="sign-in-mobile-brand-tag">Innovation at its core</span>
      </div>
    </div>
  );
}
