import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniHealthLogo } from "./brand/UniHealthLogo";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";

type Props = {
  title: string;
  crumb?: string;
  onSignOut?: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  notifCount?: number;
};

export function AppHeader({ title, crumb, onSignOut, onSearch, onNotifications, notifCount = 3 }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }, shadows.sm]}>
      <LinearGradient colors={["#ffffff", colors.mesh2]} style={StyleSheet.absoluteFill} />
      <View style={styles.flag} />
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <UniHealthLogo size={36} idPrefix="hdr" />
          </View>
          <View>
            <Text style={styles.portal}>Patient 360</Text>
            <Text style={styles.crumb}>{crumb ?? "UniHealth"}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {onSearch ? (
            <Pressable onPress={onSearch} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Text style={styles.iconEmoji}>🔍</Text>
            </Pressable>
          ) : null}
          {onNotifications ? (
            <Pressable onPress={onNotifications} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Text style={styles.iconEmoji}>🔔</Text>
              {notifCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{notifCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {onSignOut ? (
            <Pressable onPress={onSignOut} style={({ pressed }) => [styles.out, pressed && styles.pressed]}>
              <Text style={styles.outText}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.bdr,
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: "hidden",
  },
  flag: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.g,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logoBox: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  portal: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.gd, letterSpacing: 0.2 },
  crumb: { fontFamily: fonts.mono, fontSize: 9, color: colors.t3, marginTop: 2, letterSpacing: 0.5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.bdr,
    alignItems: "center",
    justifyContent: "center",
  },
  iconEmoji: { fontSize: 16 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: colors.r,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 9, color: "#fff" },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.t1,
    marginTop: 12,
    letterSpacing: -0.3,
  },
  out: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.gl,
    borderWidth: 1,
    borderColor: colors.gm,
  },
  outText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gd },
});
