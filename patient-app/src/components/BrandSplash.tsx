import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StaggerSection } from "./animated/StaggerSection";
import { UniHealthLogo } from "./brand/UniHealthLogo";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function BrandSplash({ message = "Loading Patient 360…" }: { message?: string }) {
  return (
    <LinearGradient colors={[colors.mesh2, colors.bg]} style={styles.root}>
      <StaggerSection variant="hero" style={styles.center}>
        <View style={styles.logoRing}>
          <UniHealthLogo size={72} idPrefix="splash" />
        </View>
        <Text style={styles.name}>UniHealth</Text>
        <Text style={styles.tag}>Patient 360</Text>
        <ActivityIndicator color={colors.g} style={{ marginTop: 28 }} />
        <Text style={styles.msg}>{message}</Text>
      </StaggerSection>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  logoRing: {
    padding: 16,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  name: { fontFamily: fonts.serif, fontSize: 28, color: colors.gd, marginTop: 20 },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.t3,
    marginTop: 6,
    textTransform: "uppercase",
  },
  msg: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, marginTop: 12 },
});
