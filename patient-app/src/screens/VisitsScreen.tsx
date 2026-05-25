import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { DEMO_VISITS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

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
      : DEMO_VISITS;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ScreenIntro text="All hospital and clinic visits on your UniHealth record." />
      <Panel title="All visits" subtitle="FHIR encounters + pilot demo rows">
        {rows.map((v) => (
          <View key={v.ref} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fac}>{v.fac}</Text>
              <Text style={styles.meta}>
                {v.when} · {v.type} · {v.dept}
              </Text>
              <Text style={styles.ref}>{v.ref}</Text>
            </View>
            <Tag label={v.type === "Inpatient" ? "IP" : "OP"} tone="blue" />
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: "row", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  fac: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 3 },
  ref: { fontFamily: fonts.mono, fontSize: 10, color: colors.t4, marginTop: 4 },
});
