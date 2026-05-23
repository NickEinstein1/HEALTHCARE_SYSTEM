import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Tone = "green" | "amber" | "blue" | "red";

const TONE: Record<Tone, { bg: string; border: string }> = {
  green: { bg: colors.gl, border: colors.gm },
  amber: { bg: colors.al, border: colors.am },
  blue: { bg: "#e8f4fd", border: "#b8daf5" },
  red: { bg: colors.rl, border: colors.rm },
};

export function Notice({ icon, title, body, tone = "amber" }: { icon: string; title: string; body: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  icon: { fontSize: 18 },
  title: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  body: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.t2, marginTop: 3, lineHeight: 17 },
});
