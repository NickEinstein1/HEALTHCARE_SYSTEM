import { TextStyle } from "react-native";
import { colors } from "./colors";

export const fonts = {
  sans: "Sora_400Regular",
  sansBold: "Sora_700Bold",
  sansExtra: "Sora_800ExtraBold",
  serif: "DMSerifDisplay_400Regular",
  mono: "JetBrainsMono_500Medium",
} as const;

export const type: Record<string, TextStyle> = {
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.t3,
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.t1,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.t2,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.t3,
    lineHeight: 16,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.t2,
  },
};
