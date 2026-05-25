import { StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

/** Subtitle under the app header — avoids duplicating the page title in scroll content. */
export function ScreenIntro({ text }: { text: string }) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.t3,
    lineHeight: 20,
    marginBottom: 14,
  },
});
