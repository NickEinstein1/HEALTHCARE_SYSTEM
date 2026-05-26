import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

export function ToggleRow({ label, subtitle, value, onValueChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.bdr, true: colors.gm }}
        thumbColor={value ? colors.g : colors.w}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
  },
  label: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  sub: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 3, lineHeight: 16 },
});
