export function buildVitalMapFromObs(observations: any[] | null | undefined): Record<string, number> {
  const vitalMap: Record<string, number> = {};
  for (const o of observations ?? []) {
    const code = (o.code ?? "").toLowerCase();
    const val = parseFloat(
      (o as { valueQuantity?: { value?: number }; value?: number; value_text?: string }).valueQuantity?.value
        ?? (o as { value?: number }).value
        ?? o.value_text
        ?? "",
    );
    if (Number.isNaN(val)) continue;
    if (code.includes("respiratory") || code.includes("8867-4")) vitalMap.rr = val;
    if (code.includes("oxygen") || code.includes("59408-5") || code.includes("spo2")) vitalMap.spo2 = val;
    if (code.includes("systolic") || code.includes("8480-6") || code.includes("blood pressure")) vitalMap.sbp = val;
    if (code.includes("heart") || code.includes("8867") || code.includes("pulse")) vitalMap.hr = val;
    if (code.includes("temp") || code.includes("8310-5")) vitalMap.temp = val;
    if (code.includes("glucose") || code.includes("2339-0")) vitalMap.glucose = val;
    if (code.includes("creatinine") || code.includes("2160-0")) vitalMap.creatinine = val;
    if (code.includes("potassium") || code.includes("6298-4")) vitalMap.potassium = val;
  }
  return vitalMap;
}

export function riskBandClass(band: string | undefined): "low" | "med" | "high" {
  const b = (band ?? "LOW").toUpperCase();
  if (b === "HIGH") return "high";
  if (b === "MEDIUM") return "med";
  return "low";
}

export type RiskScoreResult = {
  patient_id: string;
  risk_band: string;
  model_type?: string;
  model_version?: string;
  ml_probability?: number;
  news2?: Record<string, unknown>;
  active_alerts?: number;
  drivers?: string[];
  disclaimer?: string;
};
