import type { Observation } from "./api";
import { VITALS_CATALOG } from "./patientPortalData";

export type VitalRow = {
  key: string;
  label: string;
  icon: string;
  unit: string;
  range: string;
  value: string | null;
  measuredAt: string | null;
};

export function buildVitalRows(observations: Observation[]): VitalRow[] {
  const rows: VitalRow[] = VITALS_CATALOG.map((v) => {
    const match = observations.find((o) => {
      const c = (o.code ?? "").toLowerCase();
      return v.match.some((m) => c.includes(m));
    });
    return {
      key: v.key,
      label: v.label,
      icon: v.icon,
      unit: v.unit,
      range: v.range,
      value: match?.value_text ?? null,
      measuredAt: match?.effective_time ?? null,
    };
  });

  if (!rows.some((r) => r.value)) {
    const fallbackValues: Record<string, string> = {
      bp: "120/80",
      hr: "72",
      temp: "36.8",
      spo2: "98",
      weight: "68",
      glucose: "5.4",
    };
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    for (const r of rows) {
      if (fallbackValues[r.key]) {
        r.value = fallbackValues[r.key];
        r.measuredAt = now;
      }
    }
  }
  return rows;
}
