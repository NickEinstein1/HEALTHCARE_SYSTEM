export function fmtKes(n: number): string {
  return `Ksh ${Math.round(n).toLocaleString()}`;
}

export function fmtPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function fraudTone(band: string): "green" | "amber" | "red" {
  if (band === "low") return "green";
  if (band === "medium") return "amber";
  return "red";
}

export function claimStatusTone(status: string): "green" | "amber" | "red" | "grey" {
  if (status === "adjudicated" || status === "paid") return "green";
  if (status === "flagged" || status === "submitted") return "amber";
  if (status === "rejected") return "red";
  return "grey";
}
