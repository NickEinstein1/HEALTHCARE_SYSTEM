import { StyleSheet, Text, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { StatCard } from "../components/ui/StatCard";
import { Tag } from "../components/ui/Tag";
import { useUhic } from "../context/UhicContext";
import { fmtKes } from "../lib/format";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function FraudScreen() {
  const { fraud, providers, loading, refresh } = useUhic();

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <View style={styles.kpiRow}>
        <StatCard icon="🚩" value={String(fraud?.flagged_count ?? "—")} label="Flagged Claims" accent={colors.r} />
        <StatCard icon="📈" value={fraud ? String(Math.round(fraud.avg_fraud_score)) : "—"} label="Avg Fraud Score" />
      </View>

      {fraud ? (
        <Panel title="Fraud bands" subtitle="0–100 score · human adjudication above threshold">
          {Object.entries(fraud.by_band).map(([band, count]) => (
            <View key={band} style={styles.row}>
              <Tag label={band} tone={band === "low" ? "green" : band === "medium" ? "amber" : "red"} />
              <Text style={styles.count}>{count}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      <Panel title="Provider Risk Scorecards" subtitle="Outlier detection · rejection rates">
        {providers.map((p) => (
          <View key={p.provider_id} style={styles.provider}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.provider_name}</Text>
              <Text style={styles.meta}>
                {p.provider_id} · Tier {p.facility_tier} · Avg {fmtKes(p.avg_claim_kes)}
              </Text>
              {p.outlier_flags.length > 0 ? (
                <Text style={styles.flags}>{p.outlier_flags.join(" · ")}</Text>
              ) : null}
            </View>
            <View style={styles.right}>
              <Tag label={`Score ${p.fraud_score}`} tone={p.fraud_score < 40 ? "green" : p.fraud_score < 70 ? "amber" : "red"} />
              <Text style={styles.rej}>{p.rejection_rate_pct.toFixed(1)}% rej</Text>
            </View>
          </View>
        ))}
      </Panel>

      <Panel title="Audit trail" subtitle="Hash-chained immutable log (Phase 1)">
        <Text style={styles.body}>
          Every claim decision appends to uhic_claim_audit with SHA-256 chain. Compliance auditors verify integrity
          without trusting application logs alone.
        </Text>
      </Panel>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  count: { fontFamily: fonts.mono, fontSize: 13, color: colors.t1 },
  provider: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
    gap: 8,
  },
  name: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t1 },
  meta: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  flags: { fontFamily: fonts.sans, fontSize: 10, color: colors.r, marginTop: 4 },
  right: { alignItems: "flex-end", gap: 4 },
  rej: { fontFamily: fonts.mono, fontSize: 9, color: colors.t3 },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 18 },
});
