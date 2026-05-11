/**
 * MedicalBackground
 * Canvas-based animated background for UniHealth EHR.
 *
 * Layers (rendered every frame via rAF):
 *  1. Hex-grid tiles — subtle honeycomb that lights up on scan pass
 *  2. Particle network — floating data nodes, lines drawn when within range
 *  3. Facility radar pings — 5 hospital nodes emit expanding rings
 *  4. ECG trace — classic heartbeat waveform scrolling across the screen
 *  5. DNA / helix — two rotating helix silhouettes in opposite corners
 *  6. Scan line — slow horizontal sweep that illuminates the grid
 *  7. Data flow arrows — tiny particles racing along curved paths
 */

import { useEffect, useRef } from "react";

// ── Palette ────────────────────────────────────────────────────────
const C = {
  cyan:   "rgba(0,210,255,",
  green:  "rgba(0,229,160,",
  violet: "rgba(168,85,247,",
  pink:   "rgba(255,77,133,",
  amber:  "rgba(255,184,48,",
  white:  "rgba(220,240,255,",
};

// ── ECG waveform — one full cardiac cycle as normalised (0–1) points ─
//  (x: 0-1, y: -1 to 1 where 0 is baseline)
const ECG_CYCLE: [number, number][] = [
  [0.00, 0.00],[0.05, 0.00],[0.08, 0.08],[0.10, 0.00],          // P-wave
  [0.12, 0.00],[0.14,-0.10],[0.16, 1.00],[0.18,-0.18],[0.20, 0.00],// QRS
  [0.28, 0.00],[0.33, 0.22],[0.40, 0.00],[1.00, 0.00],           // T-wave → flat
];

function ecgY(t: number): number {
  // Linear interpolation through the ECG_CYCLE table
  const cycle = t % 1;
  for (let i = 0; i < ECG_CYCLE.length - 1; i++) {
    const [x0, y0] = ECG_CYCLE[i];
    const [x1, y1] = ECG_CYCLE[i + 1];
    if (cycle >= x0 && cycle <= x1) {
      const frac = (cycle - x0) / (x1 - x0);
      return y0 + (y1 - y0) * frac;
    }
  }
  return 0;
}

// ── Hex grid ───────────────────────────────────────────────────────
const HEX_SIZE = 38;
function hexCorner(cx: number, cy: number, i: number) {
  const deg = 60 * i - 30;
  const rad = (Math.PI / 180) * deg;
  return [cx + HEX_SIZE * Math.cos(rad), cy + HEX_SIZE * Math.sin(rad)] as [number, number];
}
function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, alpha: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const [x, y] = hexCorner(cx, cy, i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0,210,255,${alpha})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

// ── Facility nodes (radar source positions as fractions of viewport) ─
const NODES = [
  { xf: 0.15, yf: 0.22, col: C.cyan,   label: "KNH" },
  { xf: 0.82, yf: 0.18, col: C.green,  label: "MTRH" },
  { xf: 0.50, yf: 0.55, col: C.violet, label: "HQ" },
  { xf: 0.20, yf: 0.78, col: C.pink,   label: "CG" },
  { xf: 0.78, yf: 0.75, col: C.amber,  label: "NKR" },
];

// ── Particle ───────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; alpha: number;
}

