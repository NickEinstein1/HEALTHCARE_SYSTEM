import { Pressable, StyleSheet, Text, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { useUhic } from "../context/UhicContext";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function MenuScreen({ onSignOut }: { onSignOut: () => void }) {
  const { displayName, role, facilityId } = useUhic();

  return (
    <ScreenScroll>
      <Panel title="Session" subtitle="UHIC operator profile">
        <Row label="Name" value={displayName} />
        <Row label="Role" value={role.replace(/_/g, " ")} />
        <Row label="Facility" value={facilityId || "—"} />
        <Row label="API" value="ehr-api :8100 /insurance/*" />
      </Panel>

      <Panel title="Module alignment" subtitle="UniHealth 360 ecosystem">
        <Text style={styles.body}>
          UHIC is the 7th UniHealth 360 module. This standalone app mirrors the web console at /modules/uhic with
          mobile-first access for field adjudicators, underwriters, and scheme finance officers.
        </Text>
      </Panel>

      <Pressable style={styles.signOut} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScreenScroll>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
  },
  label: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
  value: { fontFamily: fonts.mono, fontSize: 11, color: colors.t1, maxWidth: "60%", textAlign: "right" },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 18 },
  signOut: {
    marginTop: 8,
    backgroundColor: colors.rl,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.r },
});
