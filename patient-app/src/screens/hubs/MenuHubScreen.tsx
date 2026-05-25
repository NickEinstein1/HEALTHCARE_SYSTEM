import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../../components/animated/AnimatedScrollScreen";
import { SectionLead } from "../../components/ui/SectionLead";
import { ServiceCard } from "../../components/ServiceCard";
import type { MenuStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "MenuHub">;

export function MenuHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <AnimatedScrollScreen>
      <SectionLead accent text="Records, documents, privacy, and profile." />
      <View style={styles.grid}>
        <ServiceCard index={0} icon="👤" label="My Profile" subtitle="Identity & session" onPress={() => nav.navigate("Profile")} />
        <ServiceCard index={1} icon="📂" label="Health Records" subtitle="Diagnoses & allergies" onPress={() => nav.navigate("Records")} />
        <ServiceCard index={2} icon="📋" label="Documents" subtitle="PDFs & reports" onPress={() => nav.navigate("Documents")} />
        <ServiceCard index={3} icon="🔐" label="Privacy & Consent" subtitle="KDPA controls" onPress={() => nav.navigate("Consent")} />
      </View>
      <Text style={styles.foot}>Export · erasure · portability rights under KDPA 2019</Text>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 12 },
});
