import { BRAND_ICON, isBrandIcon } from "./brandIcon";
import { UniHealthLogo } from "./UniHealthLogo";

type Props = {
  icon: string;
  idPrefix?: string;
  className?: string;
  /** When set, brand mark uses this pixel size (otherwise CSS controls dimensions). */
  size?: number;
};

/** Renders a dashboard/landing icon: UniHealth mark or emoji fallback. */
export function DashIcon({ icon, idPrefix = "dash-ico", className, size }: Props) {
  if (isBrandIcon(icon)) {
    return (
      <span className={className ? `${className} dash-icon--brand` : "dash-icon dash-icon--brand"} aria-hidden>
        <UniHealthLogo idPrefix={idPrefix} className="unihealth-logo dash-icon__logo" size={size} />
      </span>
    );
  }
  return (
    <span className={className ?? "dash-icon"} aria-hidden>
      {icon}
    </span>
  );
}

export { BRAND_ICON };