// ── DNA helix helper ───────────────────────────────────────────────
function drawHelix(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  height: number, width: number,
  t: number, col1: string, col2: string,
) {
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const frac = i / steps;
    const y = cy - height / 2 + frac * height;
    const phase = frac * Math.PI * 6 + t;
    const x1 = cx + Math.cos(phase) * width;
    const x2 = cx - Math.cos(phase) * width;
    const a = 0.05 + 0.08 * Math.abs(Math.cos(phase));

    // Strand 1
    ctx.beginPath();
    ctx.arc(x1, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `${col1}${a})`;
    ctx.fill();

    // Strand 2
    ctx.beginPath();
    ctx.arc(x2, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `${col2}${a})`;
    ctx.fill();

    // Cross-rungs every ~10 steps
    if (i % 10 === 0) {
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.strokeStyle = `rgba(0,210,255,${a * 0.7})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

// ── Main component ─────────────────────────────────────────────────
export function MedicalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Resize
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── State ────────────────────────────────────────────────────
    const W = () => canvas.width;
    const H = () => canvas.height;

    // Particles
    const PARTICLE_COUNT = 60;
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.5,
    }));

    // Radar rings per node
    type Ring = { r: number; alpha: number; col: string };
    const rings: Ring[][] = NODES.map(() => []);

    // ECG scrolling offset
    let ecgOffset = 0;

    // Scan line position (0 → H)
    let scanY = 0;

    // Helix time
    let helixT = 0;

    // Data flow particles along bezier paths
    type FlowParticle = { t: number; speed: number; fromNode: number; toNode: number };
    const flowParticles: FlowParticle[] = Array.from({ length: 30 }, () => ({
      t: Math.random(),
      speed: 0.001 + Math.random() * 0.0015,
      fromNode: Math.floor(Math.random() * NODES.length),
      toNode:   Math.floor(Math.random() * NODES.length),
    }));

    // Ring spawn timer
    let ringSpawn = 0;

    // ── rAF loop ─────────────────────────────────────────────────
    let raf = 0;

    const draw = () => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // ── 1. Hex grid ────────────────────────────────────────
      const hexW = HEX_SIZE * Math.sqrt(3);
      const hexH = HEX_SIZE * 2;
      const colCount = Math.ceil(w / hexW) + 2;
      const rowCount = Math.ceil(h / (hexH * 0.75)) + 2;

      for (let row = -1; row < rowCount; row++) {
        for (let col = -1; col < colCount; col++) {
          const cx = col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
          const cy = row * hexH * 0.75;
          // How close is this hex to the scan line?
          const distToScan = Math.abs(cy - scanY);
          const scanGlow = Math.max(0, 1 - distToScan / 90);
          const baseAlpha = 0.028 + scanGlow * 0.055;
          drawHex(ctx, cx, cy, baseAlpha);
        }
      }

      // ── 2. Scan line ─────────────────────────────────────
      scanY += 0.35;
      if (scanY > h + 80) scanY = -80;

      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
      grad.addColorStop(0,   "rgba(0,210,255,0)");
      grad.addColorStop(0.5, "rgba(0,210,255,0.06)");
      grad.addColorStop(1,   "rgba(0,210,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 60, w, 120);

      // Bright leading edge
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.strokeStyle = "rgba(0,210,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── 3. Radar pings ────────────────────────────────────
      ringSpawn++;
      if (ringSpawn % 80 === 0) {
        const ni = Math.floor(Math.random() * NODES.length);
        rings[ni].push({ r: 0, alpha: 0.7, col: NODES[ni].col });
      }

      NODES.forEach((node, ni) => {
        const nx = node.xf * w, ny = node.yf * h;

        // Expand & fade rings
        rings[ni] = rings[ni].filter(ring => ring.alpha > 0.01);
        rings[ni].forEach(ring => {
          ctx.beginPath();
          ctx.arc(nx, ny, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `${ring.col}${ring.alpha * 0.5})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ring.r     += 1.8;
          ring.alpha *= 0.975;
        });

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, 5, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, 14);
        glow.addColorStop(0, `${node.col}0.9)`);
        glow.addColorStop(1, `${node.col}0)`);
        ctx.fillStyle = glow;
        ctx.fill();

        // Node label
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillStyle = `${node.col}0.55)`;
        ctx.fillText(node.label, nx + 9, ny - 8);
      });

      // ── 4. Connection lines between nodes ─────────────────
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const ax = NODES[i].xf * w, ay = NODES[i].yf * h;
          const bx = NODES[j].xf * w, by = NODES[j].yf * h;
          const dist = Math.hypot(bx - ax, by - ay);
          if (dist > 0.50 * Math.min(w, h)) continue; // skip very far pairs
          const alpha = 0.035 * (1 - dist / (0.5 * Math.min(w, h)));
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(0,210,255,${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // ── 5. Data flow particles along node paths ───────────
      flowParticles.forEach(fp => {
        if (fp.fromNode === fp.toNode) { fp.t = 0; fp.toNode = (fp.fromNode + 1) % NODES.length; return; }
        fp.t += fp.speed;
        if (fp.t >= 1) {
          fp.fromNode = fp.toNode;
          fp.toNode = Math.floor(Math.random() * NODES.length);
          fp.t = 0;
        }
        const ax = NODES[fp.fromNode].xf * w, ay = NODES[fp.fromNode].yf * h;
        const bx = NODES[fp.toNode].xf * w,   by = NODES[fp.toNode].yf * h;
        // Quadratic bezier with midpoint lifted
        const mx = (ax + bx) / 2 - (by - ay) * 0.15;
        const my = (ay + by) / 2 + (bx - ax) * 0.15;
        const t = fp.t;
        const px = (1-t)*(1-t)*ax + 2*(1-t)*t*mx + t*t*bx;
        const py = (1-t)*(1-t)*ay + 2*(1-t)*t*my + t*t*by;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${NODES[fp.fromNode].col}0.70)`;
        ctx.fill();

        // Tiny tail
        const t2 = Math.max(0, t - 0.03);
        const px2 = (1-t2)*(1-t2)*ax + 2*(1-t2)*t2*mx + t2*t2*bx;
        const py2 = (1-t2)*(1-t2)*ay + 2*(1-t2)*t2*my + t2*t2*by;
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(px, py);
        ctx.strokeStyle = `${NODES[fp.fromNode].col}0.30)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // ── 6. Floating particle network ──────────────────────
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      });

      const LINK_DIST = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particles[i].x;
          const dy = particles[j].y - particles[i].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const a = (1 - d / LINK_DIST) * 0.10;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,210,255,${a})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Dim particles near the left sidebar
        const distFromSidebar = p.x - 248;
        const dimFactor = distFromSidebar < 0 ? 0.35 : 1;
        ctx.fillStyle = `rgba(0,210,255,${p.alpha * dimFactor * 0.55})`;
        ctx.fill();
      });

      // ── 7. ECG heartbeat trace ────────────────────────────
      const ECG_LINES = [
        { y: h * 0.32, col: C.green,  amp: 38, speed: 0.008 },
        { y: h * 0.68, col: C.cyan,   amp: 30, speed: 0.006 },
      ];

      ecgOffset += 0.01;

      ECG_LINES.forEach(ecg => {
        const PERIOD = w * 0.28; // one beat cycle in pixels
        ctx.beginPath();
        let started = false;
        for (let x = 0; x <= w; x += 2) {
          const t = ((x / PERIOD) - ecgOffset) % 1;
          const y = ecg.y - ecgY(t < 0 ? t + 1 : t) * ecg.amp;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${ecg.col}0.22)`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Bright leading dot: find x where t ≈ 0.16 (just past R-peak)
        const leadX = (ecgOffset % 1) * PERIOD + PERIOD * 0.16;
        const leadT = 0.16;
        const leadY = ecg.y - ecgY(leadT) * ecg.amp;
        if (leadX > 0 && leadX < w) {
          ctx.beginPath();
          ctx.arc(leadX % w, leadY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `${ecg.col}0.85)`;
          ctx.fill();
          // Glow ring
          ctx.beginPath();
          ctx.arc(leadX % w, leadY, 8, 0, Math.PI * 2);
          ctx.strokeStyle = `${ecg.col}0.25)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // ── 8. DNA helices (corners) ───────────────────────────
      helixT += 0.012;
      // Top-right
      drawHelix(ctx, w - 60, 130, 220, 18, helixT, C.cyan, C.violet);
      // Bottom-left
      drawHelix(ctx, 160, h - 130, 200, 16, -helixT * 0.9, C.green, C.cyan);

      // ── 9. Ambient glow circles (very large, blurred via alpha) ─
      const now = performance.now() / 1000;
      [
        { xf: 0.82, yf: 0.10, col: C.cyan,   r: 220 },
        { xf: 0.18, yf: 0.88, col: C.violet, r: 180 },
        { xf: 0.50, yf: 0.50, col: C.green,  r: 260 },
      ].forEach(blob => {
        const bx = blob.xf * w;
        const by = blob.yf * h;
        const pulse = 0.018 + 0.006 * Math.sin(now * 0.7 + blob.r);
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r);
        rg.addColorStop(0,   `${blob.col}${pulse})`);
        rg.addColorStop(0.5, `${blob.col}${pulse * 0.5})`);
        rg.addColorStop(1,   `${blob.col}0)`);
        ctx.beginPath();
        ctx.arc(bx, by, blob.r, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
