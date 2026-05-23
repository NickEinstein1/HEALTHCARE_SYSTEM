import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PayMethodRow({
  icon,
  logoBg,
  name,
  desc,
  onPress,
}: {
  icon: string;
  logoBg: string;
  name: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.logo, { backgroundColor: logoBg }]}>
        <Text style={styles.logoTxt}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
      <Text style={styles.arr}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bdr,
  },
  logo: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoTxt: { fontSize: 22 },
  name: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  desc: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  arr: { fontSize: 20, color: colors.t4 },
});
