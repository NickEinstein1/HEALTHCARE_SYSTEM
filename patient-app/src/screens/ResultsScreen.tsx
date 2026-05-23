import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { DEMO_RESULTS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ResultsScreen() {
  const { observations, toast } = usePatient();
  const hasLive = observations.length > 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Laboratory" title="Test Results" subtitle="Labs, imaging, and FHIR observations." />
      <Notice
        icon="⚠️"
        title="1 result needs attention"
        body="LDL Cholesterol above normal range. Discuss at your next visit."
        tone="amber"
      />
      <Panel title={`Observations · live`} subtitle={hasLive ? `${observations.length} from gateway` : "Demo rows when empty"}>
        {(hasLive ? observations : []).slice(0, 12).map((o) => (
          <View key={o.id} style={styles.row}>
            <View style={[styles.dot, styles.dotNorm]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{o.code ?? "Result"}</Text>
              <Text style={styles.when}>{o.effective_time ?? "—"}</Text>
            </View>
            <Text style={styles.val}>{o.value_text ?? "—"}</Text>
            <SecondaryButton label="View" onPress={() => toast(`${o.code}: ${o.value_text ?? "—"}`)} />
          </View>
        ))}
        {!hasLive ? <Text style={styles.empty}>Showing reference demo results below.</Text> : null}
      </Panel>
      <Panel title="Recent results">
        {(hasLive ? [] : DEMO_RESULTS).map((r) => (
          <View key={r.name} style={styles.row}>
            <View style={[styles.dot, r.flag === "high" ? styles.dotHigh : styles.dotNorm]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.when}>{r.range}</Text>
            </View>
            <Text style={[styles.val, r.flag === "high" && { color: colors.r }]}>{r.value}</Text>
            <Tag label={r.flag === "high" ? "High" : "Normal"} tone={r.flag === "high" ? "red" : "green"} />
          </View>
        ))}
        {hasLive
          ? DEMO_RESULTS.filter((d) => d.flag === "high").map((r) => (
              <View key={`demo-${r.name}`} style={styles.row}>
                <View style={[styles.dot, styles.dotHigh]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.when}>{r.range}</Text>
                </View>
                <Text style={[styles.val, { color: colors.r }]}>{r.value}</Text>
                <Tag label="High" tone="red" />
              </View>
            ))
          : null}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotNorm: { backgroundColor: colors.g },
  dotHigh: { backgroundColor: colors.r },
  name: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  when: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  val: { fontFamily: fonts.serif, fontSize: 16, color: colors.t1 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginBottom: 8 },
});
