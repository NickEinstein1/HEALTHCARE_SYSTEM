import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../../components/PageHeader";
import { ServiceCard } from "../../components/ServiceCard";
import type { MenuStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "MenuHub">;

export function MenuHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Account" title="Menu" subtitle="Records, documents, privacy, and profile." />
      <View style={styles.grid}>
        <ServiceCard icon="👤" label="My Profile" subtitle="Identity & session" onPress={() => nav.navigate("Profile")} />
        <ServiceCard icon="📂" label="Health Records" subtitle="Diagnoses & allergies" onPress={() => nav.navigate("Records")} />
        <ServiceCard icon="📋" label="Documents" subtitle="PDFs & reports" onPress={() => nav.navigate("Documents")} />
        <ServiceCard icon="🔐" label="Privacy & Consent" subtitle="KDPA controls" onPress={() => nav.navigate("Consent")} />
      </View>
      <Text style={styles.foot}>Export · erasure · portability rights under KDPA 2019</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 12 },
});
