import { StyleSheet, Text, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { useUhic } from "../context/UhicContext";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

const FACTORS = [
  { label: "Age band", desc: "0.85 (18–30) · 1.0 (31–45) · 1.25 (46–60) · 1.5 (60+)" },
  { label: "Occupation class", desc: "1 (desk) · 1.15 (field) · 1.35 (hazardous) · 1.6 (high risk)" },
  { label: "Claims history", desc: "0.9 (clean) · 1.0 (1 claim) · 1.2 (2–3) · 1.5 (4+)" },
  { label: "Facility tier", desc: "PHF tier 1–6 benefit caps · ECCIF cross-subsidy eligibility" },
];

export function UnderwritingScreen() {
  const { loading, refresh } = useUhic();

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <Panel title="Risk Rating Factors" subtitle="Private commercial & supplementary schemes">
        {FACTORS.map((f) => (
          <View key={f.label} style={styles.row}>
            <Text style={styles.label}>{f.label}</Text>
            <Text style={styles.desc}>{f.desc}</Text>
          </View>
        ))}
      </Panel>

      <Panel title="SHIF / Social Health Insurance" subtitle="Mandatory contribution model">
        <Text style={styles.body}>
          SHIF replaces NHIF at 2.75% of gross salary with Ksh 300 floor and Ksh 9,000 cap. Informal sector uses
          graduated means-testing. Benefits routed through PHF contracts and ECCIF catastrophic pool.
        </Text>
      </Panel>

      <Panel title="Underwriting workflow" subtitle="Human-in-the-loop for high-risk lives">
        <Text style={styles.body}>
          1. Verify member against EHR patient_id{"\n"}
          2. Run actuarial quote (Premiums tab){"\n"}
          3. Apply occupation & claims history loadings{"\n"}
          4. Issue policy with benefit_package_id{"\n"}
          5. Monitor loss ratio against IRA solvency thresholds
        </Text>
      </Panel>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.bdr },
  label: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.violetDark },
  desc: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, marginTop: 4, lineHeight: 18 },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 20 },
});
