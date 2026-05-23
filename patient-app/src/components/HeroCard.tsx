import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Props = {
  greeting: string;
  subtitle: string;
  aflId: string;
  stats: { value: string; label: string; accent?: boolean }[];
};

export function HeroCard({ greeting, subtitle, aflId, stats }: Props) {
  return (
    <LinearGradient colors={[colors.gd, "#1a6635", "#0a4a26"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.eyebrow}>Your health at a glance</Text>
      <Text style={styles.greet}>{greeting}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.pills}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            <Text style={styles.pillBold}>AFL-ID: </Text>
            {aflId}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            <Text style={styles.pillBold}>Cover: </Text>
            UniHealth Active ✓
          </Text>
        </View>
      </View>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statVal, s.accent && { color: colors.heroAccent }]}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 20, marginBottom: 16 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  greet: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: "#fff",
    lineHeight: 32,
  },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontFamily: fonts.sans, fontSize: 10.5, color: "rgba(255,255,255,0.85)" },
  pillBold: { fontWeight: "800" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  stat: {
    flex: 1,
    minWidth: "42%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 10,
  },
  statVal: { fontFamily: fonts.serif, fontSize: 20, color: "#fff" },
  statLbl: { fontFamily: fonts.sans, fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 },
});
