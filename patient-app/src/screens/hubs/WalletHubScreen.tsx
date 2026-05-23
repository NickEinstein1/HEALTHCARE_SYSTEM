import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CoverCard } from "../../components/CoverCard";
import { PageHeader } from "../../components/PageHeader";
import { ServiceCard } from "../../components/ServiceCard";
import type { WalletStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<WalletStackParamList, "WalletHub">;

export function WalletHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Payments" title="Wallet & Cover" subtitle="Insurance, contributions, bills, and M-PESA — web portal parity." />
      <CoverCard onPress={() => nav.navigate("Coverage")} />
      <View style={styles.grid}>
        <ServiceCard icon="🛡️" label="My Cover" subtitle="Benefits & claims" onPress={() => nav.navigate("Coverage")} />
        <ServiceCard icon="💳" label="Contributions" subtitle="Ksh 500 due Mar" badge="Due" onPress={() => nav.navigate("Contributions")} />
        <ServiceCard icon="📄" label="Bills" subtitle="Invoices & statements" onPress={() => nav.navigate("Bills")} />
        <ServiceCard icon="📱" label="Pay" subtitle="M-PESA · M-TIBA" onPress={() => nav.navigate("Pay")} />
      </View>
      <Text style={styles.foot}>Member AFL-MBR-884321 · UniHealth Phase 1 Pilot</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 8 },
});
