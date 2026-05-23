import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { PayMethodRow } from "../components/PayMethodRow";
import { PrimaryButton } from "../components/ui/Buttons";
import { usePatient } from "../context/PatientContext";
import { MTIBA_BALANCE, TRANSACTIONS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PayScreen() {
  const { toast } = usePatient();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Payments" title="Make a Payment" subtitle="Bills, contributions, or M-TIBA wallet top-up." />
      <View style={styles.wallet}>
        <Text style={styles.walletLbl}>M-TIBA Health Wallet</Text>
        <Text style={styles.walletAmt}>Ksh {MTIBA_BALANCE.toLocaleString()}</Text>
        <Text style={styles.walletSub}>Linked to UniHealth Cover</Text>
        <PrimaryButton label="Top Up" onPress={() => toast("M-TIBA top-up via *253# or M-TIBA app")} style={{ marginTop: 12, alignSelf: "flex-start" }} />
      </View>
      <Panel title="Payment methods">
        <PayMethodRow
          icon="💚"
          logoBg="#00b300"
          name="M-PESA"
          desc="Paybill or STK push"
          onPress={() => toast("M-PESA STK push sent.")}
        />
        <PayMethodRow
          icon="🟠"
          logoBg="#e8490a"
          name="M-TIBA Wallet"
          desc={`Balance Ksh ${MTIBA_BALANCE.toLocaleString()}`}
          onPress={() => toast("Opening M-TIBA payment flow…")}
        />
      </Panel>
      <Panel title="Recent transactions">
        {TRANSACTIONS.map((t) => (
          <View key={t.date + t.type} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>{t.type}</Text>
              <Text style={styles.date}>{t.date}</Text>
            </View>
            <Text style={styles.amt}>{t.amount}</Text>
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  wallet: {
    backgroundColor: "#e8490a",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  walletLbl: { fontFamily: fonts.sansExtra, fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.5 },
  walletAmt: { fontFamily: fonts.serif, fontSize: 30, color: "#fff", marginTop: 4 },
  walletSub: { fontFamily: fonts.sans, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  row: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  type: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  amt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
});
