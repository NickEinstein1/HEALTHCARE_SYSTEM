import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Notice } from "../components/ui/Notice";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { StatCard } from "../components/ui/StatCard";
import { Tag } from "../components/ui/Tag";
import { useUhic } from "../context/UhicContext";
import { fmtKes, fmtPct } from "../lib/format";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function DashboardScreen() {
  const { summary, claims, displayName, role, loading, error, refresh } = useUhic();
  const reserves = summary?.reserves;
  const flagged = claims.filter((c) => c.fraud_score >= 55).slice(0, 4);

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <Text style={styles.greet}>Welcome, {displayName}</Text>
      <Text style={styles.role}>{role.replace(/_/g, " ")} · UHIC</Text>

      {error ? (
        <Notice icon="⚠️" title="API unavailable">
          {error}. Start ehr-api on :8100 and pull to refresh.
        </Notice>
      ) : null}

      <Notice icon="🛡️" title="UHIC">
        National health insurance under Social Health Authority (SHIF) — universal membership, payroll 2.75%,
        informal means-testing, PHF contracts, and ECCIF catastrophic pool.
      </Notice>

      {loading && !summary ? (
        <ActivityIndicator color={colors.violet} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={styles.kpiRow}>
            <StatCard
              icon="👥"
              value={String(summary?.active_members ?? "—")}
              label="Active Members"
              meta={`${summary?.active_policies ?? 0} policies`}
            />
            <StatCard
              icon="📋"
              value={String(summary?.claims_submitted ?? "—")}
              label="Claims"
              meta={`${summary?.claims_flagged ?? 0} flagged`}
              accent={colors.am}
            />
          </View>
          <View style={styles.kpiRow}>
            <StatCard
              icon="📉"
              value={summary ? fmtPct(summary.loss_ratio) : "—"}
              label="Loss Ratio"
              meta="IRA solvency watch"
              accent={colors.r}
            />
            <StatCard
              icon="🔬"
              value={reserves ? fmtKes(reserves.ibnr_kes) : "—"}
              label="IBNR Reserve"
              meta="Chain-ladder"
              accent={colors.teal}
            />
          </View>

          <Panel title="Scheme Mix" subtitle="Member distribution by payer">
            {Object.entries(summary?.schemes ?? {}).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowLabel}>{k}</Text>
                <Text style={styles.mono}>{v}</Text>
              </View>
            ))}
          </Panel>

          <Panel title="Flagged Claims" subtitle="Fraud score ≥ 55 — human adjudication required">
            {flagged.length === 0 ? (
              <Text style={styles.empty}>No flagged claims in pilot data.</Text>
            ) : (
              flagged.map((c) => (
                <View key={c.claim_id} style={styles.claimRow}>
                  <View>
                    <Text style={styles.mono}>{c.claim_id}</Text>
                    <Text style={styles.caption}>{c.fraud_reasons.join(", ") || "—"}</Text>
                  </View>
                  <Tag label={String(c.fraud_score)} tone={c.fraud_band === "low" ? "green" : c.fraud_band === "medium" ? "amber" : "red"} />
                </View>
              ))
            )}
          </Panel>
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  greet: { fontFamily: fonts.serif, fontSize: 22, color: colors.t1, marginBottom: 4 },
  role: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 },
  kpiRow: { flexDirection: "row", gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.bdr },
  rowLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2 },
  mono: { fontFamily: fonts.mono, fontSize: 12, color: colors.t1 },
  claimRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.bdr },
  caption: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2, maxWidth: 220 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
});
