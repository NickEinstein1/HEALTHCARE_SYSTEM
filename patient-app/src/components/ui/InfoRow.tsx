import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  highlight?: boolean;
};

/** Structured list row for clinical / account information. */
export function InfoRow({ icon, title, subtitle, value, right, highlight }: Props) {
  return (
    <View style={[styles.row, highlight && styles.rowHi]}>
      {icon ? (
        <View style={styles.icoWrap}>
          <Text style={styles.ico}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.val}>{value}</Text> : null}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
  },
  rowHi: { backgroundColor: colors.mesh1 },
  icoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.gl,
    borderWidth: 1,
    borderColor: colors.gm,
    alignItems: "center",
    justifyContent: "center",
  },
  ico: { fontSize: 18 },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.t1, lineHeight: 18 },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginTop: 3, lineHeight: 17 },
  val: { fontFamily: fonts.serif, fontSize: 17, color: colors.gd },
});
