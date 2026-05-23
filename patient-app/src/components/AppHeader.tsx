import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Props = {
  title: string;
  crumb?: string;
  onSignOut?: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  notifCount?: number;
};

/** Mobile header aligned with web DashboardShell patient topbar. */
export function AppHeader({ title, crumb, onSignOut, onSearch, onNotifications, notifCount = 3 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.flag} />
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🏃</Text>
          </View>
          <View>
            <Text style={styles.portal}>Patient 360</Text>
            <Text style={styles.crumb}>{crumb ?? "UniHealth"}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {onSearch ? (
            <Pressable onPress={onSearch} style={styles.iconBtn}>
              <Text>🔍</Text>
            </Pressable>
          ) : null}
          {onNotifications ? (
            <Pressable onPress={onNotifications} style={styles.iconBtn}>
              <Text>🔔</Text>
              {notifCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{notifCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {onSignOut ? (
            <Pressable onPress={onSignOut} style={styles.out}>
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
    borderBottomWidth: 1.5,
    borderBottomColor: colors.bdr,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.gl,
    borderWidth: 1,
    borderColor: colors.gm,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 18 },
  portal: { fontFamily: fonts.sansExtra, fontSize: 11, color: colors.gd },
  crumb: { fontFamily: fonts.mono, fontSize: 9, color: colors.t3, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.r,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { fontFamily: fonts.sansBold, fontSize: 9, color: "#fff" },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.t1, marginTop: 10 },
  out: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: colors.bdr, borderRadius: 8 },
  outText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2 },
});
