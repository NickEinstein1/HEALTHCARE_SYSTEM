/**
 * HumanFigure3D — Gender-accurate 3D-style anatomical exoskeleton
 * Renders a detailed SVG skeleton/body figure with depth shading,
 * interactive vitals callouts per body region.
 */
import { useMemo } from "react";
import { DashIcon } from "./brand/DashIcon";

export type VitalCallout = {
  key: string;
  label: string;
  value: string;
  unit: string;
  icon: string;
  region: "head" | "chest" | "abdomen" | "arm-l" | "arm-r" | "leg-l" | "leg-r";
  status?: "normal" | "high" | "low" | "critical";
};

interface Props {
  gender?: "male" | "female";
  vitals?: VitalCallout[];
  onVitalHover?: (key: string | null) => void;
  activeVital?: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  normal:   "#00e5a0",
  high:     "#ff6699",
  low:      "#ffc84a",
  critical: "#ff3366",
};

export function HumanFigure3D({ gender = "male", vitals = [], onVitalHover, activeVital }: Props) {
  // Female figure: narrower shoulders, wider pelvis; male: wider shoulders, narrower pelvis
  const isFemale = gender === "female";
  const shW = isFemale ? 62 : 72;   // shoulder half-width
  const hipW = isFemale ? 60 : 52;  // hip half-width
  const cx = 120;

  // Vitals mapped to screen positions for callout dots
  const dotPositions: Record<string, { x: number; y: number }> = {
    head:    { x: cx, y: 58 },
    chest:   { x: cx, y: 185 },
    abdomen: { x: cx, y: 260 },
    "arm-l": { x: cx - shW - 18, y: 200 },
    "arm-r": { x: cx + shW + 18, y: 200 },
    "leg-l": { x: cx - 24, y: 420 },
    "leg-r": { x: cx + 24, y: 420 },
  };

  const calloutsByRegion = useMemo(() => {
    const m = new Map<string, VitalCallout[]>();
    for (const v of vitals) {
      const arr = m.get(v.region) ?? [];
      arr.push(v);
      m.set(v.region, arr);
    }
    return m;
  }, [vitals]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <svg
        viewBox="0 0 240 600"
        width="100%"
        role="img"
        aria-label={`${gender === "female" ? "Female" : "Male"} anatomical figure with vitals`}
        style={{ display: "block", filter: "drop-shadow(0 8px 32px rgba(0,210,255,0.12))" }}
      >
        <defs>
          {/* 3D bone gradient — light face */}
          <linearGradient id="boneGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="rgba(60,140,200,0.18)" />
            <stop offset="30%" stopColor="rgba(140,210,255,0.35)" />
            <stop offset="60%" stopColor="rgba(100,180,240,0.28)" />
            <stop offset="100%" stopColor="rgba(30,90,160,0.12)" />
          </linearGradient>
          {/* Darker bone edge */}
          <linearGradient id="boneEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="rgba(0,160,220,0.55)" />
            <stop offset="50%" stopColor="rgba(0,210,255,0.80)" />
            <stop offset="100%" stopColor="rgba(0,100,180,0.45)" />
          </linearGradient>
          {/* Spine gradient */}
          <linearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="rgba(0,210,255,0.60)" />
            <stop offset="50%" stopColor="rgba(0,180,220,0.50)" />
            <stop offset="100%" stopColor="rgba(0,150,200,0.40)" />
          </linearGradient>
          {/* Skull fill gradient */}
          <radialGradient id="skullGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%"  stopColor="rgba(150,220,255,0.40)" />
            <stop offset="60%" stopColor="rgba(80,170,230,0.28)" />
            <stop offset="100%" stopColor="rgba(20,80,160,0.16)" />
          </radialGradient>
          {/* Pelvis fill */}
          <linearGradient id="pelvisGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="rgba(80,180,240,0.30)" />
            <stop offset="100%" stopColor="rgba(20,80,160,0.15)" />
          </linearGradient>
          {/* Ribcage fill */}
          <linearGradient id="ribFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="rgba(0,210,255,0.06)" />
            <stop offset="50%" stopColor="rgba(0,180,240,0.10)" />
            <stop offset="100%" stopColor="rgba(0,210,255,0.06)" />
          </linearGradient>
          {/* Glow filter for active dots */}
          <filter id="vitalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Subtle body glow */}
          <filter id="figGlow">
            <feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ─────────────── SKULL ─────────────── */}
        {/* Cranium */}
        <ellipse cx={cx} cy="62" rx="34" ry="40" fill="url(#skullGrad)" stroke="url(#boneEdge)" strokeWidth="1.8" />
        {/* Zygomatic arches */}
        <path d={`M${cx-28} 72 Q${cx-42} 78 ${cx-34} 88`} fill="none" stroke="rgba(0,210,255,0.55)" strokeWidth="1.4" />
        <path d={`M${cx+28} 72 Q${cx+42} 78 ${cx+34} 88`} fill="none" stroke="rgba(0,210,255,0.55)" strokeWidth="1.4" />
        {/* Eye sockets */}
        <ellipse cx={cx-12} cy="62" rx="8" ry="6" fill="rgba(0,30,80,0.45)" stroke="rgba(0,210,255,0.45)" strokeWidth="1" />
        <ellipse cx={cx+12} cy="62" rx="8" ry="6" fill="rgba(0,30,80,0.45)" stroke="rgba(0,210,255,0.45)" strokeWidth="1" />
        {/* Nasal bone */}
        <path d={`M${cx-4} 68 L${cx} 78 L${cx+4} 68`} fill="none" stroke="rgba(0,180,240,0.50)" strokeWidth="1.2" />
        {/* Jaw */}
        <path d={`M${cx-22} 88 Q${cx-26} 100 ${cx-18} 105 L${cx} 108 L${cx+18} 105 Q${cx+26} 100 ${cx+22} 88`}
          fill="rgba(30,80,160,0.12)" stroke="rgba(0,210,255,0.55)" strokeWidth="1.4" />
        {/* Teeth line */}
        <path d={`M${cx-14} 103 L${cx+14} 103`} fill="none" stroke="rgba(0,210,255,0.30)" strokeWidth=".8" />
        {/* Sagittal suture */}
        <path d={`M${cx} 26 L${cx} 58`} fill="none" stroke="rgba(0,210,255,0.25)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Coronal suture */}
        <path d={`M${cx-32} 48 Q${cx} 44 ${cx+32} 48`} fill="none" stroke="rgba(0,210,255,0.22)" strokeWidth="1" strokeDasharray="3,3" />

        {/* ─────────── CERVICAL SPINE (neck) ─────────── */}
        <rect x={cx-5} y="108" width="10" height="30" rx="3" fill="url(#spineGrad)" stroke="rgba(0,210,255,0.55)" strokeWidth="1.2" />
        {/* Cervical vertebrae notches */}
        {[112, 118, 124, 130].map((y) => (
          <rect key={y} x={cx-8} y={y} width="16" height="4" rx="2" fill="rgba(0,180,255,0.18)" stroke="rgba(0,210,255,0.40)" strokeWidth="1" />
        ))}

        {/* ─────────── CLAVICLES ─────────── */}
        <path d={`M${cx} 138 Q${cx - shW/2} 136 ${cx - shW} 130`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="5" strokeLinecap="round" />
        <path d={`M${cx} 138 Q${cx + shW/2} 136 ${cx + shW} 130`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="5" strokeLinecap="round" />
        {/* Clavicle highlight */}
        <path d={`M${cx} 136 Q${cx - shW/2} 134 ${cx - shW} 128`}
          fill="none" stroke="rgba(100,220,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M${cx} 136 Q${cx + shW/2} 134 ${cx + shW} 128`}
          fill="none" stroke="rgba(100,220,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />

        {/* ─────────── THORACIC SPINE ─────────── */}
        <rect x={cx-5} y="138" width="10" height="105" rx="3" fill="url(#spineGrad)" stroke="rgba(0,210,255,0.55)" strokeWidth="1.2" />
        {/* Thoracic vertebrae */}
        {[140,148,156,164,172,180,188,196,204,212,220,228].map((y) => (
          <rect key={y} x={cx-7} y={y} width="14" height="5" rx="2" fill="rgba(0,180,255,0.14)" stroke="rgba(0,210,255,0.35)" strokeWidth=".9" />
        ))}

        {/* ─────────── RIBCAGE ─────────── */}
        {/* Sternum */}
        <rect x={cx-5} y="140" width="10" height="85" rx="4" fill="rgba(0,160,230,0.22)" stroke="rgba(0,210,255,0.65)" strokeWidth="1.5" />
        {/* Manubrium */}
        <rect x={cx-9} y="138" width="18" height="18" rx="5" fill="rgba(60,160,240,0.24)" stroke="rgba(0,210,255,0.70)" strokeWidth="1.5" />
        {/* Ribs — 7 true rib pairs + 3 false */}
        {[
          { y: 148, xEnd: shW-6,  curve: 10 },
          { y: 158, xEnd: shW-4,  curve: 12 },
          { y: 168, xEnd: shW-2,  curve: 14 },
          { y: 178, xEnd: shW+0,  curve: 14 },
          { y: 188, xEnd: shW-4,  curve: 13 },
          { y: 198, xEnd: shW-10, curve: 11 },
          { y: 208, xEnd: shW-16, curve: 9  },
          { y: 216, xEnd: shW-22, curve: 7  },
          { y: 222, xEnd: shW-28, curve: 5  },
          { y: 227, xEnd: shW-34, curve: 4  },
        ].map(({ y, xEnd, curve }, i) => (
          <g key={i}>
            {/* Left rib */}
            <path
              d={`M${cx-5} ${y} Q${cx - xEnd/2} ${y - curve} ${cx - xEnd} ${y + 8}`}
              fill="none" stroke="url(#boneEdge)" strokeWidth="2.2" strokeLinecap="round"
            />
            <path
              d={`M${cx-5} ${y} Q${cx - xEnd/2} ${y - curve - 2} ${cx - xEnd} ${y + 6}`}
              fill="none" stroke="rgba(120,220,255,0.18)" strokeWidth="1" strokeLinecap="round"
            />
            {/* Right rib */}
            <path
              d={`M${cx+5} ${y} Q${cx + xEnd/2} ${y - curve} ${cx + xEnd} ${y + 8}`}
              fill="none" stroke="url(#boneEdge)" strokeWidth="2.2" strokeLinecap="round"
            />
            <path
              d={`M${cx+5} ${y} Q${cx + xEnd/2} ${y - curve - 2} ${cx + xEnd} ${y + 6}`}
              fill="none" stroke="rgba(120,220,255,0.18)" strokeWidth="1" strokeLinecap="round"
            />
          </g>
        ))}
        {/* Costal cartilage arcs at bottom of ribcage */}
        <path d={`M${cx-22} 228 Q${cx-10} 238 ${cx} 240 Q${cx+10} 238 ${cx+22} 228`}
          fill="rgba(0,180,240,0.10)" stroke="rgba(0,210,255,0.45)" strokeWidth="1.5" />

        {/* ─────────── LUMBAR SPINE ─────────── */}
        <rect x={cx-5} y="243" width="10" height="55" rx="3" fill="url(#spineGrad)" stroke="rgba(0,210,255,0.55)" strokeWidth="1.2" />
        {[246,254,262,270,278].map((y) => (
          <rect key={y} x={cx-8} y={y} width="16" height="6" rx="2" fill="rgba(0,180,255,0.16)" stroke="rgba(0,210,255,0.38)" strokeWidth="1" />
        ))}

        {/* ─────────── PELVIS ─────────── */}
        {/* Ilium wings */}
        <path d={`M${cx} 298 Q${cx - hipW} 294 ${cx - hipW + 4} 320 Q${cx - hipW + 6} 332 ${cx - 20} 338`}
          fill="url(#pelvisGrad)" stroke="url(#boneEdge)" strokeWidth="2" />
        <path d={`M${cx} 298 Q${cx + hipW} 294 ${cx + hipW - 4} 320 Q${cx + hipW - 6} 332 ${cx + 20} 338`}
          fill="url(#pelvisGrad)" stroke="url(#boneEdge)" strokeWidth="2" />
        {/* Pubic arch */}
        <path d={`M${cx-20} 338 Q${cx} ${isFemale ? 348 : 344} ${cx+20} 338`}
          fill="rgba(0,160,230,0.14)" stroke="url(#boneEdge)" strokeWidth="2" />
        {/* Sacrum */}
        <ellipse cx={cx} cy="306" rx="10" ry="18" fill="rgba(60,160,240,0.20)" stroke="rgba(0,210,255,0.55)" strokeWidth="1.4" />
        {/* Coccyx */}
        <ellipse cx={cx} cy="330" rx="5" ry="8" fill="rgba(40,130,210,0.18)" stroke="rgba(0,210,255,0.45)" strokeWidth="1.2" />
        {/* Acetabulum (hip sockets) */}
        <circle cx={cx - hipW + 16} cy={338} r="8" fill="rgba(0,30,80,0.40)" stroke="rgba(0,210,255,0.50)" strokeWidth="1.2" />
        <circle cx={cx + hipW - 16} cy={338} r="8" fill="rgba(0,30,80,0.40)" stroke="rgba(0,210,255,0.50)" strokeWidth="1.2" />

        {/* ─────────── SHOULDER JOINTS ─────────── */}
        <circle cx={cx - shW} cy={134} r="9" fill="rgba(40,120,220,0.25)" stroke="rgba(0,210,255,0.70)" strokeWidth="1.6" />
        <circle cx={cx + shW} cy={134} r="9" fill="rgba(40,120,220,0.25)" stroke="rgba(0,210,255,0.70)" strokeWidth="1.6" />

        {/* ─────────── HUMERUS (upper arm) ─────────── */}
        {/* Left */}
        <path d={`M${cx - shW} 143 L${cx - shW - 8} 228`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${cx - shW + 1} 143 L${cx - shW - 7} 228`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="3" strokeLinecap="round" />
        {/* Right */}
        <path d={`M${cx + shW} 143 L${cx + shW + 8} 228`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${cx + shW - 1} 143 L${cx + shW + 7} 228`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="3" strokeLinecap="round" />

        {/* ─────────── ELBOW JOINTS ─────────── */}
        <circle cx={cx - shW - 8} cy={228} r="7" fill="rgba(40,120,220,0.22)" stroke="rgba(0,210,255,0.65)" strokeWidth="1.4" />
        <circle cx={cx + shW + 8} cy={228} r="7" fill="rgba(40,120,220,0.22)" stroke="rgba(0,210,255,0.65)" strokeWidth="1.4" />

        {/* ─────────── RADIUS + ULNA (forearm) ─────────── */}
        {/* Left: radius */}
        <path d={`M${cx - shW - 6} 235 L${cx - shW - 14} 310`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="4.5" strokeLinecap="round" />
        <path d={`M${cx - shW - 10} 235 L${cx - shW - 18} 310`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="3.5" strokeLinecap="round" />
        {/* Right: radius */}
        <path d={`M${cx + shW + 6} 235 L${cx + shW + 14} 310`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="4.5" strokeLinecap="round" />
        <path d={`M${cx + shW + 10} 235 L${cx + shW + 18} 310`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="3.5" strokeLinecap="round" />

        {/* ─────────── WRIST + HAND ─────────── */}
        {/* Left wrist */}
        <ellipse cx={cx - shW - 16} cy={316} rx="7" ry="5" fill="rgba(40,120,220,0.20)" stroke="rgba(0,210,255,0.60)" strokeWidth="1.2" />
        {/* Left metacarpals */}
        {[-10,-5,0,5,10].map((dx, i) => (
          <path key={i} d={`M${cx - shW - 16 + dx} 321 L${cx - shW - 16 + dx * 0.8} 336`}
            fill="none" stroke="rgba(0,180,240,0.55)" strokeWidth="2.2" strokeLinecap="round" />
        ))}
        {/* Right wrist */}
        <ellipse cx={cx + shW + 16} cy={316} rx="7" ry="5" fill="rgba(40,120,220,0.20)" stroke="rgba(0,210,255,0.60)" strokeWidth="1.2" />
        {[-10,-5,0,5,10].map((dx, i) => (
          <path key={i} d={`M${cx + shW + 16 + dx} 321 L${cx + shW + 16 + dx * 0.8} 336`}
            fill="none" stroke="rgba(0,180,240,0.55)" strokeWidth="2.2" strokeLinecap="round" />
        ))}

        {/* ─────────── FEMUR (thigh bone) ─────────── */}
        {/* Left */}
        <path d={`M${cx - hipW + 16} 346 Q${cx - 32} 360 ${cx - 24} 470`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="11" strokeLinecap="round" />
        <path d={`M${cx - hipW + 18} 346 Q${cx - 31} 360 ${cx - 23} 470`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="4" strokeLinecap="round" />
        {/* Right */}
        <path d={`M${cx + hipW - 16} 346 Q${cx + 32} 360 ${cx + 24} 470`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="11" strokeLinecap="round" />
        <path d={`M${cx + hipW - 18} 346 Q${cx + 31} 360 ${cx + 23} 470`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="4" strokeLinecap="round" />

        {/* ─────────── KNEE JOINTS ─────────── */}
        <ellipse cx={cx-24} cy="472" rx="11" ry="10" fill="rgba(40,120,220,0.24)" stroke="rgba(0,210,255,0.65)" strokeWidth="1.6" />
        <ellipse cx={cx+24} cy="472" rx="11" ry="10" fill="rgba(40,120,220,0.24)" stroke="rgba(0,210,255,0.65)" strokeWidth="1.6" />
        {/* Patella */}
        <ellipse cx={cx-24} cy="472" rx="5" ry="5" fill="rgba(80,180,255,0.28)" stroke="rgba(0,210,255,0.55)" strokeWidth="1" />
        <ellipse cx={cx+24} cy="472" rx="5" ry="5" fill="rgba(80,180,255,0.28)" stroke="rgba(0,210,255,0.55)" strokeWidth="1" />

        {/* ─────────── TIBIA + FIBULA (lower leg) ─────────── */}
        {/* Left tibia */}
        <path d={`M${cx-22} 482 L${cx-22} 565`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${cx-22} 482 L${cx-22} 565`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Left fibula */}
        <path d={`M${cx-15} 484 L${cx-14} 562`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="4" strokeLinecap="round" />
        {/* Right tibia */}
        <path d={`M${cx+22} 482 L${cx+22} 565`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${cx+22} 482 L${cx+22} 565`}
          fill="none" stroke="rgba(100,200,255,0.22)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Right fibula */}
        <path d={`M${cx+15} 484 L${cx+14} 562`}
          fill="none" stroke="url(#boneEdge)" strokeWidth="4" strokeLinecap="round" />

        {/* ─────────── ANKLE + FOOT ─────────── */}
        {/* Left */}
        <ellipse cx={cx-21} cy="568" rx="8" ry="6" fill="rgba(40,120,220,0.22)" stroke="rgba(0,210,255,0.58)" strokeWidth="1.2" />
        <path d={`M${cx-29} 572 Q${cx-28} 580 ${cx-10} 582 L${cx-8} 580`}
          fill="rgba(40,120,220,0.14)" stroke="rgba(0,200,240,0.50)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Tarsals left */}
        {[0,1,2,3,4].map((i) => (
          <path key={i} d={`M${cx - 26 + i*4} 578 L${cx - 24 + i*4} 590`}
            fill="none" stroke="rgba(0,180,240,0.50)" strokeWidth="1.8" strokeLinecap="round" />
        ))}
        {/* Right */}
        <ellipse cx={cx+21} cy="568" rx="8" ry="6" fill="rgba(40,120,220,0.22)" stroke="rgba(0,210,255,0.58)" strokeWidth="1.2" />
        <path d={`M${cx+29} 572 Q${cx+28} 580 ${cx+10} 582 L${cx+8} 580`}
          fill="rgba(40,120,220,0.14)" stroke="rgba(0,200,240,0.50)" strokeWidth="1.5" strokeLinecap="round" />
        {[0,4,8,12,16].map((dx, i) => (
          <path key={i} d={`M${cx + 10 + dx} 578 L${cx + 10 + dx} 590`}
            fill="none" stroke="rgba(0,180,240,0.50)" strokeWidth="1.8" strokeLinecap="round" />
        ))}

        {/* ─────────── SCAPULAE (shoulder blades) ─────────── */}
        <path d={`M${cx - shW + 4} 132 Q${cx - shW + 10} 165 ${cx - shW + 22} 175 Q${cx - 56} 178 ${cx - 40} 148 Z`}
          fill="rgba(40,120,220,0.10)" stroke="rgba(0,210,255,0.35)" strokeWidth="1.2" />
        <path d={`M${cx + shW - 4} 132 Q${cx + shW - 10} 165 ${cx + shW - 22} 175 Q${cx + 56} 178 ${cx + 40} 148 Z`}
          fill="rgba(40,120,220,0.10)" stroke="rgba(0,210,255,0.35)" strokeWidth="1.2" />

        {/* ─────────── FEMALE-SPECIFIC: wider pelvic arch ─────────── */}
        {isFemale && (
          <path d={`M${cx-24} 338 Q${cx} 355 ${cx+24} 338`}
            fill="rgba(0,160,230,0.08)" stroke="rgba(0,210,255,0.35)" strokeWidth="1.5" />
        )}

        {/* ─────────── VITAL REGION DOTS ─────────── */}
        {Object.entries(dotPositions).map(([region, pos]) => {
          const regionVitals = calloutsByRegion.get(region as any) ?? [];
          if (regionVitals.length === 0) return null;
          const firstVital = regionVitals[0];
          const color = STATUS_COLOR[firstVital.status ?? "normal"];
          const isActive = activeVital === firstVital.key;
          return (
            <g
              key={region}
              style={{ cursor: "pointer" }}
              onClick={() => onVitalHover?.(isActive ? null : firstVital.key)}
              onMouseEnter={() => onVitalHover?.(firstVital.key)}
              onMouseLeave={() => onVitalHover?.(null)}
              filter={isActive ? "url(#vitalGlow)" : undefined}
            >
              <circle cx={pos.x} cy={pos.y} r="10" fill={`${color}18`} stroke={color} strokeWidth="1.5" opacity=".8" />
              <circle cx={pos.x} cy={pos.y} r="5" fill={color} opacity={isActive ? 1 : 0.75}>
                {isActive && (
                  <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite" />
                )}
              </circle>
              {/* Pulse ring animation */}
              <circle cx={pos.x} cy={pos.y} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.35">
                <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* ─────────── CALLOUT CARDS ─────────── */}
      {vitals.map((v) => {
        const pos = dotPositions[v.region];
        if (!pos) return null;
        const isActive = activeVital === v.key;
        const color = STATUS_COLOR[v.status ?? "normal"];
        // Position callout left or right based on region
        const isLeft = ["arm-r", "leg-r"].includes(v.region);
        const isCentered = ["head", "chest", "abdomen"].includes(v.region);

        return (
          <div
            key={v.key}
            className={`fig-callout${isActive ? " fig-callout--active" : ""}`}
            style={{
              position: "absolute",
              top: `calc(${(pos.y / 600) * 100}% - 28px)`,
              ...(isCentered
                ? { right: 0, minWidth: 120 }
                : isLeft
                ? { right: 0, minWidth: 100 }
                : { left: 0, minWidth: 100 }),
              pointerEvents: "none",
              opacity: isActive ? 1 : 0.72,
              transition: "opacity .2s, transform .2s",
              transform: isActive ? "scale(1.04)" : "scale(1)",
            }}
          >
            <div className="fig-callout-in" style={{ borderColor: isActive ? color : undefined }}>
              <span className="fig-callout-icon">
                <DashIcon icon={v.icon} idPrefix={`fig-${v.key}`} />
              </span>
              <div className="fig-callout-body">
                <div className="fig-callout-label">{v.label}</div>
                <div className="fig-callout-value" style={{ color }}>
                  {v.value}
                  <span className="fig-callout-unit"> {v.unit}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
