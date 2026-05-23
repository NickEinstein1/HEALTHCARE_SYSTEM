import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gapSm: { gap: 8 },
  gapMd: { gap: 12 },
  gapLg: { gap: 16 },
});
