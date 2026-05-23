import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

type Variant = "dark" | "light";

type Props = {
  children: ReactNode;
  variant?: Variant;
  showBrand?: boolean;
  footer?: ReactNode;
};

/** Sign-in / register shell — green brand strip + card (web parity). */
export function AuthShell({ children, variant = "light", showBrand = true, footer }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = variant === "dark";

  return (
    <View style={[styles.root, isDark && { backgroundColor: auth.bg }]}>
      {showBrand ? (
        <LinearGradient colors={["#061510", "#0a3d1e", "#1a6635"]} style={[styles.brand, { paddingTop: insets.top + 12 }]}>
          <View style={styles.flag} />
          <Text style={styles.brandNm}>UniHealth</Text>
          <Text style={styles.brandTg}>Patient 360 · Innovation at its core</Text>
          <Text style={styles.brandHl}>
            One login.{"\n"}
            <Text style={styles.brandEm}>Every record,</Text>
            {"\n"}everywhere.
          </Text>
        </LinearGradient>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollIn, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isDark && styles.cardDark]}>
          <View style={[styles.stripe, isDark && { backgroundColor: auth.accent }]} />
          {children}
        </View>
        {footer}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: auth.inputBgLight },
  brand: { paddingHorizontal: 20, paddingBottom: 20 },
  flag: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: auth.stripe,
  },
  brandNm: { fontFamily: fonts.serif, fontSize: 20, color: "#fff", marginTop: 8 },
  brandTg: { fontFamily: fonts.sans, fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  brandHl: { fontFamily: fonts.serif, fontSize: 22, color: "#fff", marginTop: 14, lineHeight: 28 },
  brandEm: { fontStyle: "italic", color: "#7beba4" },
  scroll: { flex: 1 },
  scrollIn: { padding: 16, maxWidth: Platform.OS === "web" ? 480 : undefined, alignSelf: "center", width: "100%" },
  card: {
    backgroundColor: auth.bgCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: auth.borderLight,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 24px 64px rgba(10,74,38,0.1)" } as object,
      default: {
        shadowColor: "#0a4a26",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  cardDark: {
    backgroundColor: "rgba(8,18,42,0.95)",
    borderColor: auth.border,
  },
  stripe: { height: 3, backgroundColor: auth.stripe },
});
