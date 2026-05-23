import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed, style]} onPress={onPress}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.g,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: {
    color: colors.w,
    fontFamily: fonts.sansExtra,
    fontSize: 13,
    fontWeight: "900",
  },
  secondary: {
    backgroundColor: colors.w,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.t1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
