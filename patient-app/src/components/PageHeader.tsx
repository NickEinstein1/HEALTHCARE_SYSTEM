import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    color: colors.t2,
    marginBottom: 4,
    fontWeight: "800",
  },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.t1, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t1, marginTop: 6, lineHeight: 20 },
});
