/**
 * Mirrors `frontend/app/src/styles/unihealth.css` :root — keep in sync with web portal.
 */
export const colors = {
  g: "#1a8a4a",
  gd: "#0a4a26",
  gl: "#e6f5ed",
  gm: "#b6dfc8",
  r: "#c0392b",
  rl: "#fff1f2",
  rm: "#fecaca",
  b: "#1d4ed8",
  bl: "#dbeafe",
  bm: "#bfdbfe",
  am: "#d97706",
  al: "#fef3c7",
  amm: "#fde68a",
  te: "#0d9488",
  w: "#ffffff",
  bg: "#f4f7f4",
  card: "#ffffff",
  bdr: "#dde3dd",
  t1: "#14201a",
  t2: "#31463a",
  t3: "#5f776a",
  t4: "#9bb0a5",
  heroAccent: "#7beba4",
  shadow: "rgba(10, 74, 38, 0.12)",
} as const;

export type TagTone = "green" | "blue" | "amber" | "red" | "grey";

export const tagStyles: Record<TagTone, { bg: string; text: string; border: string }> = {
  green: { bg: colors.gl, text: colors.gd, border: colors.gm },
  blue: { bg: colors.bl, text: "#1e40af", border: colors.bm },
  amber: { bg: colors.al, text: "#78350f", border: colors.amm },
  red: { bg: colors.rl, text: "#7f1d1d", border: colors.rm },
  grey: { bg: "#f3f4f6", text: colors.t3, border: "#e5e7eb" },
};
