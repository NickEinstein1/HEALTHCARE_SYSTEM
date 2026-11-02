import { BRAND_ICON, isBrandIcon } from "./brandIcon";
import { UniHealthLogo } from "./UniHealthLogo";
import { resolveRoleIconKey, RoleIcon } from "./RoleIcons";

type Props = {
  icon: string;
  idPrefix?: string;
  className?: string;
  /** When set, brand mark uses this pixel size (otherwise CSS controls dimensions). */
  size?: number;
};

/** Renders a dashboard/landing icon: UniHealth mark, role SVG, or text fallback. */
export function DashIcon({ icon, idPrefix = "dash-ico", className, size }: Props) {
  if (isBrandIcon(icon)) {
    return (
      <span className={className ? `${className} dash-icon--brand` : "dash-icon dash-icon--brand"} aria-hidden>
        <UniHealthLogo idPrefix={idPrefix} className="unihealth-logo dash-icon__logo" size={size} />
      </span>
    );
  }

  const roleKey = resolveRoleIconKey(icon);
  if (roleKey) {
    return (
      <span
        className={className ? `${className} dash-icon dash-icon--role` : "dash-icon dash-icon--role"}
        aria-hidden
      >
        <RoleIcon iconKey={roleKey} className="dash-icon__role-svg" />
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
