import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function BrandSplash({ message = "Loading UHIC Console…" }: { message?: string }) {
  return (
    <LinearGradient colors={[colors.mesh2, colors.bg]} style={styles.root}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>UHIC</Text>
      </View>
      <Text style={styles.name}>UHIC</Text>
      <Text style={styles.tag}>National Health Insurance</Text>
      <ActivityIndicator color={colors.violet} style={{ marginTop: 28 }} />
      <Text style={styles.msg}>{message}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violetDark,
  },
  badgeText: { fontFamily: fonts.sansExtra, fontSize: 22, color: colors.w, letterSpacing: 1 },
  name: { fontFamily: fonts.serif, fontSize: 26, color: colors.violetDark, marginTop: 20 },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.t3,
    marginTop: 6,
    textTransform: "uppercase",
  },
  msg: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginTop: 12 },
});
