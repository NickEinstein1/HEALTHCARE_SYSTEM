import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function MedicationsScreen() {
  const { meds, loading, toast } = usePatient();

  const label = (m: (typeof meds)[0]) => m.medication_code ?? m.medication ?? "Medication";
  const dose = (m: (typeof meds)[0]) => m.dosage_text ?? m.dosage ?? "—";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Pharmacy" title="My Medications" subtitle="Prescriptions, refills, and pharmacy routing." />
      <Notice
        icon="💊"
        title="Refill reminder"
        body="Amlodipine 5mg due in 5 days. Request at any UniHealth-accredited pharmacy."
        tone="blue"
      />
      <Panel title="Active prescriptions" subtitle={loading ? "Loading…" : `${meds.length} items`}>
        {meds.length === 0 ? (
          <Text style={styles.empty}>No medications returned for this patient.</Text>
        ) : (
          meds.map((m) => (
            <View key={m.id} style={styles.med}>
              <View style={styles.medIco}>
                <Text>💊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{label(m)}</Text>
                <Text style={styles.medDose}>{dose(m)}</Text>
                <Text style={styles.medRef}>{m.id}</Text>
              </View>
              <View style={styles.actions}>
                <Tag label={m.status ?? "active"} tone="green" />
                <PrimaryButton
                  label="Refill"
                  onPress={() => toast(`Refill requested for ${label(m)}. Pharmacy notified within 24h.`)}
                  style={{ marginTop: 6, paddingVertical: 6 }}
                />
              </View>
            </View>
          ))
        )}
      </Panel>
      <SecondaryButton label="Print medication list" onPress={() => toast("Exporting medication list PDF…")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
  med: { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  medIco: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.gl,
    alignItems: "center",
    justifyContent: "center",
  },
  medName: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  medDose: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  medRef: { fontFamily: fonts.mono, fontSize: 9, color: colors.t4, marginTop: 4 },
  actions: { alignItems: "flex-end", minWidth: 72 },
});
