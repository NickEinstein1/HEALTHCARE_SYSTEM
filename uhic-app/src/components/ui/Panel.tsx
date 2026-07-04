import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { shadows } from "../../theme/shadows";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

export function Panel({ title, subtitle, actionLabel, onAction, children }: Props) {
  return (
    <View style={[styles.panel, shadows.md]}>
      <LinearGradient colors={gradients.brand} style={styles.accent} />
      <View style={styles.hd}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction}>
            <Text style={styles.link}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.bd}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  hd: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingLeft: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
    backgroundColor: colors.mesh2,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 14, color: colors.t1 },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginTop: 4 },
  link: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.violetDark },
  bd: { padding: 16, paddingLeft: 18 },
});
