import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

export function ProgressBar({ label, text, pct, color }: { label: string; text: string; pct: number; color: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.text, { color }]}>{text}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontFamily: fonts.sansExtra, fontSize: 11.5, color: colors.t1 },
  text: { fontFamily: fonts.sansBold, fontSize: 11 },
  track: { height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});
