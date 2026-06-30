/**
 * Design tokens mirror `src/styles/unihealth.css` `:root`.
 * Use CSS variables in components; this file is for TS/Storybook/docs.
 */
export const cssVar = {
  g: "--g",
  gd: "--gd",
  gl: "--gl",
  gm: "--gm",
  r: "--r",
  b: "--b",
  bl: "--bl",
  am: "--am",
  al: "--al",
  w: "--w",
  bg: "--bg",
  card: "--card",
  bdr: "--bdr",
  bdr2: "--bdr2",
  t1: "--t1",
  t2: "--t2",
  t3: "--t3",
  font: "--font",
  serif: "--serif",
  mono: "--mono",
  sh: "--sh",
  shG: "--sh-g",
} as const;

export type RoleKey = "doctor" | "nurse" | "admin" | "patient" | "lab" | "pharmacy" | "billing";
