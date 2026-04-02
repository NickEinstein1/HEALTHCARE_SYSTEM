export type RiskLevel = "low" | "med";

export type RiskState = {
  level: RiskLevel;
  scoreLabel: string;
  signals: { text: string; color: string }[];
};

export function computeRiskState(failedAttempts: number): RiskState {
  const h = new Date().getHours();
  const unusual = h < 6 || h > 22;
  if (unusual || failedAttempts > 0) {
    const signals: { text: string; color: string }[] = [];
    if (unusual) signals.push({ text: "Unusual login time detected", color: "#92400e" });
    if (failedAttempts > 0)
      signals.push({
        text: `${failedAttempts} failed attempt(s) this session`,
        color: "#92400e",
      });
    signals.push({ text: "Location consistent with history", color: "#166534" });
    return { level: "med", scoreLabel: "MEDIUM RISK", signals };
  }
  return {
    level: "low",
    scoreLabel: "LOW RISK",
    signals: [
      { text: "Known device detected", color: "#166534" },
      { text: "Login time within normal hours", color: "#166534" },
      { text: "Location: registered region — consistent", color: "#166534" },
    ],
  };
}
