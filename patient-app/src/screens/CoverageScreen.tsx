import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CoverCard } from "../components/CoverCard";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { ProgressBar } from "../components/ui/ProgressBar";
import { StatCard } from "../components/ui/StatCard";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { BENEFIT_LIMITS, CLAIMS, COVER, MEMBER_ID } from "../lib/patientPortalData";
import { colors } from "../theme/colors";

export function CoverageScreen() {
  const { toast, patientId } = usePatient();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ScreenIntro text={`Benefits & claims · ${MEMBER_ID}`} />
      <View style={styles.actions}>
        <SecondaryButton label="🔗 Link Account" onPress={() => toast("Opening insurer linking portal…")} />
        <PrimaryButton label="+ File a Claim" onPress={() => toast("Claim form started — coordinator reviews within 5 days.")} />
      </View>
      <CoverCard />
      <View style={styles.stats}>
        <StatCard icon="🛡️" value={`Ksh ${COVER.balance.toLocaleString()}`} label="Balance left" accent={colors.gd} />
        <StatCard icon="💳" value={`Ksh ${COVER.used.toLocaleString()}`} label="Used YTD" accent={colors.b} />
        <StatCard icon="📅" value={COVER.renewal} label="Renewal" accent={colors.am} />
      </View>
      <Panel title="Benefit limits" subtitle="FY 2025/26">
        {BENEFIT_LIMITS.map((b) => (
          <ProgressBar key={b.label} label={b.label} text={b.text} pct={b.pct} color={b.color} />
        ))}
      </Panel>
      <Panel title="Recent claims" noPadding>
        {CLAIMS.map((c) => (
          <View key={c.no} style={styles.claim}>
            <View style={{ flex: 1 }}>
              <Text style={styles.claimNo}>{c.no}</Text>
              <Text style={styles.claimFac}>{c.facility}</Text>
            </View>
            <Text style={styles.claimAmt}>{c.amount}</Text>
            <Tag label={c.status} tone="green" />
          </View>
        ))}
      </Panel>
      <Text style={styles.foot}>Patient {patientId} · UniHealth verified</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  claim: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  claimNo: { fontFamily: "JetBrainsMono_500Medium", fontSize: 11, color: colors.t2 },
  claimFac: { fontFamily: "Sora_400Regular", fontSize: 12, color: colors.t1, marginTop: 2 },
  claimAmt: { fontFamily: "Sora_800ExtraBold", fontSize: 12, color: colors.t1 },
  foot: { fontFamily: "Sora_400Regular", fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 8 },
});
