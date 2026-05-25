import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StaggerSection } from "./animated/StaggerSection";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";

type Action = { icon: string; label: string; onPress: () => void };

export function QuickActions({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.grid}>
      {actions.map((a, i) => (
        <StaggerSection key={a.label} index={i} variant="card" style={styles.cell}>
          <Pressable style={({ pressed }) => [styles.qa, pressed && styles.qaPressed]} onPress={a.onPress}>
            <LinearGradient colors={[colors.mesh1, colors.card]} style={styles.iconBg}>
              <Text style={styles.icon}>{a.icon}</Text>
            </LinearGradient>
            <Text style={styles.label}>{a.label}</Text>
            <View style={styles.dot} />
          </Pressable>
        </StaggerSection>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  cell: { width: "47%" },
  qa: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    ...shadows.sm,
  },
  qaPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  icon: { fontSize: 22 },
  label: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1, lineHeight: 17 },
  dot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.g,
  },
});
