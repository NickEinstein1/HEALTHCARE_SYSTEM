import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

export function Notice({ icon, title, children }: { icon: string; title?: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.violetLight,
    borderWidth: 1,
    borderColor: colors.violetMid,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  icon: { fontSize: 20 },
  title: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.violetDark, marginBottom: 4 },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 18 },
});
