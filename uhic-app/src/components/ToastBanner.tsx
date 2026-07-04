import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ToastBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 90,
    backgroundColor: colors.violetDark,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  text: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.w, textAlign: "center" },
});
