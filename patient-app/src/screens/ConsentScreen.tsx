import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { api } from "../lib/api";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ConsentScreen() {
  const { patientId, toast } = usePatient();
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    try {
      const bundle = await api.consentSearch(patientId);
      setEntries((bundle.entry ?? []).map((e) => e.resource ?? {}).filter(Boolean));
    } catch {
      setEntries([]);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grant = async () => {
    try {
      await api.consentGrant({ patient_id: patientId, facility_id: "FAC-A", scope: "treatment" });
      toast("Consent granted for FAC-A");
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Grant failed");
    }
  };

  const revoke = async () => {
    try {
      await api.consentRevoke({ patient_id: patientId, facility_id: "FAC-A", scope: "treatment" });
      toast("Consent revoked for FAC-A");
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Revoke failed");
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ScreenIntro text="KDPA 2019 — control which facilities can access your record." />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🔒 KDPA 2019 compliant</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Grant FAC-A access" onPress={grant} />
        <SecondaryButton label="Revoke FAC-A" onPress={revoke} />
      </View>
      <Panel title="Active consents">
        {entries.length === 0 ? (
          <Text style={styles.empty}>No consent resources returned. Grant access above to create one.</Text>
        ) : (
          entries.map((r, i) => (
            <View key={String(r.id ?? i)} style={styles.row}>
              <Text style={styles.ico}>🏥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ti}>{String((r as { id?: string }).id ?? "Consent")}</Text>
                <Text style={styles.su}>Scope: treatment · Patient {patientId}</Text>
              </View>
              <Tag label={String((r as { status?: string }).status ?? "active")} tone="green" />
            </View>
          ))
        )}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.gl,
    borderWidth: 1,
    borderColor: colors.gm,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.gd },
  actions: { gap: 10, marginBottom: 14 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
  row: { flexDirection: "row", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  ico: { fontSize: 20 },
  ti: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  su: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 4 },
});
