import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

export function StatCard({
  icon,
  value,
  label,
  meta,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  meta?: string;
  accent?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  icon: { fontSize: 22, marginBottom: 6 },
  value: { fontFamily: fonts.serif, fontSize: 18, color: colors.violetDark },
  label: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, marginTop: 4, textAlign: "center" },
  meta: { fontFamily: fonts.mono, fontSize: 9, color: colors.t4, marginTop: 4 },
});
