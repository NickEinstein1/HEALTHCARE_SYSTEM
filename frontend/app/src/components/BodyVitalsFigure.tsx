import { useMemo } from "react";
import { HumanFigure3D } from "./HumanFigure3D";

export type BodyVitalRow = {
  key: string;
  label: string;
  icon: string;
  unit: string;
  range: string;
  value: string | null;
  measuredAt?: string | null;
};

type Props = {
  vitals: BodyVitalRow[];
  gender?: "male" | "female";
  activeVital?: string | null;
  onVitalHover?: (key: string | null) => void;
  subtitle?: string;
  footerNote?: string;
};

/** 3D anatomical vitals map (shared by patient and nurse dashboards). */
export function BodyVitalsFigure({
  vitals,
  gender = "male",
  activeVital,
  onVitalHover,
  subtitle,
  footerNote,
}: Props) {
  const figureVitals = useMemo(() => {
    const regionMap: Record<string, "head" | "chest" | "abdomen" | "arm-l" | "arm-r" | "leg-l" | "leg-r"> = {
      temp: "head",
      hr: "chest",
      rr: "chest",
      bp: "arm-l",
      spo2: "arm-r",
      glucose: "abdomen",
      pain: "abdomen",
      avpu: "head",
      bmi: "leg-l",
      weight: "leg-r",
    };
    return vitals
      .filter((v) => regionMap[v.key] && v.value != null && String(v.value).trim() !== "")
      .map((v) => {
        const num = Number(String(v.value).replace(/[^\d.+-]/g, ""));
        let status: "normal" | "high" | "low" = "normal";
        if (v.key === "bp" && String(v.value).includes("14")) status = "high";
        else if (v.key === "glucose" && Number.isFinite(num) && num > 7) status = "high";
        else if (v.key === "spo2" && Number.isFinite(num) && num < 92) status = "low";
        else if (v.key === "temp" && Number.isFinite(num) && num >= 38) status = "high";
        return {
          key: v.key,
          label: v.label,
          value: v.value ?? "—",
          unit: v.unit,
          icon: v.icon,
          region: regionMap[v.key]!,
          status,
        };
      });
  }, [vitals]);

  return (
    <div className="body-fig">
      <div className="body-fig-hd">
        <div>
          <div className="body-fig-ti">3D Body Vitals Map</div>
          <div className="body-fig-su">
            {subtitle ??
              `Anatomical exoskeleton · ${gender === "female" ? "Female" : "Male"} · hover regions`}
          </div>
        </div>
        <span className="tag g dot">LIVE</span>
      </div>

      <div className="body-fig-in" style={{ position: "relative", padding: "8px 4px 4px" }}>
        <HumanFigure3D
          gender={gender}
          vitals={figureVitals}
          activeVital={activeVital ?? null}
          onVitalHover={onVitalHover}
        />
      </div>

      <div className="body-fig-ft">
        <div style={{ fontSize: 10.5, color: "var(--t3)", lineHeight: 1.55 }}>
          {footerNote ??
            "Values reflect the selected patient and current entry form. Hover regions to highlight vitals."}
        </div>
      </div>
    </div>
  );
}
