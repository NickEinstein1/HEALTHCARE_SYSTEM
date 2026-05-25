import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  text: string;
  /** Optional accent line above body copy */
  accent?: boolean;
};

/** Readable intro copy under the app header — tuned for patient-facing information. */
export function SectionLead({ text, accent }: Props) {
  return (
    <View style={styles.wrap}>
      {accent ? <View style={styles.line} /> : null}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  line: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.g,
    marginBottom: 10,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t2,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
});
