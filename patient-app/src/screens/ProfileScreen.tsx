import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { SecondaryButton } from "../components/ui/Buttons";
import { usePatient } from "../context/PatientContext";
import { signOut } from "../lib/auth";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Props = { onSignOut: () => void };

export function ProfileScreen({ onSignOut }: Props) {
  const { patientId, summary } = usePatient();
  const p = summary?.patient;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Account" title="My Profile" subtitle="Personal details from FHIR Patient." />
      <Panel title="Identity">
        <Text style={styles.row}>
          <Text style={styles.k}>Name </Text>
          {p ? `${p.given_name ?? ""} ${p.family_name ?? ""}`.trim() : "—"}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>Patient ID </Text>
          <Text style={styles.mono}>{patientId}</Text>
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>Gender </Text>
          {p?.gender ?? "—"}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>Birth date </Text>
          {p?.birth_date ?? "—"}
        </Text>
      </Panel>
      <Panel title="Session">
        <Text style={styles.caption}>Sign out clears local session (same as web portal sign-out).</Text>
        <SecondaryButton
          label="Sign out"
          onPress={async () => {
            await signOut();
            onSignOut();
          }}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  row: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginBottom: 8 },
  k: { fontFamily: fonts.sansExtra, color: colors.t3 },
  mono: { fontFamily: fonts.mono },
  caption: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, lineHeight: 16 },
});
