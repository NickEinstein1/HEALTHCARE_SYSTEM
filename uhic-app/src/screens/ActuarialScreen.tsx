import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { StatCard } from "../components/ui/StatCard";
import { useUhic } from "../context/UhicContext";
import { api } from "../lib/api";
import { fmtKes, fmtPct } from "../lib/format";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ActuarialScreen() {
  const nav = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { summary, forecast, loading, refresh } = useUhic();
  const [reserves, setReserves] = useState(summary?.reserves ?? null);
  const [reservesBusy, setReservesBusy] = useState(false);

  useEffect(() => {
    if (summary?.reserves) setReserves(summary.reserves);
  }, [summary]);

  const loadReserves = async () => {
    setReservesBusy(true);
    try {
      const r = await api.uhicActuarialReserves();
      setReserves(r);
    } finally {
      setReservesBusy(false);
    }
  };

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <Panel
        title="Premiums & SHIF"
        subtitle="Contribution calculator & private risk rating"
        actionLabel="Open"
        onAction={() => nav.navigate("Premiums")}
      >
        <Text style={styles.body}>
          Run SHIF contribution quotes (2.75% with floor/cap) or private premium with age, occupation, and claims
          history loadings.
        </Text>
      </Panel>

      <Panel title="Technical Reserves" subtitle="IBNR · case reserves · loss ratio" actionLabel="Refresh" onAction={() => void loadReserves()}>
        {reservesBusy ? <ActivityIndicator color={colors.violet} /> : null}
        {reserves ? (
          <>
            <View style={styles.kpiRow}>
              <StatCard icon="💰" value={fmtKes(reserves.earned_premium_kes)} label="Earned Premium" />
              <StatCard icon="📊" value={fmtKes(reserves.reported_claims_kes)} label="Reported Claims" />
            </View>
            <View style={styles.kpiRow}>
              <StatCard icon="🔬" value={fmtKes(reserves.ibnr_kes)} label="IBNR" accent={colors.teal} />
              <StatCard icon="📉" value={fmtPct(reserves.loss_ratio)} label="Loss Ratio" accent={colors.r} />
            </View>
            <Row label="Case reserves" value={fmtKes(reserves.case_reserves_kes)} />
            <Row label="Total incurred" value={fmtKes(reserves.total_incurred_kes)} />
            <Row label="Combined ratio" value={fmtPct(reserves.combined_ratio)} />
          </>
        ) : (
          <Text style={styles.empty}>Pull reserves from actuarial engine…</Text>
        )}
      </Panel>

      <Panel title="IBNR Methodology" subtitle="Chain-ladder on development triangles">
        <Text style={styles.body}>
          Incurred-but-not-reported reserves estimated via age-to-age development factors on historical claim triangles.
          Supports IRA quarterly solvency reporting and ECCIF catastrophic fund adequacy.
        </Text>
      </Panel>

      <Panel title="ECCIF 12-Month Forecast" subtitle="Catastrophic pool balance projection">
        {forecast.length === 0 ? (
          <Text style={styles.empty}>No forecast data.</Text>
        ) : (
          forecast.slice(0, 6).map((p) => (
            <View key={p.month} style={styles.row}>
              <Text style={styles.month}>Month {p.month}</Text>
              <Text style={styles.mono}>{fmtKes(p.projected_balance_kes)}</Text>
              <Text style={[styles.flow, p.net_flow_kes < 0 ? { color: colors.r } : { color: colors.g }]}>
                {p.net_flow_kes >= 0 ? "+" : ""}
                {fmtKes(p.net_flow_kes)}
              </Text>
            </View>
          ))
        )}
      </Panel>
    </ScreenScroll>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.mono}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
  },
  label: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2 },
  month: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.t1, flex: 1 },
  mono: { fontFamily: fonts.mono, fontSize: 11, color: colors.t1 },
  flow: { fontFamily: fonts.mono, fontSize: 10, width: 90, textAlign: "right" },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 18 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
});
