import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function SyncBadge({
  syncVersion,
  syncing,
  lastSyncAt,
}: {
  syncVersion: number;
  syncing: boolean;
  lastSyncAt: number | null;
}) {
  const ago =
    lastSyncAt == null
      ? "—"
      : `${Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000))}s ago`;
  return (
    <View style={styles.wrap}>
      <View style={[styles.dot, syncing ? styles.dotBusy : styles.dotOk]} />
      <Text style={styles.text}>
        Sync v{syncVersion} · {syncing ? "updating…" : ago}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: colors.teal },
  dotBusy: { backgroundColor: colors.am },
  text: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3 },
});
