export function insightSeverityTag(severity?: string): { cls: string; label: string } {
  const s = String(severity || "").toLowerCase();
  if (s === "high" || s === "critical") return { cls: "r", label: "ACTION NEEDED" };
  if (s === "medium" || s === "warning") return { cls: "am", label: "REMINDER" };
  return { cls: "b", label: "PREVENTIVE" };
}

export function insightIcon(severity?: string): string {
  return severity === "high" ? "⚠️" : "💡";
}
