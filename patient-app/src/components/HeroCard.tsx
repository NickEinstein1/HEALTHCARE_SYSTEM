import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { StaggerSection } from "./animated/StaggerSection";
import { UniHealthLogo } from "./brand/UniHealthLogo";
import { colors, gradients } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";

type Props = {
  greeting: string;
  subtitle: string;
  aflId: string;
  stats: { value: string; label: string; accent?: boolean }[];
};

export function HeroCard({ greeting, subtitle, aflId, stats }: Props) {
  return (
    <StaggerSection variant="hero" style={[styles.outer, shadows.hero]}>
      <LinearGradient colors={[...gradients.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.decoOrb} />
        <View style={styles.logoMark}>
          <UniHealthLogo size={44} idPrefix="hero" />
        </View>
        <Text style={styles.eyebrow}>Your health at a glance</Text>
        <Text style={styles.greet}>{greeting}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              <Text style={styles.pillBold}>AFL-ID </Text>
              {aflId}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              <Text style={styles.pillBold}>Cover </Text>
              Active ✓
            </Text>
          </View>
        </View>
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <StaggerSection key={s.label} index={i + 2} variant="card" style={styles.stat}>
              <Text style={[styles.statVal, s.accent && { color: colors.heroAccent }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </StaggerSection>
          ))}
        </View>
      </LinearGradient>
    </StaggerSection>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: 20, marginBottom: 18, overflow: "hidden" },
  hero: { padding: 22, paddingTop: 20, minHeight: 200 },
  decoOrb: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0,229,160,0.12)",
  },
  logoMark: {
    position: "absolute",
    top: 16,
    right: 16,
    opacity: 0.9,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  greet: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: "#fff",
    lineHeight: 34,
    maxWidth: "78%",
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    marginTop: 8,
    lineHeight: 21,
    maxWidth: "90%",
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  pill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: { fontFamily: fonts.sans, fontSize: 11, color: "rgba(255,255,255,0.9)" },
  pillBold: { fontFamily: fonts.sansExtra, color: "#fff" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
  stat: {
    flex: 1,
    minWidth: "42%",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statVal: { fontFamily: fonts.serif, fontSize: 22, color: "#fff" },
  statLbl: { fontFamily: fonts.sans, fontSize: 10.5, color: "rgba(255,255,255,0.55)", marginTop: 5 },
});
