import { StyleSheet, Text, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { Tag } from "../components/ui/Tag";
import { useUhic } from "../context/UhicContext";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function MembersScreen() {
  const { members, loading, refresh } = useUhic();

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <Panel title="Members & Policies" subtitle="Linked to EHR patient_id — no duplicate records">
        {members.map((m) => (
          <View key={m.member_id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {m.given_name} {m.family_name}
              </Text>
              <Text style={styles.meta}>
                {m.member_id} · Patient {m.patient_id}
              </Text>
            </View>
            <View style={styles.tags}>
              <Tag label={m.scheme_type} tone="teal" />
              <Tag label={m.status} tone={m.status === "active" ? "green" : "amber"} />
            </View>
          </View>
        ))}
      </Panel>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
    gap: 8,
  },
  name: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.t1 },
  meta: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 3 },
  tags: { gap: 4, alignItems: "flex-end" },
});
