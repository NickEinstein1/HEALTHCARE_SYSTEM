import { Pressable, StyleSheet, Text, View } from "react-native";
import { COVER } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Props = { onPress?: () => void };

export function CoverCard({ onPress }: Props) {
  const pct = Math.round((COVER.balance / COVER.limit) * 100);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <View style={styles.top}>
        <Text style={styles.emblem}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.lbl}>UniHealth Annual Cover</Text>
          <Text style={styles.amt}>Ksh {COVER.balance.toLocaleString()}</Text>
          <Text style={styles.sub}>of Ksh {COVER.limit.toLocaleString()} remaining · FY 2025/26</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>Active ✓</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.foot}>Renewal {COVER.renewal} · {COVER.renewalDays} days left</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.gm,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  emblem: { fontSize: 28 },
  lbl: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3, textTransform: "uppercase", letterSpacing: 0.5 },
  amt: { fontFamily: fonts.serif, fontSize: 26, color: colors.gd, marginTop: 2 },
  sub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  badge: { backgroundColor: colors.gl, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.gm },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.gd },
  track: { height: 6, backgroundColor: colors.bg, borderRadius: 3, marginTop: 14, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.g, borderRadius: 3 },
  foot: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 8 },
});
