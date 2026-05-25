import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StaggerSection } from "../animated/StaggerSection";
import { UniHealthLogo } from "../brand/UniHealthLogo";
import { auth } from "../../theme/authTheme";
import { gradients } from "../../theme/colors";
import { shadows } from "../../theme/shadows";
import { fonts } from "../../theme/typography";

type Variant = "dark" | "light";

type Props = {
  children: ReactNode;
  variant?: Variant;
  showBrand?: boolean;
  footer?: ReactNode;
};

/** Sign-in / register shell — logo, gradient brand strip, animated card. */
export function AuthShell({ children, variant = "light", showBrand = true, footer }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = variant === "dark";

  return (
    <View style={[styles.root, isDark && { backgroundColor: auth.bg }]}>
      {showBrand ? (
        <StaggerSection variant="hero">
          <LinearGradient
            colors={["#061510", "#0a3d1e", "#1a6635"]}
            style={[styles.brand, { paddingTop: insets.top + 12 }]}
          >
            <LinearGradient colors={[...gradients.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flag} />
            <View style={styles.brandRow}>
              <View style={styles.logoRing}>
                <UniHealthLogo size={44} idPrefix="auth" />
              </View>
              <View>
                <Text style={styles.brandNm}>UniHealth</Text>
                <Text style={styles.brandTg}>Patient 360 · Innovation at its core</Text>
              </View>
            </View>
            <Text style={styles.brandHl}>
              One login.{"\n"}
              <Text style={styles.brandEm}>Every record,</Text>
              {"\n"}everywhere.
            </Text>
          </LinearGradient>
        </StaggerSection>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollIn, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StaggerSection index={showBrand ? 1 : 0}>
          <View style={[styles.card, isDark && styles.cardDark, shadows.lg]}>
            <LinearGradient colors={[auth.stripe, "#7beba4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stripe} />
            {children}
          </View>
        </StaggerSection>
        {footer ? <StaggerSection index={showBrand ? 2 : 1}>{footer}</StaggerSection> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: auth.inputBgLight },
  brand: { paddingHorizontal: 20, paddingBottom: 22 },
  flag: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  logoRing: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  brandNm: { fontFamily: fonts.serif, fontSize: 22, color: "#fff" },
  brandTg: { fontFamily: fonts.sans, fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 },
  brandHl: { fontFamily: fonts.serif, fontSize: 22, color: "#fff", marginTop: 16, lineHeight: 28 },
  brandEm: { fontStyle: "italic", color: "#7beba4" },
  scroll: { flex: 1 },
  scrollIn: { padding: 16, maxWidth: Platform.OS === "web" ? 480 : undefined, alignSelf: "center", width: "100%" },
  card: {
    backgroundColor: auth.bgCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: auth.borderLight,
    overflow: "hidden",
  },
  cardDark: {
    backgroundColor: "rgba(8,18,42,0.95)",
    borderColor: auth.border,
  },
  stripe: { height: 3 },
});
