/**
 * Sign-in master panel glyphs — real Lucide icons (identical stroke family).
 */
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Baby,
  Bot,
  BrainCircuit,
  Briefcase,
  ClipboardList,
  Crosshair,
  FlaskConical,
  Heart,
  KeyRound,
  LayoutDashboard,
  Lock,
  Monitor,
  Network,
  Pill,
  Radio,
  Receipt,
  ScanSearch,
  Scissors,
  Shield,
  Siren,
  Truck,
  UserRound,
  Video,
  Wifi,
  Zap,
} from "lucide-react";

export type MasterGlyphKey =
  | "mod.emr"
  | "mod.billing"
  | "mod.maternity"
  | "mod.nicu"
  | "mod.cic"
  | "mod.old_mutual"
  | "mod.lab"
  | "mod.pharmacy"
  | "mod.radiology"
  | "mod.teleconsult"
  | "mod.icu"
  | "mod.emergency"
  | "mod.surgery"
  | "mod.fetal"
  | "mod.kemsa"
  | "mod.oncology"
  | "mod.ai"
  | "mod.iot"
  | "status.ai"
  | "status.network"
  | "status.cic"
  | "status.old_mutual"
  | "status.tele"
  | "status.maternity"
  | "flow.login"
  | "flow.auth"
  | "flow.role"
  | "flow.api"
  | "flow.dash"
  | "badge.maternity";

const GLYPH_MAP: Record<MasterGlyphKey, LucideIcon> = {
  "mod.emr": ClipboardList,
  "mod.billing": Receipt,
  "mod.maternity": Heart,
  "mod.nicu": Baby,
  "mod.cic": Shield,
  "mod.old_mutual": Briefcase,
  "mod.lab": FlaskConical,
  "mod.pharmacy": Pill,
  "mod.radiology": ScanSearch,
  "mod.teleconsult": Video,
  "mod.icu": Zap,
  "mod.emergency": Siren,
  "mod.surgery": Scissors,
  "mod.fetal": Radio,
  "mod.kemsa": Truck,
  "mod.oncology": Crosshair,
  "mod.ai": BrainCircuit,
  "mod.iot": Wifi,
  "status.ai": Bot,
  "status.network": Network,
  "status.cic": Shield,
  "status.old_mutual": Briefcase,
  "status.tele": Video,
  "status.maternity": Heart,
  "flow.login": KeyRound,
  "flow.auth": Lock,
  "flow.role": UserRound,
  "flow.api": Monitor,
  "flow.dash": LayoutDashboard,
  "badge.maternity": Heart,
};

/** Legacy emoji → Lucide key (keeps older modulePull aliases working). */
const EMOJI_TO_GLYPH: Record<string, MasterGlyphKey> = {
  "📋": "mod.emr",
  "💰": "mod.billing",
  "❤️": "mod.maternity",
  "♥️": "mod.maternity",
  "👶": "mod.nicu",
  "🛡️": "mod.cic",
  "🛡": "mod.cic",
  "💼": "mod.old_mutual",
  "🧪": "mod.lab",
  "💊": "mod.pharmacy",
  "🔍": "mod.radiology",
  "📹": "mod.teleconsult",
  "⚡": "mod.icu",
  "🚨": "mod.emergency",
  "✂️": "mod.surgery",
  "📡": "mod.fetal",
  "🚚": "mod.kemsa",
  "🎯": "mod.oncology",
  "🤖": "mod.ai",
  "📶": "mod.iot",
  "🌐": "status.network",
  "🔑": "flow.login",
  "🔒": "flow.auth",
  "👤": "flow.role",
  "🖥️": "flow.api",
  "🖥": "flow.api",
  "📊": "flow.dash",
  "🚑": "mod.emergency",
};

const lucideDefaults: LucideProps = {
  size: "100%",
  strokeWidth: 1.75,
  absoluteStrokeWidth: false,
  "aria-hidden": true,
};

export function resolveMasterGlyphKey(icon: string): MasterGlyphKey | null {
  if (icon in GLYPH_MAP) return icon as MasterGlyphKey;
  return EMOJI_TO_GLYPH[icon] ?? null;
}

type Props = {
  icon: string;
  className?: string;
  title?: string;
};

/** Renders a Lucide glyph for master/sign-in icons, or null if unknown. */
export function MasterGlyph({ icon, className, title }: Props) {
  const key = resolveMasterGlyphKey(icon);
  if (!key) return null;
  const Icon = GLYPH_MAP[key];
  return (
    <Icon
      {...lucideDefaults}
      className={className}
      role="img"
      aria-label={title ?? key}
    />
  );
}

/** Prefer Lucide; fall back to raw text (emoji) only if unmapped. */
export function MasterGlyphOrText({ icon, className, title }: Props) {
  const glyph = <MasterGlyph icon={icon} className={className} title={title} />;
  if (resolveMasterGlyphKey(icon)) {
    return (
      <span className="master-glyph" aria-hidden>
        {glyph}
      </span>
    );
  }
  return (
    <span className="master-glyph master-glyph--text" aria-hidden>
      {icon}
    </span>
  );
}
