import { StyleSheet, Text } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { InfoRow } from "../components/ui/InfoRow";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { REFERENCE_RESULTS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ResultsScreen() {
  const { observations, toast } = usePatient();
  const hasLive = observations.length > 0;

  const renderResult = (
    key: string,
    name: string,
    when: string,
    value: string,
    flag?: "high" | "normal",
  ) => (
    <InfoRow
      key={key}
      icon={flag === "high" ? "⚠️" : "🧪"}
      title={name}
      subtitle={when}
      value={value}
      highlight={flag === "high"}
      right={<Tag label={flag === "high" ? "High" : "Normal"} tone={flag === "high" ? "red" : "green"} />}
    />
  );

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Labs, imaging, and FHIR observations." accent />
      <Notice
        icon="⚠️"
        title="1 result needs attention"
        body="LDL Cholesterol above normal range. Discuss at your next visit."
        tone="amber"
      />
      <Panel title="Observations · live" subtitle={hasLive ? `${observations.length} from gateway` : "Sample rows when empty"} noPadding>
        {(hasLive ? observations : []).slice(0, 12).map((o) =>
          renderResult(o.id, o.code ?? "Result", o.effective_time ?? "—", o.value_text ?? "—"),
        )}
        {!hasLive ? <Text style={styles.empty}>Showing reference results below.</Text> : null}
      </Panel>
      <Panel title="Recent results" noPadding>
        {(hasLive ? [] : REFERENCE_RESULTS).map((r) =>
          renderResult(r.name, r.name, r.range, r.value, r.flag === "high" ? "high" : "normal"),
        )}
        {hasLive
          ? REFERENCE_RESULTS.filter((d) => d.flag === "high").map((r) =>
              renderResult(`ref-${r.name}`, r.name, r.range, r.value, "high"),
            )
          : null}
      </Panel>
      <SecondaryButton label="Download results PDF" onPress={() => toast("Preparing results export…")} />
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, padding: 16 },
});
