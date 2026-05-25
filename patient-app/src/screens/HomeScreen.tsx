import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { CoverCard } from "../components/CoverCard";
import { HeroCard } from "../components/HeroCard";
import { QuickActions } from "../components/QuickActions";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { useAppointments } from "../hooks/useAppointments";
import { AI_INSIGHTS, REFERENCE_RESULTS, displayAflId, MEMBER_ID } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import type { HealthStackParamList, RootTabParamList } from "../navigation/types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, "Home">,
  NativeStackNavigationProp<HealthStackParamList>
>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { patientId, setPatientId, summary, meds, observations, loading, error, refresh, toast } = usePatient();
  const { appointments } = useAppointments(patientId);

  const firstName = summary?.patient.given_name ?? "there";
  const visitCount = summary?.encounters?.length ?? 7;

  const medLabel = (m: (typeof meds)[0]) => m.medication_code ?? m.medication ?? "Medication";
  const medDose = (m: (typeof meds)[0]) => m.dosage_text ?? m.dosage ?? "—";

  return (
    <AnimatedScrollScreen refreshing={loading} onRefresh={refresh}>
      <HeroCard
        greeting={`Good morning, ${firstName} 👋`}
        subtitle="All your health information, in one secure place."
        aflId={displayAflId(patientId)}
        stats={[
          { value: String(visitCount), label: "Visits this year" },
          { value: "Ksh 0", label: "Outstanding bills", accent: true },
          { value: String(appointments.length || 2), label: "Upcoming appts" },
          { value: "Active", label: "Cover status", accent: true },
        ]}
      />

      <View style={styles.idPills}>
        <Text style={styles.pill}>Member: {MEMBER_ID}</Text>
        <Text style={styles.pill}>Cover: UniHealth Active ✓</Text>
      </View>

      <QuickActions
        actions={[
          { icon: "📅", label: "Book Appointment", onPress: () => nav.navigate("Health", { screen: "Appointments" }) },
          { icon: "🧪", label: "Test Results", onPress: () => nav.navigate("Health", { screen: "Results" }) },
          { icon: "📱", label: "Make Payment", onPress: () => nav.navigate("Wallet", { screen: "Pay" }) },
          { icon: "📂", label: "Health Records", onPress: () => nav.navigate("Menu", { screen: "Records" }) },
          { icon: "💬", label: "Message Doctor", onPress: () => nav.navigate("Messages") },
          { icon: "🛡️", label: "My Cover", onPress: () => nav.navigate("Wallet", { screen: "Coverage" }) },
        ]}
      />

      <CoverCard onPress={() => nav.navigate("Wallet", { screen: "Coverage" })} />

      <View style={styles.idBar}>
        <Text style={styles.idLabel}>Gateway patient ID</Text>
        <TextInput
          style={styles.idInput}
          value={patientId}
          onChangeText={(v) => {
            setPatientId(v);
            toast(`Loading ${v}…`);
          }}
          autoCapitalize="characters"
        />
        <Tag label="LIVE" tone="green" />
      </View>

      {error ? (
        <View style={styles.err}>
          <Text style={styles.errText}>⚠️ {error}</Text>
          <Text style={styles.errHint}>Start staging: ./scripts/run_staging.sh — API :8100</Text>
        </View>
      ) : null}

      <Panel title="AI Health Insights" subtitle="Personalised from your latest results & vitals">
        {AI_INSIGHTS.map((row) => (
          <Pressable
            key={row.title}
            style={styles.aiRow}
            onPress={() => {
              if (row.tone === "red") nav.navigate("Health", { screen: "Results" });
              else if (row.title.includes("Medication")) nav.navigate("Health", { screen: "Medications" });
              else nav.navigate("Wallet", { screen: "Coverage" });
            }}
          >
            <Text style={styles.aiIco}>{row.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTi}>{row.title}</Text>
              <Text style={styles.aiSu}>{row.body}</Text>
            </View>
            <Tag label={row.tag} tone={row.tone === "red" ? "red" : row.tone === "amber" ? "amber" : "blue"} />
          </Pressable>
        ))}
        <Text style={styles.kdpa}>🔒 KDPA 2019 — insights use your records only.</Text>
      </Panel>

      <Panel
        title="Upcoming appointments"
        subtitle="Next 30 days"
        actionLabel="Book new →"
        onAction={() => nav.navigate("Health", { screen: "Appointments" })}
      >
        {appointments.slice(0, 3).map((a) => (
          <View key={a.id} style={styles.appt}>
            <View style={{ flex: 1 }}>
              <Text style={styles.apptTi}>{a.dept}</Text>
              <Text style={styles.apptSu}>
                {a.where} · {a.when}
              </Text>
            </View>
            <Tag label={a.status === "confirmed" ? "Confirmed" : "Pending"} tone={a.tag === "green" ? "green" : "amber"} />
          </View>
        ))}
      </Panel>

      <Panel
        title="Active medications"
        subtitle="FHIR MedicationRequest"
        actionLabel="All meds →"
        onAction={() => nav.navigate("Health", { screen: "Medications" })}
      >
        {loading && !meds.length ? (
          <ActivityIndicator color={colors.g} />
        ) : (
          meds.slice(0, 4).map((m) => (
            <View key={m.id} style={styles.med}>
              <Text style={styles.medIco}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{medLabel(m)}</Text>
                <Text style={styles.medDose}>{medDose(m)}</Text>
              </View>
              <Tag label={m.status ?? "active"} tone="green" />
            </View>
          ))
        )}
      </Panel>

      <Panel
        title="Recent test results"
        subtitle="Tap for full lab list"
        actionLabel="All results →"
        onAction={() => nav.navigate("Health", { screen: "Results" })}
      >
        {observations.length > 0
          ? observations.slice(0, 3).map((o) => (
              <Pressable key={o.id} style={styles.res} onPress={() => nav.navigate("Health", { screen: "Results" })}>
                <View style={[styles.resDot, styles.resDotNorm]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resName}>{o.code ?? "Result"}</Text>
                  <Text style={styles.resWhen}>{o.effective_time ?? "—"}</Text>
                </View>
                <Text style={styles.resVal}>{o.value_text ?? "—"}</Text>
              </Pressable>
            ))
          : REFERENCE_RESULTS.slice(0, 2).map((r) => (
              <Pressable key={r.name} style={styles.res} onPress={() => nav.navigate("Health", { screen: "Results" })}>
                <View style={[styles.resDot, r.flag === "high" ? styles.resDotHigh : styles.resDotNorm]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resName}>{r.name}</Text>
                  <Text style={styles.resWhen}>{r.range}</Text>
                </View>
                <Text style={[styles.resVal, r.flag === "high" && { color: colors.r }]}>{r.value}</Text>
              </Pressable>
            ))}
      </Panel>

      <Panel title="Latest vitals" actionLabel="Trends →" onAction={() => nav.navigate("Health", { screen: "Vitals" })}>
        <View style={styles.vitalGrid}>
          {observations.slice(0, 4).map((o) => (
            <View key={o.id} style={styles.vital}>
              <Text style={styles.vitalV}>{o.value_text ?? "—"}</Text>
              <Text style={styles.vitalL} numberOfLines={1}>
                {o.code ?? "Observation"}
              </Text>
            </View>
          ))}
        </View>
      </Panel>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  idPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12, marginTop: -8 },
  pill: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.t3,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  idBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 10,
    padding: 10,
  },
  idLabel: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3 },
  idInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.t1,
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 6,
    padding: 6,
  },
  err: {
    backgroundColor: colors.rl,
    borderColor: colors.rm,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.r },
  errHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 4 },
  aiRow: { flexDirection: "row", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  aiIco: { fontSize: 16 },
  aiTi: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  aiSu: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2, lineHeight: 16 },
  kdpa: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.gd, marginTop: 10 },
  appt: { flexDirection: "row", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  apptTi: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  apptSu: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  med: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  medIco: { fontSize: 20 },
  medName: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  medDose: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3 },
  res: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  resDot: { width: 8, height: 8, borderRadius: 4 },
  resDotNorm: { backgroundColor: colors.g },
  resDotHigh: { backgroundColor: colors.r },
  resName: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
  resWhen: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3 },
  resVal: { fontFamily: fonts.serif, fontSize: 16, color: colors.t1 },
  vitalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vital: {
    width: "47%",
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  vitalV: { fontFamily: fonts.serif, fontSize: 18, color: colors.t1 },
  vitalL: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3, marginTop: 6 },
});
