import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ToastBanner({ message }: { message: string | null }) {
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
    bottom: 88,
    left: 16,
    right: 16,
    backgroundColor: colors.gd,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    zIndex: 100,
    elevation: 8,
  },
  text: { color: "#fff", fontFamily: fonts.sansBold, fontSize: 13, textAlign: "center" },
});
