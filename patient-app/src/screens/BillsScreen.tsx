import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Notice } from "../components/ui/Notice";
import { SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { BILLS } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function BillsScreen() {
  const { toast } = usePatient();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow="Finance" title="Bills & Invoices" subtitle="Charges, cover settlements, and downloadable invoices." />
      <Notice icon="✅" title="All clear" body="No outstanding bills. UniHealth cover settled recent charges." tone="green" />
      <Panel title="Billing history" subtitle="Covered and out-of-pocket" noPadding>
        {BILLS.map((b) => (
          <View key={b.date + b.desc} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{b.desc}</Text>
              <Text style={styles.date}>{b.date}</Text>
            </View>
            <Text style={styles.amt}>{b.amount}</Text>
            <Tag label={b.status} tone="green" />
            <SecondaryButton
              label="Invoice"
              onPress={() => toast(`Invoice: ${b.desc} (${b.date})`)}
              style={{ marginLeft: 6 }}
            />
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr, gap: 6 },
  desc: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 2 },
  amt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.t1 },
});
