/** UHIC brand — violet + actuarial teal (matches web uhic-module.css) */
export const colors = {
  violet: "#6d28d9",
  violetDark: "#4c1d95",
  violetLight: "#ede9fe",
  violetMid: "#c4b5fd",
  teal: "#0082b4",
  tealLight: "#e0f2fe",
  g: "#1a8a4a",
  gd: "#0a4a26",
  gl: "#e6f5ed",
  r: "#c0392b",
  rl: "#fff1f2",
  am: "#d97706",
  al: "#fef3c7",
  w: "#ffffff",
  bg: "#f6f4fa",
  card: "#ffffff",
  bdr: "#e2dde8",
  t1: "#1a1425",
  t2: "#3d3550",
  t3: "#6b6280",
  t4: "#a39bb5",
  mesh1: "#f3effa",
  mesh2: "#faf8fd",
} as const;

export type TagTone = "violet" | "teal" | "green" | "amber" | "red" | "grey";

export const tagStyles: Record<TagTone, { bg: string; text: string; border: string }> = {
  violet: { bg: colors.violetLight, text: colors.violetDark, border: colors.violetMid },
  teal: { bg: colors.tealLight, text: "#0c4a6e", border: "#7dd3fc" },
  green: { bg: colors.gl, text: colors.gd, border: "#b6dfc8" },
  amber: { bg: colors.al, text: "#78350f", border: "#fde68a" },
  red: { bg: colors.rl, text: "#7f1d1d", border: "#fecaca" },
  grey: { bg: "#f3f4f6", text: colors.t3, border: "#e5e7eb" },
};

export const gradients = {
  brand: [colors.violet, colors.teal] as const,
  hero: [colors.violetDark, "#5b21b6", colors.teal] as const,
} as const;
