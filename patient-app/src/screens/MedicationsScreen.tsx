import { StyleSheet, Text, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { InfoRow } from "../components/ui/InfoRow";
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
    <AnimatedScrollScreen>
      <ScreenIntro text="Prescriptions, refills, and pharmacy routing." accent />
      <Notice
        icon="💊"
        title="Refill reminder"
        body="Amlodipine 5mg due in 5 days. Request at any UniHealth-accredited pharmacy."
        tone="blue"
      />
      <Panel title="Active prescriptions" subtitle={loading ? "Loading…" : `${meds.length} items`} noPadding>
        {meds.length === 0 ? (
          <Text style={styles.empty}>No medications returned for this patient.</Text>
        ) : (
          meds.map((m) => (
            <InfoRow
              key={m.id}
              icon="💊"
              title={label(m)}
              subtitle={`${dose(m)} · ${m.id}`}
              right={
                <View style={styles.actions}>
                  <Tag label={m.status ?? "active"} tone="green" />
                  <PrimaryButton
                    label="Refill"
                    onPress={() => toast(`Refill requested for ${label(m)}. Pharmacy notified within 24h.`)}
                    style={{ marginTop: 6, paddingVertical: 6 }}
                  />
                </View>
              }
            />
          ))
        )}
      </Panel>
      <SecondaryButton label="Print medication list" onPress={() => toast("Exporting medication list PDF…")} />
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, padding: 16 },
  actions: { alignItems: "flex-end", minWidth: 72 },
});
