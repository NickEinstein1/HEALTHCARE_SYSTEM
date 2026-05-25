import { ScreenIntro } from "../components/ScreenIntro";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { InfoRow } from "../components/ui/InfoRow";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { FALLBACK_VISITS } from "../lib/patientPortalData";

export function VisitsScreen() {
  const { summary } = usePatient();
  const encounters = summary?.encounters ?? [];
  const rows =
    encounters.length > 0
      ? encounters.map((e) => ({
          when: e.period_start?.slice(0, 10) ?? "—",
          fac: "UniHealth Facility",
          type: e.type ?? "Encounter",
          dept: "—",
          ref: e.id,
        }))
      : FALLBACK_VISITS;

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="All hospital and clinic visits on your UniHealth record." accent />
      <Panel title="All visits" subtitle="FHIR encounters and pilot sample rows" noPadding>
        {rows.map((v) => (
          <InfoRow
            key={v.ref}
            icon={v.type === "Inpatient" ? "🏥" : "🩺"}
            title={v.fac}
            subtitle={`${v.when} · ${v.type} · ${v.dept}`}
            value={v.ref}
            right={<Tag label={v.type === "Inpatient" ? "IP" : "OP"} tone="blue" />}
          />
        ))}
      </Panel>
    </AnimatedScrollScreen>
  );
}
