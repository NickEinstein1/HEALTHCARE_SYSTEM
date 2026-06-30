import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { useBillingSummary } from "../hooks/useBillingSummary";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function BillsScreen() {
  const { patientId, toast } = usePatient();
  const { billing, loading, payBusy, payWithMpesa } = useBillingSummary(patientId);
  const outstanding = billing?.outstanding_total_kes ?? 0;

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Charges, cover settlements, and downloadable invoices." />
      <Notice
        icon={outstanding > 0 ? "⚠️" : "✅"}
        title={outstanding > 0 ? "Payment due" : "All clear"}
        body={
          outstanding > 0
            ? `Outstanding Ksh ${Math.round(outstanding).toLocaleString()}. Pay via M-PESA from the Pay screen.`
            : "No outstanding bills. UniHealth cover settled recent charges."
        }
        tone={outstanding > 0 ? "amber" : "green"}
      />
      <Panel title="Billing history" subtitle="Covered and out-of-pocket" noPadding>
        {(billing?.bills ?? []).map((b) => (
          <View key={(b.invoice_id ?? b.date) + b.desc} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{b.desc}</Text>
              <Text style={styles.date}>{b.date}</Text>
            </View>
            <Text style={styles.amt}>{b.amount}</Text>
            <Tag label={b.status} tone={b.status === "Outstanding" ? "amber" : "green"} />
            {b.status === "Outstanding" && b.invoice_id ? (
              <PrimaryButton
                label="Pay"
                onPress={async () => {
                  const res = await payWithMpesa("invoice", b.balance_kes ?? b.amount_kes, b.invoice_id);
                  toast(res?.message ?? "Payment failed.");
                }}
                disabled={payBusy}
                style={{ marginLeft: 6 }}
              />
            ) : null}
            <SecondaryButton
              label="Invoice"
              onPress={() => toast(`Invoice: ${b.desc} (${b.date})`)}
              style={{ marginLeft: 6 }}
            />
          </View>
        ))}
        {loading && <Text style={[styles.date, { padding: 14 }]}>Loading billing history…</Text>}
      </Panel>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr, gap: 6 },
  desc: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  amt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
});
