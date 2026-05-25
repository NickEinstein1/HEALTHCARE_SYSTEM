import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";

/** Snappy transitions inside Patient 360 (tabs stay mounted via `lazy: false`). */
export const fastStackScreenOptions: NativeStackNavigationOptions = {
  animation: Platform.OS === "web" ? "none" : "fade",
  animationDuration: Platform.OS === "ios" ? 120 : 100,
  gestureEnabled: Platform.OS !== "web",
  contentStyle: { backgroundColor: colors.bg },
};

export const authStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: Platform.OS === "web" ? "none" : "fade",
  animationDuration: 140,
  contentStyle: { backgroundColor: "#05091a" },
};
