import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { CoverCard } from "../components/CoverCard";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { useInsuranceSync } from "../hooks/useInsuranceSync";
import { MEMBER_ID } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

function claimTone(status: string): "green" | "amber" | "red" | "grey" {
  if (status === "adjudicated" || status === "paid") return "green";
  if (status === "flagged" || status === "submitted") return "amber";
  if (status === "denied") return "red";
  return "grey";
}

export function CoverageScreen() {
  const { toast, patientId } = usePatient();
  const sync = useInsuranceSync(patientId);
  const stats = sync.coverageStats;

  return (
    <AnimatedScrollScreen refreshing={sync.syncing} onRefresh={() => void sync.refresh()}>
      <ScreenIntro text={`SHIF national cover · synced v${sync.syncVersion}`} />
      {sync.error ? (
        <Text style={styles.err}>{sync.error}</Text>
      ) : null}
      <View style={styles.actions}>
        <SecondaryButton label="🔗 Link Account" onPress={() => toast("Opening SHA member linking…")} />
        <PrimaryButton
          label="+ File a Claim"
          onPress={() => toast("Claim lodged — UHIC adjudicators notified. Track status below.")}
        />
      </View>
      <CoverCard />
      {stats ? (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>Ksh {Math.round(stats.balance_kes).toLocaleString()}</Text>
            <Text style={styles.statLbl}>Balance left</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: colors.b }]}>Ksh {Math.round(stats.used_ytd_kes).toLocaleString()}</Text>
            <Text style={styles.statLbl}>Used YTD</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: colors.am }]}>{stats.renewal_date}</Text>
            <Text style={styles.statLbl}>Renewal</Text>
          </View>
        </View>
      ) : sync.syncing ? (
        <ActivityIndicator color={colors.g} style={{ marginVertical: 16 }} />
      ) : null}
      <Panel title="Recent claims" subtitle={`Live from UHIC · ${MEMBER_ID}`} noPadding>
        {sync.claims.length === 0 ? (
          <Text style={styles.empty}>No claims yet for patient {patientId}.</Text>
        ) : (
          sync.claims.map((c) => (
            <View key={c.claim_id} style={styles.claim}>
              <View style={{ flex: 1 }}>
                <Text style={styles.claimNo}>{c.claim_id}</Text>
                <Text style={styles.claimFac}>{c.encounter_id} · {c.scheme_type}</Text>
              </View>
              <Text style={styles.claimAmt}>Ksh {Math.round(c.submitted_amount_kes).toLocaleString()}</Text>
              <Tag label={c.status} tone={claimTone(c.status)} />
            </View>
          ))
        )}
      </Panel>
      <Text style={styles.foot}>
        Payments sync via billing · Claims sync every 8s with UHIC app & UniHealth web
      </Text>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statVal: { fontFamily: fonts.serif, fontSize: 16, color: colors.gd },
  statLbl: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, marginTop: 4 },
  claim: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  claimNo: { fontFamily: fonts.mono, fontSize: 11, color: colors.t2 },
  claimFac: { fontFamily: fonts.sans, fontSize: 12, color: colors.t1, marginTop: 2 },
  claimAmt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, padding: 14 },
  err: { fontFamily: fonts.sans, fontSize: 12, color: colors.r, marginBottom: 8 },
  foot: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, textAlign: "center", marginTop: 8 },
});
