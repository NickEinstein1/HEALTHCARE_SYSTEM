/**
 * Role portal icons — real Lucide icons (identical stroke family, not emoji / AI paths).
 */
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  FlaskConical,
  HeartPulse,
  Pill,
  Settings,
  Stethoscope,
  UserRound,
  WalletCards,
} from "lucide-react";

type IconProps = {
  className?: string;
  title?: string;
};

const lucideDefaults: LucideProps = {
  size: "100%",
  strokeWidth: 1.75,
  absoluteStrokeWidth: false,
  "aria-hidden": true,
};

function RoleLucide({
  Icon,
  className,
  title,
}: IconProps & { Icon: LucideIcon }) {
  return (
    <Icon
      {...lucideDefaults}
      className={className}
      role="img"
      aria-label={title}
    />
  );
}

/** Admin — settings / control plane */
export function IconAdmin({ className, title = "Admin" }: IconProps) {
  return <RoleLucide Icon={Settings} className={className} title={title} />;
}

/** Doctor — stethoscope */
export function IconDoctor({ className, title = "Doctor" }: IconProps) {
  return <RoleLucide Icon={Stethoscope} className={className} title={title} />;
}

/** Nurse — heart pulse / care */
export function IconNurse({ className, title = "Nurse" }: IconProps) {
  return <RoleLucide Icon={HeartPulse} className={className} title={title} />;
}

/** Billing — wallet / finance */
export function IconBilling({ className, title = "Billing" }: IconProps) {
  return <RoleLucide Icon={WalletCards} className={className} title={title} />;
}

/** Patient — person */
export function IconPatient({ className, title = "Patient" }: IconProps) {
  return <RoleLucide Icon={UserRound} className={className} title={title} />;
}

/** Laboratory — flask (fallback microscope for lab contexts) */
export function IconLab({ className, title = "Laboratory" }: IconProps) {
  return <RoleLucide Icon={FlaskConical} className={className} title={title} />;
}

/** Pharmacy — pill */
export function IconPharmacy({ className, title = "Pharmacy" }: IconProps) {
  return <RoleLucide Icon={Pill} className={className} title={title} />;
}

export const ROLE_ICON_KEYS = [
  "role.admin",
  "role.doctor",
  "role.nurse",
  "role.billing",
  "role.patient",
  "role.lab",
  "role.pharmacy",
] as const;

export type RoleIconKey = (typeof ROLE_ICON_KEYS)[number];

/** Map legacy emoji + role keys → Lucide role key */
const EMOJI_TO_KEY: Record<string, RoleIconKey> = {
  "⚙": "role.admin",
  "⚙️": "role.admin",
  "🗂️": "role.admin",
  "🩺": "role.doctor",
  "💉": "role.nurse",
  "💰": "role.billing",
  "🙋": "role.patient",
  "🔬": "role.lab",
  "🧫": "role.lab",
  "🧪": "role.lab",
  "💊": "role.pharmacy",
  admin: "role.admin",
  doctor: "role.doctor",
  nurse: "role.nurse",
  billing: "role.billing",
  patient: "role.patient",
  lab: "role.lab",
  pharmacy: "role.pharmacy",
};

export function resolveRoleIconKey(icon: string): RoleIconKey | null {
  if ((ROLE_ICON_KEYS as readonly string[]).includes(icon)) return icon as RoleIconKey;
  return EMOJI_TO_KEY[icon] ?? null;
}

export function RoleIcon({ iconKey, className }: { iconKey: RoleIconKey; className?: string }) {
  switch (iconKey) {
    case "role.admin":
      return <IconAdmin className={className} />;
    case "role.doctor":
      return <IconDoctor className={className} />;
    case "role.nurse":
      return <IconNurse className={className} />;
    case "role.billing":
      return <IconBilling className={className} />;
    case "role.patient":
      return <IconPatient className={className} />;
    case "role.lab":
      return <IconLab className={className} />;
    case "role.pharmacy":
      return <IconPharmacy className={className} />;
    default:
      return null;
  }
}
