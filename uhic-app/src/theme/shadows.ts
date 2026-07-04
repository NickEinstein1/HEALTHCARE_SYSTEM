import { Platform, ViewStyle } from "react-native";

export const shadows = {
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#4c1d95",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
    },
    android: { elevation: 5 },
    default: { boxShadow: "0 8px 24px rgba(76,29,149,0.1)" } as ViewStyle,
  }),
  tabBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#1a1425",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 12 },
    default: { boxShadow: "0 -4px 16px rgba(26,20,37,0.08)" } as ViewStyle,
  }),
} as const;
