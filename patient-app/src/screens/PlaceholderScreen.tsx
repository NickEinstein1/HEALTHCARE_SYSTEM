import { ScrollView, StyleSheet, Text } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PlaceholderScreen({ title, eyebrow, subtitle }: { title: string; eyebrow: string; subtitle: string }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <Panel title={title}>
        <Text style={styles.body}>
          This section matches the web patient portal navigation. Full payment and document workflows will ship in the
          next sprint — navigation and audit logging are already aligned with the web app.
        </Text>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 20 },
});
