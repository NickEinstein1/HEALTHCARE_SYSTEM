import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

export function StatCard({ icon, value, label, accent }: { icon: string; value: string; label: string; accent?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  icon: { fontSize: 24, marginBottom: 6 },
  value: { fontFamily: fonts.serif, fontSize: 20, color: colors.gd },
  label: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3, marginTop: 4, textAlign: "center" },
});
