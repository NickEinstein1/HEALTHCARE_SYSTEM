import { Platform, ViewStyle } from "react-native";

/** Elevation presets — green-tinted shadows for UniHealth cards. */
export const shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0a4a26",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: { boxShadow: "0 2px 8px rgba(10,74,38,0.06)" } as ViewStyle,
  }),
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0a4a26",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
    },
    android: { elevation: 5 },
    default: { boxShadow: "0 8px 24px rgba(10,74,38,0.1)" } as ViewStyle,
  }),
  lg: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#061510",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: { boxShadow: "0 16px 40px rgba(6,21,16,0.14)" } as ViewStyle,
  }),
  tabBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#061510",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 12 },
    default: { boxShadow: "0 -4px 16px rgba(6,21,16,0.08)" } as ViewStyle,
  }),
  hero: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0a4a26",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
    },
    android: { elevation: 10 },
    default: { boxShadow: "0 20px 48px rgba(10,74,38,0.22)" } as ViewStyle,
  }),
} as const;
