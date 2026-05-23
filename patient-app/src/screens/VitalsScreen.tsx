import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { usePatient } from "../context/PatientContext";
import { buildVitalRows } from "../lib/vitals";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function VitalsScreen() {
  const { observations } = usePatient();
  const rows = buildVitalRows(observations);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        eyebrow="Monitoring"
        title="Vitals & Trends"
        subtitle="Blood pressure, heart rate, SpO₂, weight — web adds 3D body view."
      />
      <Notice
        icon="📈"
        title="Trends"
        body="Longitudinal charts are on the web dashboard. Mobile shows your latest readings from FHIR Observation."
        tone="blue"
      />
      <Panel title="Vital signs catalog">
        <View style={styles.grid}>
          {rows.map((r) => (
            <View key={r.key} style={styles.vital}>
              <Text style={styles.icon}>{r.icon}</Text>
              <Text style={styles.v}>{r.value ?? "—"}</Text>
              <Text style={styles.unit}>{r.unit}</Text>
              <Text style={styles.l}>{r.label}</Text>
              <Text style={styles.range}>Ref: {r.range}</Text>
              {r.measuredAt ? <Text style={styles.t}>{r.measuredAt}</Text> : null}
            </View>
          ))}
        </View>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vital: {
    width: "47%",
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  icon: { fontSize: 22, marginBottom: 4 },
  v: { fontFamily: fonts.serif, fontSize: 22, color: colors.t1 },
  unit: { fontFamily: fonts.mono, fontSize: 9, color: colors.t3 },
  l: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3, marginTop: 6, textAlign: "center" },
  range: { fontFamily: fonts.sans, fontSize: 9, color: colors.t4, marginTop: 4 },
  t: { fontFamily: fonts.mono, fontSize: 8, color: colors.t4, marginTop: 4 },
});
