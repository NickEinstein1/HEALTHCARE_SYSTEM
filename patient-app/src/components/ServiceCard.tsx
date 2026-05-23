import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ServiceCard({
  icon,
  label,
  subtitle,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.sub} numberOfLines={2}>{subtitle}</Text> : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 14,
    padding: 14,
    minHeight: 108,
    marginBottom: 10,
  },
  icon: { fontSize: 26, marginBottom: 8 },
  label: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  sub: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.t3, marginTop: 4, lineHeight: 15 },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.al,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.am },
  chev: { position: "absolute", bottom: 12, right: 12, fontSize: 18, color: colors.t4 },
});
