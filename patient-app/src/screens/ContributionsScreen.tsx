import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PayMethodRow } from "../components/PayMethodRow";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { StatCard } from "../components/ui/StatCard";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { CONTRIBUTIONS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ContributionsScreen() {
  const { toast } = usePatient();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ScreenIntro text="Monthly UniHealth health cover payment history." />
      <View style={styles.actions}>
        <SecondaryButton label="📥 Statement" onPress={() => toast("Downloading contribution statement…")} />
        <PrimaryButton label="+ Pay Ksh 500" onPress={() => toast("M-PESA STK push: Paybill 400100 · UniHealth Health")} />
      </View>
      <View style={styles.stats}>
        <StatCard icon="📊" value="Ksh 5,500" label="Total FY 25/26" />
        <StatCard icon="✅" value="Up to date" label="Next 31 Mar" accent={colors.gd} />
        <StatCard icon="📅" value="3 years" label="Member since 2023" />
      </View>
      <Panel title="Contribution history" subtitle="M-PESA · Payroll · Bank">
        {CONTRIBUTIONS.map((c) => (
          <View key={c.date} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{c.date}</Text>
              <Text style={styles.method}>{c.method}</Text>
            </View>
            <Text style={styles.amt}>{c.amount}</Text>
            <Tag label={c.status} tone="green" />
          </View>
        ))}
      </Panel>
      <Panel title="Pay contribution" subtitle="Ksh 500 due by 31 March 2026">
        <PayMethodRow
          icon="💚"
          logoBg="#00b300"
          name="M-PESA Paybill"
          desc="400100 · Account UniHealth Health"
          onPress={() => toast("M-PESA STK push sent to registered phone.")}
        />
        <PayMethodRow
          icon="🏦"
          logoBg={colors.bl}
          name="Bank Transfer (PESALINK)"
          desc="Equity, KCB, NCBA, Co-op"
          onPress={() => toast("PESALINK ref: AFL-MBR-884321")}
        />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  date: { fontFamily: fonts.mono, fontSize: 11, color: colors.t2 },
  method: { fontFamily: fonts.sans, fontSize: 12, color: colors.t1, marginTop: 2 },
  amt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
});
