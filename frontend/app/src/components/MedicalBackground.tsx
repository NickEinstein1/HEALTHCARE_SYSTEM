/**
 * MedicalBackground — UniHealth Cinematic Edition
 * =================================================
 * Full-canvas animated scene with doctor & patient theme.
 *
 * Visual layers (back → front):
 *  1.  Deep radial-gradient base  (#030814 → #060e22 → #02060f)
 *  2.  Subtle hex-grid overlay
 *  3.  Ambient deep-glow blobs (pulsing, slow)
 *  4.  Kenya facility network  (nodes + arcs + flow particles)
 *  5.  Medical cross symbols  (faint, scattered)
 *  6.  PATIENT silhouette  (left side, reclining on hospital bed + IV)
 *  7.  DOCTOR silhouette  (right side, standing with white-coat + stethoscope)
 *  8.  Human anatomy wireframe  (centre-right, transparent)
 *  9.  CT/MRI scan rings sweeping through the anatomy
 * 10.  Floating vitals HUD panels (near doctor + patient)
 * 11.  Dual ECG heartbeat strips (bottom)
 * 12.  DNA double-helix columns  (far margins)
 * 13.  Full-width horizontal scan-line sweep
 * 14.  Floating data particles
 * 15.  Corner HUD brackets + live readouts
 */

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../lib/theme";

const MEDICAL_SCENE_HOST_ID = "unihealth-med-scene-host";

// ── Colour palette ──────────────────────────────────────────────────
const C_DARK = {
  cyan:   "rgba(0,212,255,",
  green:  "rgba(0,229,160,",
  violet: "rgba(150,80,255,",
  pink:   "rgba(255,60,130,",
  amber:  "rgba(255,180,40,",
  teal:   "rgba(0,255,220,",
  white:  "rgba(210,235,255,",
  blue:   "rgba(40,100,255,",
};

const C_LIGHT = {
  cyan:   "rgba(0, 130, 180,",
  green:  "rgba(4, 120, 87,",
  violet: "rgba(109, 40, 217,",
  pink:   "rgba(190, 18, 60,",
  amber:  "rgba(180, 83, 9,",
  teal:   "rgba(13, 148, 136,",
  white:  "rgba(15, 23, 42,",
  blue:   "rgba(37, 99, 168,",
};

type ScenePal = typeof C_DARK;
function pcol(pal: ScenePal, ch: keyof ScenePal, a: number) {
  return `${pal[ch]}${a})`;
}

function vitalsWithPal(
  rows: typeof DR_VITALS,
  pal: ScenePal,
  keys: (keyof ScenePal)[],
) {
  return rows.map((r, i) => ({ ...r, col: pal[keys[i] ?? "cyan"] }));
}

function sceneTone(isLight: boolean) {
  return {
    C: isLight ? C_LIGHT : C_DARK,
    bg: isLight
      ? (["#e8d9b0", "#d4bc82", "#c9ad6e", "#bfa968"] as const)
      : (["#0c2850", "#061a38", "#040c22", "#020510"] as const),
    hexStroke: isLight ? "rgba(0, 130, 180, 0.42)" : "rgba(0,160,255,0.085)",
    hubCol: isLight ? "rgba(0, 130, 180," : "rgba(0,212,255,",
    hubBase: isLight ? 0.30 : 0.065,
    hubDecay: isLight ? 0.014 : 0.008,
    connMul: isLight ? 0.32 : 0.055,
    particleCol: isLight ? "rgba(0, 130, 180," : "rgba(0,200,255,",
    particleFill: isLight ? 1.0 : 0.65,
    particleLine: isLight ? 0.42 : 0.11,
    scanLine: isLight ? "rgba(0, 130, 180, 0.48)" : "rgba(0,212,255,0.10)",
    blobMul: isLight ? 3.8 : 1,
    hudAlpha: isLight ? 0.98 : 0.42,
    figMul: isLight ? 1.85 : 1,
    lightBoost: isLight ? 1.35 : 1,
  };
}

/** Static scene tables (draw loop uses `tone.C` for live palette). */
const C = C_DARK;

// ── ECG waveform ────────────────────────────────────────────────────
const ECG_PTS: [number, number][] = [
  [0.00, 0.00],[0.05, 0.00],[0.08, 0.09],[0.10, 0.00],
  [0.12, 0.00],[0.14,-0.12],[0.16, 1.00],[0.18,-0.22],[0.20, 0.00],
  [0.28, 0.00],[0.33, 0.25],[0.42, 0.00],[1.00, 0.00],
];
function ecgY(t: number): number {
  const c = ((t % 1) + 1) % 1;
  for (let i = 0; i < ECG_PTS.length - 1; i++) {
    const [x0, y0] = ECG_PTS[i], [x1, y1] = ECG_PTS[i + 1];
    if (c >= x0 && c <= x1) return y0 + (y1 - y0) * ((c - x0) / (x1 - x0));
  }
  return 0;
}

// ── Kenya facility nodes ────────────────────────────────────────────
const FAC_NODES = [
  { xf: 0.50, yf: 0.50, col: C.cyan,   label: "KNH"  },
  { xf: 0.56, yf: 0.24, col: C.green,  label: "MTRH" },
  { xf: 0.43, yf: 0.62, col: C.violet, label: "PH"   },
  { xf: 0.36, yf: 0.76, col: C.pink,   label: "CGH"  },
  { xf: 0.62, yf: 0.42, col: C.amber,  label: "NKR"  },
  { xf: 0.28, yf: 0.39, col: C.teal,   label: "KSM"  },
  { xf: 0.70, yf: 0.70, col: C.cyan,   label: "MRU"  },
];

// ── Organ positions (for anatomy wireframe) ─────────────────────────
const ORGANS = [
  { dx: 0.00, dy:-0.36, r: 9,  col: C.cyan,   pulse: 1.0 },
  { dx:-0.05, dy:-0.10, r: 7,  col: C.pink,   pulse: 1.4 },
  { dx:-0.10, dy:-0.06, r: 6,  col: C.cyan,   pulse: 0.9 },
  { dx: 0.10, dy:-0.06, r: 6,  col: C.cyan,   pulse: 0.9 },
  { dx: 0.00, dy: 0.05, r: 5,  col: C.amber,  pulse: 0.6 },
  { dx:-0.08, dy: 0.18, r: 4,  col: C.violet, pulse: 0.7 },
  { dx: 0.08, dy: 0.18, r: 4,  col: C.violet, pulse: 0.7 },
  { dx: 0.00, dy: 0.24, r: 5,  col: C.green,  pulse: 0.5 },
];

// ── Vitals HUD data ─────────────────────────────────────────────────
const DR_VITALS = [
  { label: "PATIENT · J.MWANGI",  val: "Ward 4B",  col: C.green  },
  { label: "BP",                   val: "118 / 76", col: C.cyan   },
  { label: "SpO₂",                 val: "98%",      col: C.green  },
  { label: "HR",                   val: "72 bpm",   col: C.pink   },
  { label: "TEMP",                 val: "36.8 °C",  col: C.amber  },
  { label: "NEWS2",                val: "0  —  LOW", col: C.teal  },
];

