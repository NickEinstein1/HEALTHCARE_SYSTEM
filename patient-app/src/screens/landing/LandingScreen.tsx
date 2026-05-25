import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AnimatedScrollScreen } from "../../components/animated/AnimatedScrollScreen";
import { StaggerSection } from "../../components/animated/StaggerSection";
import { UniHealthLogo } from "../../components/brand/UniHealthLogo";
import { PATIENT_STEPS } from "../../lib/signInConfig";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Landing">;

const STATS = [
  { v: 12, suffix: "", label: "Pilot facilities" },
  { v: 28400, suffix: "+", label: "Patient records" },
  { v: 99, suffix: "%", label: "Uptime SLA" },
];

export function LandingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [statsOn, setStatsOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStatsOn(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#05091a", "#081428", "#0a1e3d"]} style={StyleSheet.absoluteFill} />

      <StaggerSection style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandRow}>
          <UniHealthLogo size={36} idPrefix="land" />
          <View>
            <Text style={styles.logoNm}>UniHealth</Text>
            <Text style={styles.logoTg}>Patient 360</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <Pressable style={styles.btnGhost} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.btnGhostTxt}>Sign In</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={() => navigation.navigate("Register")}>
            <Text style={styles.btnPrimaryTxt}>Create Account</Text>
          </Pressable>
        </View>
      </StaggerSection>

      <AnimatedScrollScreen
        backgroundColor="transparent"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 0 }}
        padBottom={insets.bottom + 32}
      >
        <View style={[styles.hero, { paddingHorizontal: 20 }]}>
          <Text style={styles.eyebrow}>Phase 1 Pilot · Kenya National EHR · 2026</Text>
          <Text style={styles.hl}>
            Your health records.{"\n"}
            <Text style={styles.hlEm}>One portal.</Text>
            {"\n"}Every hospital.
          </Text>
          <Text style={styles.hd}>
            Book appointments, view lab results, manage medications, and exercise your KDPA data rights — securely, from your phone.
          </Text>
          <View style={styles.heroCtas}>
            <Pressable style={styles.btnPrimaryLg} onPress={() => navigation.navigate("SignIn")}>
              <Text style={styles.btnPrimaryTxt}>Sign In →</Text>
            </Pressable>
            <Pressable style={styles.btnOutlineLg} onPress={() => navigation.navigate("Register")}>
              <Text style={styles.btnOutlineTxt}>Create Account</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stats}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statVal}>
                {statsOn ? formatStat(s.v) : "0"}
                {s.suffix}
              </Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.secTitle}>How Patient 360 works</Text>
        <View style={styles.steps}>
          {PATIENT_STEPS.map((st) => (
            <View key={st.n} style={[styles.step, { borderColor: `${st.color}44` }]}>
              <Text style={[styles.stepN, { color: st.color }]}>{st.n}</Text>
              <Text style={styles.stepTitle}>{st.title}</Text>
              <Text style={styles.stepBody}>{st.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trust}>
          <Text style={styles.trustQuote}>
            "I got an SMS and opened my portal. Everything was there — results, what the doctor wrote, and my prescription."
          </Text>
          <Text style={styles.trustWho}>— James Otieno, Patient, Kisumu County Hospital</Text>
        </View>

        <View style={[styles.footer, { paddingHorizontal: 20 }]}>
          <Pressable style={styles.btnPrimaryLg} onPress={() => navigation.navigate("Register")}>
            <Text style={styles.btnPrimaryTxt}>Get started — Create Account</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("SignIn")} style={{ marginTop: 12 }}>
            <Text style={styles.footerLink}>Already have an account? Sign In</Text>
          </Pressable>
        </View>
      </AnimatedScrollScreen>
    </View>
  );
}

function formatStat(n: number) {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: auth.bg },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: auth.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoNm: { fontFamily: fonts.serif, fontSize: 18, color: auth.text },
  logoTg: { fontFamily: fonts.mono, fontSize: 9, color: auth.textMuted, letterSpacing: 1 },
  topActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.28)",
  },
  btnGhostTxt: { fontFamily: fonts.sansBold, fontSize: 12, color: auth.accent },
  btnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: auth.accent,
  },
  btnPrimaryTxt: { fontFamily: fonts.sansExtra, fontSize: 12, color: auth.bg },
  hero: { paddingHorizontal: 20, paddingTop: 28 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: auth.textDim,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  hl: { fontFamily: fonts.serif, fontSize: 32, color: auth.text, lineHeight: 38 },
  hlEm: { fontStyle: "italic", color: auth.accentGreen },
  hd: { fontFamily: fonts.sans, fontSize: 14, color: auth.textMuted, lineHeight: 22, marginTop: 14 },
  heroCtas: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  btnPrimaryLg: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: auth.accent,
  },
  btnOutlineLg: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: auth.border,
  },
  btnOutlineTxt: { fontFamily: fonts.sansBold, fontSize: 13, color: auth.accent },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: auth.border,
    overflow: "hidden",
  },
  stat: { flex: 1, padding: 16, alignItems: "center", backgroundColor: "rgba(8,18,42,0.65)" },
  statVal: { fontFamily: fonts.sansExtra, fontSize: 22, color: auth.accent },
  statLbl: { fontFamily: fonts.sans, fontSize: 10, color: auth.textMuted, marginTop: 4, textAlign: "center" },
  secTitle: {
    fontFamily: fonts.sansExtra,
    fontSize: 13,
    color: auth.text,
    marginHorizontal: 20,
    marginTop: 36,
    marginBottom: 12,
  },
  steps: { paddingHorizontal: 16, gap: 10 },
  step: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(8,18,42,0.5)",
  },
  stepN: { fontFamily: fonts.mono, fontSize: 11, marginBottom: 4 },
  stepTitle: { fontFamily: fonts.sansExtra, fontSize: 14, color: auth.text },
  stepBody: { fontFamily: fonts.sans, fontSize: 12, color: auth.textMuted, marginTop: 4, lineHeight: 18 },
  trust: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(61,142,248,0.28)",
    backgroundColor: "rgba(61,142,248,0.06)",
  },
  trustQuote: { fontFamily: fonts.sans, fontSize: 13, color: auth.text, fontStyle: "italic", lineHeight: 20 },
  trustWho: { fontFamily: fonts.sans, fontSize: 11, color: auth.patientBlue, marginTop: 10 },
  footer: { paddingHorizontal: 20, marginTop: 32, alignItems: "center" },
  footerLink: { fontFamily: fonts.sansBold, fontSize: 13, color: auth.accent },
});
