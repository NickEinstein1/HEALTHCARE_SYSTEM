import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Action = { icon: string; label: string; onPress: () => void };

export function QuickActions({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable key={a.label} style={({ pressed }) => [styles.qa, pressed && { opacity: 0.9 }]} onPress={a.onPress}>
          <Text style={styles.icon}>{a.icon}</Text>
          <Text style={styles.label}>{a.label}</Text>
          <View style={styles.dot} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  qa: {
    width: "47%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 14,
    minHeight: 88,
  },
  icon: { fontSize: 22, marginBottom: 8 },
  label: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  dot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.g,
  },
});
