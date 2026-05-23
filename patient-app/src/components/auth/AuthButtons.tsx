import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

export function AuthPrimaryBtn({
  label,
  onPress,
  loading,
  dark,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primary, dark && styles.primaryDark, loading && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color={dark ? auth.bg : "#fff"} /> : <Text style={[styles.primaryTxt, dark && { color: auth.bg }]}>{label}</Text>}
    </Pressable>
  );
}

export function AuthGhostBtn({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable style={[styles.ghost, accent && styles.ghostAccent]} onPress={onPress}>
      <Text style={[styles.ghostTxt, accent && { color: auth.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthOrLine() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orTxt}>or verify with</Text>
      <View style={styles.orLine} />
    </View>
  );
}

export function AuthAltBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.alt} onPress={onPress}>
      <Text style={styles.altTxt}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: "#1a8a4a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryDark: { backgroundColor: auth.accent },
  primaryTxt: { fontFamily: fonts.sansExtra, fontSize: 14, color: "#fff" },
  ghost: {
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.28)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  ghostAccent: { borderColor: auth.border },
  ghostTxt: { fontFamily: fonts.sansBold, fontSize: 13, color: "#7ab8d8" },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: "#dde3dd" },
  orTxt: { fontFamily: fonts.sans, fontSize: 11, color: "#9bb0a5" },
  alt: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dde3dd",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: "30%",
  },
  altTxt: { fontFamily: fonts.sans, fontSize: 11, color: "#31463a" },
});
