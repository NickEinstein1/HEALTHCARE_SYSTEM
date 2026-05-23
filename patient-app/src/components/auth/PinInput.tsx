import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

type Props = {
  length: 4 | 6;
  value: string[];
  onChange: (next: string[]) => void;
  dark?: boolean;
};

export function PinInput({ length, value, onChange, dark }: Props) {
  const refs = useRef<(TextInput | null)[]>([]);

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = d;
    onChange(next);
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKeyPress = (i: number, key: string) => {
    if (key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          style={[styles.box, value[i] && styles.boxFilled, dark && styles.boxDark]}
          value={value[i]}
          onChangeText={(t) => setDigit(i, t)}
          onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          secureTextEntry
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#dde3dd",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    fontFamily: fonts.sansExtra,
    color: "#14201a",
    backgroundColor: "#f4f7f4",
  },
  boxFilled: { borderColor: "#1a8a4a" },
  boxDark: {
    backgroundColor: auth.inputBg,
    borderColor: auth.border,
    color: auth.text,
  },
});
