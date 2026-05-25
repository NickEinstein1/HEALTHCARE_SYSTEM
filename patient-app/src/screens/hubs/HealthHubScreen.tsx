import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../../components/animated/AnimatedScrollScreen";
import { SectionLead } from "../../components/ui/SectionLead";
import { ServiceCard } from "../../components/ServiceCard";
import { Notice } from "../../components/ui/Notice";
import type { HealthStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<HealthStackParamList, "HealthHub">;

const CARDS = [
  { icon: "📅", label: "Appointments", subtitle: "Book · view · cancel", badge: "2", screen: "Appointments" as const },
  { icon: "📋", label: "Visit History", subtitle: "All linked facilities", screen: "Visits" as const },
  { icon: "🧪", label: "Test Results", subtitle: "Labs & imaging", badge: "1 new", screen: "Results" as const },
  { icon: "💊", label: "Medications", subtitle: "Refills & dosing", screen: "Medications" as const },
  { icon: "💗", label: "Vitals & Trends", subtitle: "BP, weight, SpO₂", screen: "Vitals" as const },
  { icon: "💬", label: "Message Care Team", subtitle: "Secure clinician chat", screen: "Messages" as const },
];

export function HealthHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <AnimatedScrollScreen>
      <SectionLead
        accent
        text="Appointments, results, medications, vitals, and visit history — aligned with the UniHealth web patient portal."
      />
      <Notice
        icon="💡"
        title="Tip"
        body="Book appointments and message your care team from this hub. Results update in near real time from your health record."
        tone="blue"
      />
      <View style={styles.grid}>
        {CARDS.map((c, i) => (
          <ServiceCard
            key={c.screen}
            index={i}
            icon={c.icon}
            label={c.label}
            subtitle={c.subtitle}
            badge={c.badge}
            onPress={() => nav.navigate(c.screen)}
          />
        ))}
      </View>
      <Text style={styles.foot}>🔒 KDPA 2019 · FHIR R5 · Encrypted in transit (TLS 1.3)</Text>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.gd, textAlign: "center", marginTop: 4 },
});
