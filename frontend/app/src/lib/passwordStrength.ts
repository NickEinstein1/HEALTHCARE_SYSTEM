export type StrengthClass = "" | "weak" | "fair" | "good" | "strong";

export function computePasswordStrength(pw: string): {
  score: number;
  cls: StrengthClass;
  label: string;
  labelColor: string;
  hasLen: boolean;
  hasUpper: boolean;
  hasNum: boolean;
  hasSym: boolean;
} {
  if (!pw) {
    return {
      score: 0,
      cls: "",
      label: "",
      labelColor: "var(--t3)",
      hasLen: false,
      hasUpper: false,
      hasNum: false,
      hasSym: false,
    };
  }
  let score = 0;
  const hasLen = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pw);
  const hasLong = pw.length >= 12;
  if (hasLen) score++;
  if (hasUpper) score++;
  if (hasNum) score++;
  if (hasSym) score++;
  if (hasLong) score++;
  const cls: StrengthClass =
    score <= 1 ? "weak" : score <= 2 ? "fair" : score <= 3 ? "good" : "strong";
  const labels = ["", "Too Weak", "Fair", "Good", "Strong", "Very Strong"];
  const label = labels[Math.min(score, 5)] ?? "";
  const labelColor =
    score <= 1 ? "#ef4444" : score <= 2 ? "#f97316" : score <= 3 ? "#eab308" : "var(--g)";
  return { score, cls, label, labelColor, hasLen, hasUpper, hasNum, hasSym };
}
