import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { HEALTH_RECORDS } from "../lib/patientPortalData";
import { displayAflId } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function RecordsScreen() {
  const { patientId, toast } = usePatient();

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: { icon: string; name: string; meta: string; tag: string }[];
  }) => (
    <Panel title={title}>
      {items.map((item) => (
        <View key={item.name} style={styles.item}>
          <Text style={styles.ico}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.meta}</Text>
          </View>
          <Tag label={item.tag} tone={item.tag === "Active" ? "red" : item.tag === "Current" ? "green" : "amber"} />
        </View>
      ))}
    </Panel>
  );

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text={`Longitudinal record · ${displayAflId(patientId)} · FHIR R5 · KDPA 2019`} />
      <PrimaryButton label="Export Records" onPress={() => toast("Exporting FHIR bundle (PDF/CSV)…")} style={{ marginBottom: 14 }} />
      <Section title="Diagnoses & conditions" items={HEALTH_RECORDS.diagnoses} />
      <Section title="Allergies & alerts" items={HEALTH_RECORDS.allergies} />
      <Section title="Immunisations" items={HEALTH_RECORDS.immunisations} />
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  ico: { fontSize: 20 },
  name: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
});
