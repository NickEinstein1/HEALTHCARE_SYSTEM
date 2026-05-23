import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../../components/PageHeader";
import { ServiceCard } from "../../components/ServiceCard";
import { Notice } from "../../components/ui/Notice";
import type { HealthStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<HealthStackParamList, "HealthHub">;

export function HealthHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        eyebrow="My Health"
        title="Health"
        subtitle="Appointments, results, medications, vitals, and visit history — like MyChart clinical sections."
      />
      <Notice
        icon="💡"
        title="Tip"
        body="Book appointments and message your care team from this hub. Results update in near real time from UniHealth FHIR."
        tone="blue"
      />
      <View style={styles.grid}>
        <ServiceCard icon="📅" label="Appointments" subtitle="Book · view · cancel" badge="2" onPress={() => nav.navigate("Appointments")} />
        <ServiceCard icon="📋" label="Visit History" subtitle="All linked facilities" onPress={() => nav.navigate("Visits")} />
        <ServiceCard icon="🧪" label="Test Results" subtitle="Labs & imaging" badge="1 new" onPress={() => nav.navigate("Results")} />
        <ServiceCard icon="💊" label="Medications" subtitle="Refills & dosing" onPress={() => nav.navigate("Medications")} />
        <ServiceCard icon="💗" label="Vitals & Trends" subtitle="BP, weight, SpO₂" onPress={() => nav.navigate("Vitals")} />
        <ServiceCard icon="💬" label="Message Care Team" subtitle="Secure clinician chat" onPress={() => nav.navigate("Messages")} />
      </View>
      <Text style={styles.foot}>🔒 KDPA 2019 · FHIR R5 · Encrypted in transit (TLS 1.3)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.gd, textAlign: "center", marginTop: 8 },
});
