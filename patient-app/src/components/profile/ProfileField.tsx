import { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
};

export function ProfileField({ label, hint, error, right, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.lblRow}>
        <Text style={styles.lbl}>{label}</Text>
        {right}
      </View>
      <TextInput
        placeholderTextColor={colors.t4}
        style={[styles.input, rest.editable === false && styles.readonly, style]}
        {...rest}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  lblRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  lbl: {
    fontFamily: fonts.sansExtra,
    fontSize: 10,
    color: colors.t3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t1,
    backgroundColor: colors.bg,
  },
  readonly: { backgroundColor: colors.mesh1, color: colors.t3 },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t4, marginTop: 5 },
  err: { fontFamily: fonts.sans, fontSize: 11, color: colors.r, marginTop: 5 },
});