const PT_VITALS = [
  { label: "APPOINTMENT",  val: "08:30 · Cardiology", col: C.cyan   },
  { label: "NHIF / SHA",   val: "Active ✓",           col: C.green  },
  { label: "LAST VISIT",   val: "14 Apr 2026",        col: C.teal   },
  { label: "MEDICATION",   val: "Metformin 500 mg",   col: C.amber  },
  { label: "ALLERGIES",    val: "Penicillin  ⚠",      col: C.pink   },
];

// ── Safe rounded-rect (replaces ctx.roundRect for broad compatibility) ─
function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | [number, number, number, number] = 0,
) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

// ── Helpers ──────────────────────────────────────────────────────────
function drawHelix(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  height: number, width: number,
  t: number, col1: string, col2: string, bridgeCol: string,
) {
  const steps = 90;
  for (let i = 0; i < steps; i++) {
    const frac = i / steps;
    const y    = cy - height / 2 + frac * height;
    const ph   = frac * Math.PI * 7 + t;
    const x1   = cx + Math.cos(ph) * width;
    const x2   = cx - Math.cos(ph) * width;
    const a    = 0.10 + 0.16 * Math.abs(Math.cos(ph));
    ctx.beginPath(); ctx.arc(x1, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `${col1}${a})`; ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `${col2}${a})`; ctx.fill();
    if (i % 9 === 0) {
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.strokeStyle = `${bridgeCol}${a * 0.55})`; ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
}

function drawBracket(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, corner: "TL"|"TR"|"BL"|"BR",
  col: string, alpha: number,
) {
  const L = 24;
  ctx.strokeStyle = `${col}${alpha})`; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (corner === "TL") { ctx.moveTo(x + L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L); }
  if (corner === "TR") { ctx.moveTo(x - L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L); }
  if (corner === "BL") { ctx.moveTo(x + L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - L); }
  if (corner === "BR") { ctx.moveTo(x - L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - L); }
  ctx.stroke();
}

// ── Doctor silhouette (standing, white-coat) ────────────────────────
function drawDoctor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  alpha: number, now: number, pal: ScenePal,
) {
  const s   = scale;
  const col = pcol(pal, "cyan", alpha);
  const coat= pcol(pal, "cyan", alpha * 0.7);
  const hl  = pcol(pal, "green", alpha * 0.9);

  const halo = ctx.createRadialGradient(cx, cy - s * 0.2, 0, cx, cy - s * 0.2, s * 0.55);
  halo.addColorStop(0, pcol(pal, "cyan", alpha * 0.14));
  halo.addColorStop(1, pcol(pal, "cyan", 0));
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = halo; ctx.fill();

  ctx.lineWidth = 1.2;

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.42, s * 0.09, s * 0.11, 0, 0, Math.PI * 2);
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 1.5); ctx.stroke();

  // Neck
  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.03, cy - s * 0.31);
  ctx.lineTo(cx - s * 0.04, cy - s * 0.26);
  ctx.moveTo(cx + s * 0.03, cy - s * 0.31);
  ctx.lineTo(cx + s * 0.04, cy - s * 0.26);
  ctx.stroke();

  // White coat collar (wider shoulders)
  ctx.strokeStyle = coat;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy - s * 0.20);
  ctx.quadraticCurveTo(cx - s * 0.10, cy - s * 0.28, cx, cy - s * 0.26);
  ctx.quadraticCurveTo(cx + s * 0.10, cy - s * 0.28, cx + s * 0.24, cy - s * 0.20);
  ctx.stroke();

  // Coat sides
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy - s * 0.20);
  ctx.lineTo(cx - s * 0.20, cy + s * 0.28);
  ctx.moveTo(cx + s * 0.24, cy - s * 0.20);
  ctx.lineTo(cx + s * 0.20, cy + s * 0.28);
  ctx.stroke();

  // Coat hem
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.20, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.20, cy + s * 0.28);
  ctx.stroke();

  // Centre lapel lines
  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.26);
  ctx.lineTo(cx - s * 0.05, cy - s * 0.14);
  ctx.moveTo(cx, cy - s * 0.26);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.14);
  ctx.stroke();
  // Coat centre seam
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.14); ctx.lineTo(cx, cy + s * 0.28);
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 0.35); ctx.stroke();
  ctx.setLineDash([]);

  // Pocket (left breast)
  ctx.strokeStyle = coat;
  ctx.beginPath();
  ctx.rect(cx - s * 0.17, cy - s * 0.07, s * 0.08, s * 0.05);
  ctx.stroke();

  // Stethoscope: arc around neck, down to earpiece + chest piece
  const stet = ctx.createLinearGradient(cx - s * 0.14, cy - s * 0.20, cx + s * 0.04, cy + s * 0.05);
  stet.addColorStop(0, pcol(pal, "green", alpha * 0.9));
  stet.addColorStop(1, pcol(pal, "cyan", alpha * 0.7));
  ctx.strokeStyle = stet; ctx.lineWidth = 1.8;
  ctx.beginPath();
  // Over neck drape
  ctx.moveTo(cx - s * 0.06, cy - s * 0.24);
  ctx.quadraticCurveTo(cx - s * 0.14, cy - s * 0.20, cx - s * 0.16, cy - s * 0.04);
  ctx.quadraticCurveTo(cx - s * 0.17, cy + s * 0.04, cx - s * 0.10, cy + s * 0.08);
  ctx.lineTo(cx + s * 0.02, cy + s * 0.06);
  ctx.stroke();
  // Chest piece (small circle)
  ctx.beginPath();
  ctx.arc(cx + s * 0.02, cy + s * 0.07, s * 0.025, 0, Math.PI * 2);
  ctx.strokeStyle = hl; ctx.lineWidth = 1.6; ctx.stroke();

  // Right arm raised — holding tablet/clipboard
  ctx.strokeStyle = coat; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.24, cy - s * 0.20);
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.10, cx + s * 0.32, cy + s * 0.04);
  ctx.stroke();
  // Forearm angled up
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.32, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.26, cy - s * 0.08);
  ctx.stroke();
  // Clipboard/tablet shape
  ctx.strokeStyle = hl;
  rrect(ctx, cx + s * 0.18, cy - s * 0.20, s * 0.10, s * 0.13, 3);
  ctx.stroke();
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.21, cy - s * 0.17); ctx.lineTo(cx + s * 0.26, cy - s * 0.17);
  ctx.moveTo(cx + s * 0.21, cy - s * 0.13); ctx.lineTo(cx + s * 0.26, cy - s * 0.13);
  ctx.moveTo(cx + s * 0.21, cy - s * 0.09); ctx.lineTo(cx + s * 0.26, cy - s * 0.09);
  ctx.strokeStyle = pcol(pal, "green", alpha * 0.5); ctx.stroke();
  ctx.setLineDash([]);

  // Left arm down
  ctx.strokeStyle = coat; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.24, cy - s * 0.20);
  ctx.lineTo(cx - s * 0.28, cy + s * 0.08);
  ctx.lineTo(cx - s * 0.24, cy + s * 0.20);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, cy + s * 0.28);
  ctx.lineTo(cx - s * 0.10, cy + s * 0.54);
  ctx.moveTo(cx + s * 0.09, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.10, cy + s * 0.54);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.10, cy + s * 0.54);
  ctx.lineTo(cx - s * 0.09, cy + s * 0.72);
  ctx.moveTo(cx + s * 0.10, cy + s * 0.54);
  ctx.lineTo(cx + s * 0.09, cy + s * 0.72);
  ctx.stroke();
  // Shoes
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, cy + s * 0.72);
  ctx.lineTo(cx - s * 0.17, cy + s * 0.74);
  ctx.moveTo(cx + s * 0.09, cy + s * 0.72);
  ctx.lineTo(cx + s * 0.17, cy + s * 0.74);
  ctx.stroke();

  // Name badge glow (animated blink on coat)
  const badgePulse = 0.5 + 0.5 * Math.sin(now * 1.5);
  ctx.beginPath();
  ctx.rect(cx - s * 0.07, cy - s * 0.03, s * 0.14, s * 0.045);
  ctx.strokeStyle = pcol(pal, "green", alpha * badgePulse * 0.7); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.font = `bold ${Math.round(s * 0.025)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = pcol(pal, "green", alpha * badgePulse * 0.7);
  ctx.fillText("DR. KIMANI", cx - s * 0.065, cy + s * 0.000);
}

// ── Patient silhouette (reclining on hospital bed) ──────────────────
function drawPatient(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number,
  alpha: number, now: number, pal: ScenePal,
) {
  const s   = scale;
  const col = pcol(pal, "blue", alpha * 0.95);
  const bed = pcol(pal, "cyan", alpha * 0.55);
  const iv  = pcol(pal, "green", alpha * 0.8);

  // ── Bed frame ──────────────────────────────────────────────────
  ctx.strokeStyle = bed; ctx.lineWidth = 1.4;
  // Mattress top
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.40, cy + s * 0.05);
  ctx.lineTo(cx + s * 0.40, cy + s * 0.05);
  ctx.stroke();
  // Side rails
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.40, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.40, cy + s * 0.18);
  ctx.moveTo(cx + s * 0.40, cy + s * 0.05);
  ctx.lineTo(cx + s * 0.40, cy + s * 0.18);
  ctx.stroke();
  // Bed frame bottom
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.40, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.40, cy + s * 0.18);
  ctx.stroke();
  // Legs (4)
  ctx.lineWidth = 1.0;
  [-0.35, -0.10, 0.10, 0.35].forEach(lx => {
    ctx.beginPath();
    ctx.moveTo(cx + lx * s, cy + s * 0.18);
    ctx.lineTo(cx + lx * s, cy + s * 0.30);
    ctx.stroke();
  });
  // Foot wheels
  [-0.35, 0.35].forEach(lx => {
    ctx.beginPath(); ctx.arc(cx + lx * s, cy + s * 0.30, s * 0.015, 0, Math.PI * 2);
    ctx.strokeStyle = bed; ctx.stroke();
  });
  // Head-board
  ctx.strokeStyle = bed; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.40, cy + s * 0.05);
  ctx.lineTo(cx - s * 0.40, cy - s * 0.12);
  ctx.lineTo(cx - s * 0.30, cy - s * 0.12);
  ctx.lineTo(cx - s * 0.30, cy + s * 0.05);
  ctx.stroke();

  // ── Pillow ─────────────────────────────────────────────────────
  ctx.strokeStyle = pcol(pal, "blue", alpha * 0.4); ctx.lineWidth = 0.8;
  rrect(ctx, cx - s * 0.38, cy - s * 0.09, s * 0.14, s * 0.10, 4);
  ctx.stroke();

  // ── Patient body (reclining) ───────────────────────────────────
  ctx.strokeStyle = col; ctx.lineWidth = 1.1;
  // Torso block
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.22, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.04);
  ctx.lineTo(cx - s * 0.25, cy + s * 0.04);
  ctx.closePath(); ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.22, cy - s * 0.01);
  ctx.lineTo(cx + s * 0.38, cy + s * 0.01);
  ctx.lineTo(cx + s * 0.38, cy + s * 0.04);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.04);
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.33, cy + s * 0.00, s * 0.07, s * 0.09, Math.PI * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  // Arm with IV
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.13);
  ctx.lineTo(cx + s * 0.04, cy - s * 0.13);
  ctx.stroke();

  // ── IV stand ──────────────────────────────────────────────────
  ctx.strokeStyle = iv; ctx.lineWidth = 1.0;
  // Vertical pole
  const ivX = cx + s * 0.08;
  ctx.beginPath();
  ctx.moveTo(ivX, cy - s * 0.40);
  ctx.lineTo(ivX, cy + s * 0.30);
  ctx.stroke();
  // Base feet
  ctx.beginPath();
  ctx.moveTo(ivX - s * 0.06, cy + s * 0.30); ctx.lineTo(ivX + s * 0.06, cy + s * 0.30);
  ctx.stroke();
  // IV bag (teardrop shape)
  ctx.beginPath();
  ctx.moveTo(ivX, cy - s * 0.40);
  ctx.quadraticCurveTo(ivX - s * 0.06, cy - s * 0.32, ivX - s * 0.04, cy - s * 0.28);
  ctx.quadraticCurveTo(ivX, cy - s * 0.22, ivX + s * 0.04, cy - s * 0.28);
  ctx.quadraticCurveTo(ivX + s * 0.06, cy - s * 0.32, ivX, cy - s * 0.40);
  ctx.strokeStyle = pcol(pal, "green", alpha * 0.8); ctx.stroke();
  ctx.fillStyle = pcol(pal, "green", alpha * 0.12); ctx.fill();

  const dripPulse = 0.5 + 0.5 * Math.sin(now * 3.5);
  ctx.strokeStyle = pcol(pal, "green", alpha * 0.55); ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(ivX, cy - s * 0.26);
  ctx.quadraticCurveTo(ivX - s * 0.02, cy - s * 0.18, cx + s * 0.04, cy - s * 0.13);
  ctx.stroke();
  ctx.setLineDash([]);
  // Drip drop (animated)
  const dropY = cy - s * 0.26 + dripPulse * s * 0.08;
  ctx.beginPath(); ctx.arc(ivX, dropY, s * 0.012, 0, Math.PI * 2);
  ctx.fillStyle = pcol(pal, "green", alpha * dripPulse); ctx.fill();

  const monX = cx - s * 0.10, monY = cy - s * 0.30;
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 0.55); ctx.lineWidth = 0.9;
  rrect(ctx, monX, monY, s * 0.22, s * 0.13, 4);
  ctx.stroke();
  ctx.fillStyle = pcol(pal, "cyan", alpha * 0.08); ctx.fill();
  ctx.strokeStyle = pcol(pal, "green", alpha * 0.55); ctx.lineWidth = 0.8;
  ctx.beginPath();
  const mW = s * 0.22, mH = s * 0.05;
  let mStarted = false;
  for (let xi = 0; xi <= mW; xi += 1.5) {
    const t = (xi / mW + now * 0.6) % 1;
    const yy = monY + s * 0.08 - ecgY(t) * mH;
    if (!mStarted) { ctx.moveTo(monX + xi, yy); mStarted = true; } else ctx.lineTo(monX + xi, yy);
  }
  ctx.stroke();

  // ── Wristband ─────────────────────────────────────────────────
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 0.5); ctx.lineWidth = 0.9;
  rrect(ctx, cx + s * 0.03, cy - s * 0.16, s * 0.03, s * 0.05, 2);
  ctx.stroke();
}

// ── Body wireframe (anatomical, centre-right) ───────────────────────
function drawBodyWireframe(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, scale: number, alpha: number, pal: ScenePal,
) {
  const s = scale;
  const col = pcol(pal, "cyan", alpha);
  ctx.strokeStyle = col; ctx.lineWidth = 1.05;

  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.38, s * 0.10, s * 0.13, 0, 0, Math.PI * 2);
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 1.45); ctx.stroke();

  ctx.strokeStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.03, cy - s * 0.24); ctx.lineTo(cx - s * 0.05, cy - s * 0.18);
  ctx.moveTo(cx + s * 0.03, cy - s * 0.24); ctx.lineTo(cx + s * 0.05, cy - s * 0.18);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.20, cy - s * 0.14);
  ctx.quadraticCurveTo(cx, cy - s * 0.22, cx + s * 0.20, cy - s * 0.14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.20, cy - s * 0.14); ctx.lineTo(cx - s * 0.14, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.14, cy + s * 0.18); ctx.lineTo(cx + s * 0.20, cy - s * 0.14);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const ry = cy - s * 0.11 + i * s * 0.052;
    const rx = s * (0.18 - i * 0.01);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.04, ry);
    ctx.quadraticCurveTo(cx - rx * 0.6, ry + s * 0.02, cx - rx, ry);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.04, ry);
    ctx.quadraticCurveTo(cx + rx * 0.6, ry + s * 0.02, cx + rx, ry);
    ctx.stroke();
  }

  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.18); ctx.lineTo(cx, cy + s * 0.20);
  ctx.strokeStyle = pcol(pal, "cyan", alpha * 0.62); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = col;

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.14, cy + s * 0.18);
  ctx.quadraticCurveTo(cx, cy + s * 0.24, cx + s * 0.14, cy + s * 0.18);
  ctx.stroke();

  ([[-1], [1]] as [number][]).forEach(([side]) => {
    ctx.beginPath();
    ctx.moveTo(cx + side * s * 0.20, cy - s * 0.14);
    ctx.lineTo(cx + side * s * 0.28, cy + s * 0.07);
    ctx.lineTo(cx + side * s * 0.32, cy + s * 0.24);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy + s * 0.24); ctx.lineTo(cx - s * 0.10, cy + s * 0.50);
  ctx.moveTo(cx + s * 0.08, cy + s * 0.24); ctx.lineTo(cx + s * 0.10, cy + s * 0.50);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.10, cy + s * 0.50); ctx.lineTo(cx - s * 0.09, cy + s * 0.70);
  ctx.moveTo(cx + s * 0.10, cy + s * 0.50); ctx.lineTo(cx + s * 0.09, cy + s * 0.70);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, cy + s * 0.70); ctx.lineTo(cx - s * 0.17, cy + s * 0.72);
  ctx.moveTo(cx + s * 0.09, cy + s * 0.70); ctx.lineTo(cx + s * 0.17, cy + s * 0.72);
  ctx.stroke();
}

// ── Floating vitals HUD panel ───────────────────────────────────────
function drawVitalsPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rows: typeof DR_VITALS,
  alpha: number, borderCol: string, pal: ScenePal, isLight: boolean,
) {
  const W = 168, ROW = 17, PAD = 10;
  const H = rows.length * ROW + PAD * 2;

  ctx.fillStyle = isLight
    ? `rgba(255,255,255,${Math.min(0.96, alpha * 0.94)})`
    : `rgba(4,18,52,${alpha * 0.88})`;
  rrect(ctx, x, y, W, H, 7); ctx.fill();
  ctx.strokeStyle = `${borderCol}${alpha * (isLight ? 0.88 : 0.62)})`; ctx.lineWidth = isLight ? 1.6 : 1.3;
  rrect(ctx, x, y, W, H, 7); ctx.stroke();

  ctx.fillStyle = `${borderCol}${alpha * (isLight ? 0.95 : 0.75)})`;
  rrect(ctx, x, y, W, 3, [7, 7, 0, 0]); ctx.fill();

  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  rows.forEach((row, i) => {
    const ry = y + PAD + i * ROW + ROW * 0.7;
    ctx.fillStyle = isLight
      ? pcol(pal, "white", alpha * 0.72)
      : `rgba(140,190,220,${alpha * 0.85})`;
    ctx.fillText(row.label, x + PAD, ry);
    ctx.fillStyle = `${row.col}${alpha * 0.98})`;
    ctx.textAlign = "right";
    ctx.fillText(row.val, x + W - PAD, ry);
    ctx.textAlign = "left";
  });
}

// ── Medical cross symbol ────────────────────────────────────────────
function drawMedCross(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, alpha: number, col: string,
) {
  const a = size * 0.38, b = size * 0.18;
  ctx.strokeStyle = `${col}${alpha})`; ctx.lineWidth = 1.35;
  ctx.beginPath();
  ctx.moveTo(x - b, y - a); ctx.lineTo(x + b, y - a);
  ctx.lineTo(x + b, y - b); ctx.lineTo(x + a, y - b);
  ctx.lineTo(x + a, y + b); ctx.lineTo(x + b, y + b);
  ctx.lineTo(x + b, y + a); ctx.lineTo(x - b, y + a);
  ctx.lineTo(x - b, y + b); ctx.lineTo(x - a, y + b);
  ctx.lineTo(x - a, y - b); ctx.lineTo(x - b, y - b);
  ctx.closePath(); ctx.stroke();
}

function sceneLayoutCoords(layout: "default" | "landing", w: number, h: number) {
  const m = Math.min(w, h);
  if (layout === "landing") {
    // Keep figures + vitals HUD in side gutters / lower stage so hero copy stays clear.
    return {
      hubX: w * 0.50,
      hubY: h * 0.62,
      patCX: w * 0.08,
      patCY: h * 0.68,
      patScale: m * 0.16,
      drCX: w * 0.94,
      drCY: h * 0.64,
      drScale: m * 0.18,
      bodyCX: w * 0.18,
      bodyCY: h * 0.72,
      bodyScale: m * 0.16,
    };
  }
  return {
    hubX: w * 0.52,
    hubY: h * 0.49,
    patCX: w * 0.20,
    patCY: h * 0.58,
    patScale: m * 0.20,
    drCX: w * 0.82,
    drCY: h * 0.52,
    drScale: m * 0.26,
    bodyCX: w * 0.51,
    bodyCY: h * 0.50,
    bodyScale: m * 0.24,
  };
}

// ── Main component ──────────────────────────────────────────────────
export function MedicalBackground({ layout = "default" }: { layout?: "default" | "landing" }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const rootEl = document.getElementById("root");
    document.documentElement.classList.add("unihealth-auth-bg");
    document.body.classList.add("unihealth-auth-bg");
    rootEl?.classList.add("unihealth-auth-root");
    return () => {
      document.documentElement.classList.remove("unihealth-auth-bg");
      document.body.classList.remove("unihealth-auth-bg");
      rootEl?.classList.remove("unihealth-auth-root");
    };
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasEl;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[MedicalBackground] 2D canvas context unavailable");
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lw = window.innerWidth;
    let lh = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      lw = window.innerWidth;
      lh = window.innerHeight;
      canvas.style.width = `${lw}px`;
      canvas.style.height = `${lh}px`;
      canvas.width = Math.max(1, Math.floor(lw * dpr));
      canvas.height = Math.max(1, Math.floor(lh * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const W = () => lw;
    const H = () => lh;

    if (reduceMotion) {
      const tone = sceneTone(isLight);
      const repaintStatic = () => {
        resize();
        const w = W(), h = H();
        const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
        bg.addColorStop(0, tone.bg[0]);
        bg.addColorStop(0.45, tone.bg[1]);
        bg.addColorStop(0.82, tone.bg[2]);
        bg.addColorStop(1, tone.bg[3]);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        const topBand = ctx.createLinearGradient(0, 0, 0, h * 0.35);
        topBand.addColorStop(0, isLight ? "rgba(0, 130, 180, 0.18)" : "rgba(0,212,255,0.12)");
        topBand.addColorStop(0.5, isLight ? "rgba(4, 120, 87, 0.10)" : "rgba(168,85,247,0.04)");
        topBand.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = topBand;
        ctx.fillRect(0, 0, w, h * 0.35);
        ctx.fillStyle = isLight ? "rgba(4, 120, 87, 0.14)" : "rgba(0,229,160,0.07)";
        ctx.fillRect(0, 0, w, Math.min(h * 0.14, 110));
        const lay = sceneLayoutCoords(layout, w, h);
        const hubX = lay.hubX, hubY = lay.hubY;
        ctx.strokeStyle = isLight ? "rgba(0, 130, 180, 0.22)" : "rgba(0,212,255,0.09)";
        ctx.lineWidth = 1.4;
        for (let ri = 1; ri <= 4; ri++) {
          const R = Math.min(w, h) * (0.12 + ri * 0.072);
          ctx.beginPath();
          ctx.ellipse(hubX, hubY, R * 1.12, R * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        const HEX = 54, hexH = HEX * Math.sqrt(3);
        for (let col2 = -1; col2 * HEX * 1.5 < w + HEX; col2++) {
          for (let row2 = -1; row2 * hexH < h + hexH; row2++) {
            const hx = col2 * HEX * 1.5;
            const hy = row2 * hexH + (col2 % 2 === 0 ? 0 : hexH / 2);
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ax = hx + HEX * Math.cos((Math.PI / 3) * k - Math.PI / 6);
              const ay = hy + HEX * Math.sin((Math.PI / 3) * k - Math.PI / 6);
              k === 0 ? ctx.moveTo(ax, ay) : ctx.lineTo(ax, ay);
            }
            ctx.closePath();
            ctx.strokeStyle = tone.hexStroke; ctx.lineWidth = 0.75; ctx.stroke();
          }
        }
      };
      repaintStatic();
      window.addEventListener("resize", repaintStatic);
      return () => window.removeEventListener("resize", repaintStatic);
    }

    resize();
    window.addEventListener("resize", resize);

    // State
    interface Particle { x: number; y: number; vx: number; vy: number; r: number; alpha: number }
    const PTS: Particle[] = Array.from({ length: 72 }, () => ({
      x: Math.random() * lw, y: Math.random() * lh,
      vx: (Math.random() - 0.5) * 0.42, vy: (Math.random() - 0.5) * 0.42,
      r: 1.4 + Math.random() * 2.4, alpha: 0.35 + Math.random() * 0.45,
    }));

    type Ring = { r: number; alpha: number; col: string };
    const rings: Ring[][] = FAC_NODES.map(() => []);
    let ringSpawn = 0;
    let ecgOffset = 0;
    let scanY = 0;
    let helixT = 0;
    let ctScanY = 0;

    type FP = { t: number; speed: number; from: number; to: number };
    const flowP: FP[] = Array.from({ length: 20 }, () => ({
      t: Math.random(), speed: 0.0008 + Math.random() * 0.0012,
      from: Math.floor(Math.random() * FAC_NODES.length),
      to:   Math.floor(Math.random() * FAC_NODES.length),
    }));

    let raf = 0;

    const draw = () => {
      try {
      const tone = sceneTone(isLight);
      const C = tone.C;
      const facCols = [C.cyan, C.green, C.violet, C.pink, C.amber, C.teal, C.cyan];
      const organCols = [C.cyan, C.pink, C.cyan, C.cyan, C.amber, C.violet, C.violet, C.green];
      const ptVitals = vitalsWithPal(PT_VITALS, C, ["cyan", "green", "teal", "amber", "pink"]);
      const drVitals = vitalsWithPal(DR_VITALS, C, ["green", "cyan", "green", "pink", "amber", "teal"]);
      const mcBoost = isLight ? 2.4 * tone.lightBoost : 1;
      const ecgAlpha = isLight ? 0.72 : 0.38;
      const bodyAlpha = isLight ? 0.44 : 0.165;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // ── 1. Background (richer theatre wash) ───────────────────
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
      bg.addColorStop(0,   tone.bg[0]);
      bg.addColorStop(0.35,tone.bg[1]);
      bg.addColorStop(0.72,tone.bg[2]);
      bg.addColorStop(1,   tone.bg[3]);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      const washT = ctx.createRadialGradient(w * 0.12, h * 0.88, 0, w * 0.12, h * 0.88, Math.max(w, h) * 0.42);
      washT.addColorStop(0, isLight ? "rgba(4,120,87,0.14)" : "rgba(0,229,160,0.08)");
      washT.addColorStop(0.5, isLight ? "rgba(90, 165, 210,0.06)" : "rgba(0,120,140,0.03)");
      washT.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = washT; ctx.fillRect(0, 0, w, h);

      const washC = ctx.createRadialGradient(w * 0.88, h * 0.12, 0, w * 0.88, h * 0.12, Math.max(w, h) * 0.48);
      washC.addColorStop(0, isLight ? "rgba(109,40,217,0.10)" : "rgba(168,85,247,0.10)");
      washC.addColorStop(0.45, isLight ? "rgba(29,78,216,0.07)" : "rgba(0,100,220,0.06)");
      washC.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = washC; ctx.fillRect(0, 0, w, h);

      const sideA = isLight ? 0.16 : 0.16;
      const lgL = ctx.createLinearGradient(0, 0, w * 0.28, 0);
      lgL.addColorStop(0, isLight ? `rgba(0, 130, 180,${sideA})` : "rgba(0,140,220,0.16)");
      lgL.addColorStop(0.45, isLight ? "rgba(0, 130, 180, 0.06)" : "rgba(0,60,140,0.05)");
      lgL.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lgL; ctx.fillRect(0, 0, w * 0.28, h);
      const lgR = ctx.createLinearGradient(w, 0, w * 0.72, 0);
      lgR.addColorStop(0, isLight ? `rgba(0, 130, 180,${sideA * 0.85})` : "rgba(0,200,255,0.12)");
      lgR.addColorStop(0.42, isLight ? "rgba(4, 120, 87, 0.08)" : "rgba(40,100,220,0.06)");
      lgR.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lgR; ctx.fillRect(w * 0.72, 0, w * 0.28, h);

      const ve = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, h * 0.15, Math.max(w, h) * 0.65);
      ve.addColorStop(0, isLight ? "rgba(0, 130, 180, 0.20)" : "rgba(0,212,255,0.10)");
      ve.addColorStop(0.6, isLight ? "rgba(0, 130, 180, 0.08)" : "rgba(20,80,160,0.03)");
      ve.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ve; ctx.fillRect(0, 0, w, h * 0.45);

      // ── 2. Hex grid (readable “command floor”) ─────────────────
      const HEX = 54;
      const hexH = HEX * Math.sqrt(3);
      for (let col2 = -1; col2 * HEX * 1.5 < w + HEX; col2++) {
        for (let row2 = -1; row2 * hexH < h + hexH; row2++) {
          const hx = col2 * HEX * 1.5;
          const hy = row2 * hexH + (col2 % 2 === 0 ? 0 : hexH / 2);
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ax = hx + HEX * Math.cos((Math.PI / 3) * k - Math.PI / 6);
            const ay = hy + HEX * Math.sin((Math.PI / 3) * k - Math.PI / 6);
            k === 0 ? ctx.moveTo(ax, ay) : ctx.lineTo(ax, ay);
          }
          ctx.closePath();
          ctx.strokeStyle = tone.hexStroke; ctx.lineWidth = isLight ? 1.05 : 0.85; ctx.stroke();
        }
      }

      const now = performance.now() / 1000;

      // ── 3. Ambient glow blobs (much more presence) ─────────────
      [
        { xf: 0.82, yf: 0.10, col: C.cyan,   r: 290 },
        { xf: 0.16, yf: 0.88, col: C.violet, r: 240 },
        { xf: 0.50, yf: 0.52, col: C.blue,   r: 360 },
        { xf: 0.06, yf: 0.38, col: C.teal,   r: 170 },
        { xf: 0.90, yf: 0.65, col: C.green,  r: 200 },
        { xf: 0.38, yf: 0.22, col: C.pink,   r: 120 },
      ].forEach(blob => {
        const bx = blob.xf * w, by = blob.yf * h;
        const p  = (0.032 + 0.016 * Math.sin(now * 0.55 + blob.r * 0.01)) * tone.blobMul;
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r);
        rg.addColorStop(0, `${blob.col}${p})`);
        rg.addColorStop(0.5, `${blob.col}${p * 0.45})`);
        rg.addColorStop(1, `${blob.col}0)`);
        ctx.beginPath(); ctx.arc(bx, by, blob.r, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.fill();
      });

      // ── 3b. Tactical hub rings (pulsing “clinical command”) ─────
      const lay = sceneLayoutCoords(layout, w, h);
      const hubX = lay.hubX, hubY = lay.hubY;
      for (let ri = 1; ri <= 5; ri++) {
        const breathe = Math.sin(now * 1.1 + ri * 0.7) * (6 + ri * 2);
        const R = Math.min(w, h) * (0.095 + ri * 0.062) + breathe;
        ctx.beginPath();
        ctx.ellipse(hubX, hubY, R * 1.08 + ri * 3, R * 0.88 + ri * 2, now * 0.05 + ri * 0.02, 0, Math.PI * 2);
        ctx.strokeStyle = `${tone.hubCol}${tone.hubBase - ri * tone.hubDecay})`;
        ctx.lineWidth = 1.55 - ri * 0.18;
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hubX, hubY, Math.min(w, h) * 0.028, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? "rgba(4,120,87,0.55)" : "rgba(0,229,160,0.35)"; ctx.lineWidth = 1.2; ctx.stroke();

      // ── 4. Kenya facility network ──────────────────────────────
      // Connection lines
      for (let i = 0; i < FAC_NODES.length; i++) {
        for (let j = i + 1; j < FAC_NODES.length; j++) {
          const ax = FAC_NODES[i].xf * w, ay = FAC_NODES[i].yf * h;
          const bx = FAC_NODES[j].xf * w, by = FAC_NODES[j].yf * h;
          const d = Math.hypot(bx - ax, by - ay);
          if (d > 0.42 * Math.min(w, h)) continue;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.strokeStyle = `${tone.particleCol}${tone.connMul * (1 - d / (0.42 * Math.min(w, h)))})`;
          ctx.lineWidth = 0.85; ctx.stroke();
        }
      }

      // Rings + nodes
      ringSpawn++;
      if (ringSpawn % 75 === 0) {
        const ni = Math.floor(Math.random() * FAC_NODES.length);
        rings[ni].push({ r: 0, alpha: 0.8, col: facCols[ni] });
      }
      FAC_NODES.forEach((node, ni) => {
        const nodeCol = facCols[ni];
        const nx = node.xf * w, ny = node.yf * h;
        rings[ni] = rings[ni].filter(r => r.alpha > 0.01);
        rings[ni].forEach(ring => {
          ctx.beginPath(); ctx.arc(nx, ny, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `${ring.col}${ring.alpha * (isLight ? 0.72 : 0.52)})`;
          ctx.lineWidth = isLight ? 1.4 : 1.1; ctx.stroke();
          ring.r += 1.4; ring.alpha *= 0.976;
        });
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 17);
        ng.addColorStop(0, `${nodeCol}1)`); ng.addColorStop(0.5, `${nodeCol}0.65)`); ng.addColorStop(1, `${nodeCol}0)`);
        ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = `${nodeCol}${isLight ? 0.95 : 0.78})`;
        ctx.fillText(node.label, nx + 9, ny - 6);
      });

      // Flow particles
      flowP.forEach(fp => {
        if (fp.from === fp.to) { fp.t = 0; fp.to = (fp.from + 1) % FAC_NODES.length; return; }
        fp.t += fp.speed;
        if (fp.t >= 1) { fp.from = fp.to; fp.to = Math.floor(Math.random() * FAC_NODES.length); fp.t = 0; }
        const ax = FAC_NODES[fp.from].xf * w, ay = FAC_NODES[fp.from].yf * h;
        const bx = FAC_NODES[fp.to].xf * w,   by = FAC_NODES[fp.to].yf * h;
        const mx = (ax + bx) / 2 - (by - ay) * 0.12;
        const my = (ay + by) / 2 + (bx - ax) * 0.12;
        const t = fp.t;
        const px = (1-t)*(1-t)*ax + 2*(1-t)*t*mx + t*t*bx;
        const py = (1-t)*(1-t)*ay + 2*(1-t)*t*my + t*t*by;
        ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `${facCols[fp.from]}0.85)`; ctx.fill();
        const t2 = Math.max(0, t - 0.03);
        const px2 = (1-t2)*(1-t2)*ax + 2*(1-t2)*t2*mx + t2*t2*bx;
        const py2 = (1-t2)*(1-t2)*ay + 2*(1-t2)*t2*my + t2*t2*by;
        ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(px, py);
        ctx.strokeStyle = `${facCols[fp.from]}${isLight ? 0.58 : 0.42})`; ctx.lineWidth = 1.2; ctx.stroke();
      });

      [
        { xf: 0.08, yf: 0.18, size: 24, a: 0.12, col: C.cyan   },
        { xf: 0.92, yf: 0.28, size: 20, a: 0.10, col: C.green  },
        { xf: 0.14, yf: 0.68, size: 22, a: 0.13, col: C.violet },
        { xf: 0.88, yf: 0.78, size: 26, a: 0.12, col: C.cyan   },
        { xf: 0.50, yf: 0.08, size: 18, a: 0.09, col: C.teal   },
        { xf: 0.78, yf: 0.50, size: 16, a: 0.085, col: C.amber  },
      ].forEach(mc => {
        const pulse = mc.a * mcBoost * (0.82 + 0.18 * Math.sin(now * 0.9 + mc.xf * 10));
        drawMedCross(ctx, mc.xf * w, mc.yf * h, mc.size, pulse, mc.col);
      });

      const { patCX, patCY, patScale, drCX, drCY, drScale, bodyCX, bodyCY, bodyScale } = lay;
      const figAlpha = tone.figMul;
      const isLanding = layout === "landing";
      // On narrow landing viewports, skip clinical HUD so hero CTAs stay readable.
      const showLandingHud = !isLanding || w >= 900;

      if (showLandingHud) {
      drawPatient(ctx, patCX, patCY, patScale, 0.88 * figAlpha, now, C);

      const ptPanelX = isLanding
        ? Math.max(10, patCX - 40)
        : patCX - 100;
      const ptPanelY = isLanding
        ? Math.min(h - 140, patCY - patScale * 0.55)
        : patCY - patScale * 0.68;
      drawVitalsPanel(ctx, ptPanelX, ptPanelY, ptVitals, isLight ? 0.92 : 0.78, C.cyan, C, isLight);

      ctx.strokeStyle = pcol(C, "cyan", isLight ? 0.58 : 0.38); ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(ptPanelX + 168, ptPanelY + 30);
      ctx.quadraticCurveTo(patCX - patScale * 0.25, patCY - patScale * 0.15,
                           patCX - patScale * 0.35, patCY - patScale * 0.10);
      ctx.stroke(); ctx.setLineDash([]);

      drawDoctor(ctx, drCX, drCY, drScale, 0.90 * figAlpha, now, C);

      const drPanelX = isLanding
        ? Math.min(w - 178, drCX - 175)
        : drCX - 220;
      const drPanelY = isLanding
        ? Math.min(h - 160, drCY - drScale * 0.42)
        : drCY - drScale * 0.50;
      drawVitalsPanel(ctx, drPanelX, drPanelY, drVitals, isLight ? 0.92 : 0.78, C.green, C, isLight);

      ctx.strokeStyle = pcol(C, "green", isLight ? 0.52 : 0.34); ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(drPanelX + 168, drPanelY + 20);
      ctx.quadraticCurveTo(drCX - drScale * 0.10, drCY - drScale * 0.12,
                           drCX + drScale * 0.22, drCY - drScale * 0.16);
      ctx.stroke(); ctx.setLineDash([]);

      drawBodyWireframe(ctx, bodyCX, bodyCY, bodyScale, bodyAlpha, C);
      } else if (isLanding) {
        // Soft silhouette wash only — no HUD panels over mobile hero CTAs
        drawPatient(ctx, patCX, patCY, patScale * 0.85, 0.35 * figAlpha, now, C);
        drawDoctor(ctx, drCX, drCY, drScale * 0.85, 0.35 * figAlpha, now, C);
      }

      if (showLandingHud) {
      ORGANS.forEach((org, oi) => {
        const orgCol = organCols[oi];
        const ox = bodyCX + org.dx * bodyScale;
        const oy = bodyCY + org.dy * bodyScale;
        const pulse = 0.6 + 0.4 * Math.sin(now * org.pulse * 1.8 + org.dy * 10);
        const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, org.r * 2.2);
        grd.addColorStop(0, `${orgCol}${pulse * (isLight ? 0.88 : 0.72)})`);
        grd.addColorStop(1, `${orgCol}0)`);
        ctx.beginPath(); ctx.arc(ox, oy, org.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(ox, oy, org.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `${orgCol}${pulse * 0.95})`; ctx.fill();
      });

      // ── 9. CT scan rings ──────────────────────────────────────
      ctScanY += 0.0035;
      if (ctScanY > 1.4) ctScanY = -0.4;
      for (let ri = 0; ri < 4; ri++) {
        const phase = ctScanY - ri * 0.24;
        if (phase < -0.5 || phase > 1.2) continue;
        const ry = bodyCY + (phase - 0.5) * bodyScale * 1.2;
        const normY = phase - 0.5;
        const bodyW = bodyScale * Math.max(0.02, 0.20 - Math.abs(normY) * 0.12);
        const ringAlpha = (isLight ? 0.34 : 0.20) * Math.max(0, 1 - Math.abs(phase - 0.5) * 1.65);
        ctx.beginPath();
        ctx.ellipse(bodyCX, ry, bodyW * 1.1, bodyW * 0.22, 0, 0, Math.PI * 2);
        ctx.strokeStyle = pcol(C, "cyan", ringAlpha + (ri === 0 ? (isLight ? 0.18 : 0.12) : 0));
        ctx.lineWidth = ri === 0 ? (isLight ? 2.4 : 2) : (isLight ? 1.6 : 1.35); ctx.stroke();
        if (ri === 0) {
          ctx.beginPath();
          ctx.moveTo(bodyCX - bodyW * 1.3, ry); ctx.lineTo(bodyCX + bodyW * 1.3, ry);
          ctx.strokeStyle = pcol(C, "green", ringAlpha * 3.8); ctx.lineWidth = 1.1; ctx.stroke();
        }
      }
      }

      // ── 10. Full-width scan line ───────────────────────────────
      scanY += 0.26;
      if (scanY > h + 60) scanY = -60;
      const scanGrad = ctx.createLinearGradient(0, scanY - 45, 0, scanY + 45);
      scanGrad.addColorStop(0,   pcol(C, "cyan", 0));
      scanGrad.addColorStop(0.5, pcol(C, "cyan", isLight ? 0.14 : 0.065));
      scanGrad.addColorStop(1,   pcol(C, "green", 0));
      ctx.fillStyle = scanGrad; ctx.fillRect(0, scanY - 52, w, 104);
      ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY);
      ctx.strokeStyle = tone.scanLine; ctx.lineWidth = 1.05; ctx.stroke();

      // ── 11. Floating particle web ──────────────────────────────
      PTS.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      });
      for (let i = 0; i < PTS.length; i++) {
        for (let j = i + 1; j < PTS.length; j++) {
          const dx = PTS[j].x - PTS[i].x, dy = PTS[j].y - PTS[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath(); ctx.moveTo(PTS[i].x, PTS[i].y); ctx.lineTo(PTS[j].x, PTS[j].y);
            ctx.strokeStyle = `${tone.particleCol}${(1 - d / 130) * tone.particleLine})`; ctx.lineWidth = 0.65; ctx.stroke();
          }
        }
      }
      PTS.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${tone.particleCol}${p.alpha * tone.particleFill})`; ctx.fill();
      });

      // ── 12. ECG strips (bottom) ────────────────────────────────
      ecgOffset += 0.008;
      const ECG_TRACKS = [
        { y: h * 0.88, col: C.green, amp: 32, speed: 1.0,  label: "Lead II" },
        { y: h * 0.93, col: C.cyan,  amp: 24, speed: 0.85, label: "SpO₂" },
      ];
      ECG_TRACKS.forEach(trk => {
        const period = w * 0.20;
        ctx.beginPath();
        let started = false;
        for (let x = 0; x <= w; x += 2) {
          const t = ((x / period) - ecgOffset * trk.speed) % 1;
          const y2 = trk.y - ecgY(t < 0 ? t + 1 : t) * trk.amp;
          if (!started) { ctx.moveTo(x, y2); started = true; } else ctx.lineTo(x, y2);
        }
        ctx.strokeStyle = `${trk.col}${ecgAlpha})`; ctx.lineWidth = isLight ? 1.85 : 1.65; ctx.stroke();
        const lx = ((ecgOffset * trk.speed) % 1) * period + period * 0.16;
        const ly = trk.y - ecgY(0.16) * trk.amp;
        if (lx > 0 && lx < w) {
          ctx.beginPath(); ctx.arc(lx % w, ly, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `${trk.col}0.85)`; ctx.fill();
          ctx.beginPath(); ctx.arc(lx % w, ly, 6.5, 0, Math.PI * 2);
          ctx.strokeStyle = `${trk.col}0.28)`; ctx.lineWidth = 0.9; ctx.stroke();
        }
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = `${trk.col}${isLight ? 0.72 : 0.52})`;
        ctx.fillText(trk.label, 8, trk.y - 7);
      });
      ctx.beginPath(); ctx.moveTo(0, h * 0.85); ctx.lineTo(w, h * 0.85);
      ctx.strokeStyle = pcol(C, "cyan", isLight ? 0.22 : 0.09); ctx.lineWidth = 1; ctx.stroke();

      helixT += 0.009;
      drawHelix(ctx, 36, h * 0.50, h * 0.56, 14, helixT,         C.cyan,   C.violet, C.cyan);
      drawHelix(ctx, w - 36, h * 0.50, h * 0.52, 13, -helixT * 0.82, C.green, C.teal, C.cyan);

      // ── 14. Corner HUD brackets ───────────────────────────────
      const M = 18;
      const bracketA = isLight ? 0.62 : 0.42;
      const bracketB = isLight ? 0.54 : 0.36;
      drawBracket(ctx, M,     M,     "TL", C.cyan,   bracketA);
      drawBracket(ctx, w - M, M,     "TR", C.cyan,   bracketA);
      drawBracket(ctx, M,     h - M, "BL", C.green, bracketB);
      drawBracket(ctx, w - M, h - M, "BR", C.green, bracketB);

      ctx.font = "8px ui-monospace, monospace";
      ctx.fillStyle = `${C.cyan}${tone.hudAlpha})`;
      ctx.fillText("UNI-EHR v3.0", M + 30, M + 4);
      ctx.fillText(new Date().toLocaleTimeString("en-KE", { hour12: false }), M + 30, M + 14);
      ctx.fillStyle = `${C.green}${tone.hudAlpha * 0.9})`;
      ctx.fillText("KDPA 2019 · FHIR R5", w - M - 138, h - M + 4);
      ctx.fillText("ISO 27001 · HL7",     w - M - 114, h - M - 6);

      // CT scan readout
      ctx.font = "7px ui-monospace, monospace";
      ctx.fillStyle = `${C.cyan}${tone.hudAlpha})`;
      ctx.fillText(`CT  ${Math.floor(((ctScanY + 0.4) / 1.8) * 100)}%`,
        bodyCX + bodyScale * 0.25,
        bodyCY + (ctScanY - 0.5) * bodyScale * 1.2);

      } catch (e) {
        console.error("[MedicalBackground] draw error:", e);
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [canvasEl, theme, layout]);

  const sceneInterior = (
    <>
      <div className="unihealth-med-scene-css" />
      <div className="unihealth-med-scene-grid" aria-hidden />
      <div className="unihealth-med-scene-scan" aria-hidden />
      <canvas ref={setCanvasEl} className="unihealth-med-scene-canvas unihealth-medical-bg" aria-hidden />
    </>
  );

  if (typeof document === "undefined") return null;
  const sceneHost = document.getElementById(MEDICAL_SCENE_HOST_ID);
  if (!sceneHost) {
    console.warn(`[MedicalBackground] Missing #${MEDICAL_SCENE_HOST_ID} in index.html`);
    return null;
  }

  return createPortal(sceneInterior, sceneHost);
}
