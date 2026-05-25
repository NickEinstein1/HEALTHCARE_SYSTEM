import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COVER } from "../lib/patientPortalData";
import { colors, gradients } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";

type Props = { onPress?: () => void };

export function CoverCard({ onPress }: Props) {
  const pct = Math.round((COVER.balance / COVER.limit) * 100);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.outer, pressed && { opacity: 0.96 }]}>
      <LinearGradient colors={["#f8fffb", colors.card]} style={[styles.card, shadows.md]}>
        <LinearGradient colors={[colors.g, colors.gd]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.accent} />
        <View style={styles.top}>
          <LinearGradient colors={[...gradients.brand]} style={styles.emblemRing}>
            <Text style={styles.emblem}>🛡️</Text>
          </LinearGradient>
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
          <LinearGradient colors={[colors.g, colors.mint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.foot}>Renewal {COVER.renewal} · {COVER.renewalDays} days left</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { marginBottom: 16, borderRadius: 18, overflow: "hidden" },
  card: { borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.gm, overflow: "hidden" },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  top: { flexDirection: "row", gap: 14, alignItems: "flex-start", paddingLeft: 6 },
  emblemRing: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emblem: { fontSize: 26 },
  lbl: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3, textTransform: "uppercase", letterSpacing: 0.6 },
  amt: { fontFamily: fonts.serif, fontSize: 28, color: colors.gd, marginTop: 3 },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 4, lineHeight: 17 },
  badge: {
    backgroundColor: colors.gl,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.gd },
  track: { height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: 16, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  foot: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 10 },
});
