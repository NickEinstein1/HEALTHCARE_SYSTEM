import { StyleSheet, Text } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PlaceholderScreen({ title, eyebrow, subtitle }: { title: string; eyebrow: string; subtitle: string }) {
  return (
    <AnimatedScrollScreen>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <Panel title={title}>
        <Text style={styles.body}>
          This section matches the web patient portal navigation. Full payment and document workflows will ship in the
          next sprint — navigation and audit logging are already aligned with the web app.
        </Text>
      </Panel>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 20 },
});
