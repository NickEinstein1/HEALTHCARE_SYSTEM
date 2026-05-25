import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StaggerSection } from "./animated/StaggerSection";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";

export function ServiceCard({
  icon,
  label,
  subtitle,
  badge,
  onPress,
  index = 0,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  index?: number;
}) {
  return (
    <StaggerSection index={index} variant="card" style={styles.wrap}>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
        <LinearGradient colors={[colors.mesh2, colors.card]} style={styles.iconRing}>
          <Text style={styles.icon}>{icon}</Text>
        </LinearGradient>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{badge}</Text>
          </View>
        ) : null}
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </StaggerSection>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "47%", marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 16,
    padding: 16,
    minHeight: 118,
    ...shadows.sm,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.98 }] },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  icon: { fontSize: 24 },
  label: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.t1 },
  sub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 5, lineHeight: 16 },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.al,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.amm,
  },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.am },
  chev: {
    position: "absolute",
    bottom: 14,
    right: 14,
    fontSize: 20,
    color: colors.g,
    fontFamily: fonts.sansBold,
  },
});
