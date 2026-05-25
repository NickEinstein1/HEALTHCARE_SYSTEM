import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../../components/animated/AnimatedScrollScreen";
import { CoverCard } from "../../components/CoverCard";
import { SectionLead } from "../../components/ui/SectionLead";
import { ServiceCard } from "../../components/ServiceCard";
import type { WalletStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<WalletStackParamList, "WalletHub">;

export function WalletHubScreen() {
  const nav = useNavigation<Nav>();

  return (
    <AnimatedScrollScreen>
      <SectionLead accent text="Insurance, contributions, bills, and M-PESA — same as the web patient portal." />
      <CoverCard onPress={() => nav.navigate("Coverage")} />
      <View style={styles.grid}>
        <ServiceCard index={0} icon="🛡️" label="My Cover" subtitle="Benefits & claims" onPress={() => nav.navigate("Coverage")} />
        <ServiceCard index={1} icon="💳" label="Contributions" subtitle="Ksh 500 due Mar" badge="Due" onPress={() => nav.navigate("Contributions")} />
        <ServiceCard index={2} icon="📄" label="Bills" subtitle="Invoices & statements" onPress={() => nav.navigate("Bills")} />
        <ServiceCard index={3} icon="📱" label="Pay" subtitle="M-PESA · M-TIBA" onPress={() => nav.navigate("Pay")} />
      </View>
      <Text style={styles.foot}>Member AFL-MBR-884321 · UniHealth Phase 1 Pilot</Text>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foot: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 4 },
});
