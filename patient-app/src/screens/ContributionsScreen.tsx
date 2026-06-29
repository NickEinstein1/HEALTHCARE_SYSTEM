import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PayMethodRow } from "../components/PayMethodRow";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { StatCard } from "../components/ui/StatCard";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { useBillingSummary } from "../hooks/useBillingSummary";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ContributionsScreen() {
  const { patientId, toast } = usePatient();
  const { billing, loading, payBusy, payWithMpesa } = useBillingSummary(patientId);
  const contrib = billing?.contribution_amount_kes ?? 500;

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Monthly UniHealth health cover payment history." />
      <View style={styles.actions}>
        <SecondaryButton label="📥 Statement" onPress={() => toast("Downloading contribution statement…")} />
        <PrimaryButton
          label={`+ Pay Ksh ${contrib.toLocaleString()}`}
          onPress={async () => {
            const res = await payWithMpesa("contribution", contrib);
            toast(res?.message ?? "M-PESA payment request failed.");
          }}
          disabled={payBusy}
        />
      </View>
      <View style={styles.stats}>
        <StatCard icon="📊" value={`Ksh ${Math.round(billing?.total_contributions_kes ?? 0).toLocaleString()}`} label="Total contributions" />
        <StatCard
          icon="✅"
          value={billing?.membership_status === "up_to_date" ? "Up to date" : "Payment due"}
          label={`Next Ksh ${Math.round(billing?.next_payment_kes ?? contrib).toLocaleString()}`}
          accent={colors.gd}
        />
        <StatCard icon="📅" value={billing?.paybill ?? "400100"} label="M-PESA Paybill" />
      </View>
      <Panel title="Contribution history" subtitle="M-PESA · Payroll · Bank">
        {(billing?.contributions ?? []).map((c) => (
          <View key={c.date + c.method} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{c.date}</Text>
              <Text style={styles.method}>{c.method}</Text>
            </View>
            <Text style={styles.amt}>{c.amount}</Text>
            <Tag label={c.status} tone="green" />
          </View>
        ))}
        {loading && <Text style={styles.date}>Loading…</Text>}
      </Panel>
      <Panel title="Pay contribution" subtitle={`Ksh ${contrib.toLocaleString()} · Paybill ${billing?.paybill ?? "400100"}`}>
        <PayMethodRow
          icon="💚"
          logoBg="#00b300"
          name="M-PESA Paybill"
          desc={`${billing?.paybill ?? "400100"} · Account ${billing?.account_ref ?? "UniHealth Health"}`}
          onPress={async () => {
            const res = await payWithMpesa("contribution", contrib);
            toast(res?.message ?? "M-PESA STK push failed.");
          }}
          disabled={payBusy}
        />
        <PayMethodRow
          icon="🏦"
          logoBg={colors.bl}
          name="Bank Transfer (PESALINK)"
          desc="Equity, KCB, NCBA, Co-op"
          onPress={() => toast("PESALINK ref: AFL-MBR-884321")}
        />
      </Panel>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  date: { fontFamily: fonts.mono, fontSize: 11, color: colors.t2 },
  method: { fontFamily: fonts.sans, fontSize: 12, color: colors.t1, marginTop: 2 },
  amt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
});
