import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  noPadding?: boolean;
};

export function Panel({ title, subtitle, right, actionLabel, onAction, children, noPadding }: Props) {
  const action =
    right ??
    (actionLabel && onAction ? (
      <Pressable onPress={onAction}>
        <Text style={styles.link}>{actionLabel}</Text>
      </Pressable>
    ) : null);

  return (
    <View style={styles.panel}>
      <View style={styles.hd}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <View style={noPadding ? undefined : styles.bd}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
  },
  hd: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bdr,
  },
  title: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  sub: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.t3, marginTop: 3 },
  link: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gd },
  bd: { padding: 14 },
});
