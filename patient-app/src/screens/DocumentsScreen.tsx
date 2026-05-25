import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { DOCUMENTS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function DocumentsScreen() {
  const { toast } = usePatient();

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Discharge summaries, consult notes, and lab PDFs." />
      <Panel title="Your documents" noPadding>
        {DOCUMENTS.map((d) => (
          <View key={d.name} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{d.name}</Text>
              <Text style={styles.meta}>
                {d.date} · {d.type} · {d.size}
              </Text>
            </View>
            <Tag label="PDF" tone="blue" />
            <SecondaryButton label="Open" onPress={() => toast(`Opening ${d.name}…`)} style={{ marginLeft: 8 }} />
          </View>
        ))}
      </Panel>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  name: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
});
