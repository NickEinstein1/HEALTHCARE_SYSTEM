import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { UHIC_ROLES, signIn } from "../../lib/auth";
import { config } from "../../lib/config";
import { colors, gradients } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import type { UhicRole } from "../../types/uhic";

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [role, setRole] = useState<UhicRole>(config.defaultRole);
  const [facilityId, setFacilityId] = useState(config.defaultFacilityId);
  const [displayName, setDisplayName] = useState("UHIC Operator");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await signIn({ role, facilityId, displayName });
      onSignedIn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <LinearGradient colors={gradients.hero} style={styles.hero}>
        <Text style={styles.heroBadge}>UHIC</Text>
        <Text style={styles.heroTitle}>UHIC</Text>
        <Text style={styles.heroSub}>
          Kenya national health insurance — SHIF under Social Health Authority. Universal coverage with
          income-based contributions.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Operator name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.t4}
        />

        <Text style={styles.label}>Facility ID</Text>
        <TextInput
          style={styles.input}
          value={facilityId}
          onChangeText={setFacilityId}
          autoCapitalize="characters"
          placeholder="FAC-A"
          placeholderTextColor={colors.t4}
        />

        <Text style={styles.label}>Role</Text>
        {UHIC_ROLES.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.roleRow, role === r.id && styles.roleRowActive]}
            onPress={() => setRole(r.id)}
          >
            <View>
              <Text style={styles.roleLabel}>{r.label}</Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </View>
            {role === r.id ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Pressable style={styles.btn} onPress={() => void submit()} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.w} /> : <Text style={styles.btnText}>Open UHIC</Text>}
        </Pressable>

        <Text style={styles.pilot}>
          Pilot mode: role header authenticates against ehr-api gateway (:8100). Production uses Keycloak realm roles.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 40 },
  hero: { padding: 28, paddingTop: 64 },
  heroBadge: {
    alignSelf: "flex-start",
    fontFamily: fonts.sansExtra,
    fontSize: 12,
    color: colors.w,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  heroTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.w },
  heroSub: { fontFamily: fonts.sans, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 10, lineHeight: 20 },
  card: {
    margin: 16,
    marginTop: -20,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bdr,
    padding: 20,
  },
  label: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t3, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t1,
    backgroundColor: colors.mesh2,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.mesh2,
  },
  roleRowActive: { borderColor: colors.violet, backgroundColor: colors.violetLight },
  roleLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t1 },
  roleDesc: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  check: { fontFamily: fonts.sansExtra, fontSize: 16, color: colors.violet },
  err: { fontFamily: fonts.sans, fontSize: 12, color: colors.r, marginTop: 10 },
  btn: {
    marginTop: 18,
    backgroundColor: colors.violetDark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.w },
  pilot: { fontFamily: fonts.sans, fontSize: 10, color: colors.t4, marginTop: 14, lineHeight: 15, textAlign: "center" },
});
