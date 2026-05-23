import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SEARCH_ITEMS, type SearchItem } from "../lib/patientPortalData";
import { NOTIFICATIONS, type PortalNotification } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function SearchModal({
  visible,
  query,
  onQueryChange,
  onClose,
  onSelect,
}: {
  visible: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onSelect: (item: SearchItem) => void;
}) {
  const q = query.trim().toLowerCase();
  const items = q ? SEARCH_ITEMS.filter((x) => (x.label + x.sub).toLowerCase().includes(q)) : SEARCH_ITEMS;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.sheet}>
          <View style={styles.hd}>
            <Text style={styles.title}>Search portal</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Close</Text></Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={onQueryChange}
            placeholder="Records, results, bills…"
            placeholderTextColor={colors.t4}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 420 }}>
            {items.map((x) => (
              <Pressable key={x.key} style={styles.row} onPress={() => onSelect(x)}>
                <Text style={styles.ico}>{x.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTi}>{x.label}</Text>
                  <Text style={styles.rowSu}>{x.sub}</Text>
                </View>
                <Text style={styles.go}>Go →</Text>
              </Pressable>
            ))}
            {!items.length ? <Text style={styles.empty}>No matches.</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function NotificationsModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (n: PortalNotification) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.sheet}>
          <View style={styles.hd}>
            <Text style={styles.title}>Notifications</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Close</Text></Pressable>
          </View>
          <ScrollView>
            {NOTIFICATIONS.map((n) => (
              <Pressable key={n.id} style={styles.row} onPress={() => onSelect(n)}>
                <Text style={styles.ico}>{n.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTi}>{n.title}</Text>
                  <Text style={styles.rowSu}>{n.sub}</Text>
                </View>
                <Text style={styles.time}>{n.time}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(2,6,23,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    maxHeight: "85%",
  },
  hd: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.t1 },
  close: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.gd },
  input: {
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 10,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t1,
    backgroundColor: colors.bg,
    marginBottom: 12,
  },
  row: { flexDirection: "row", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  ico: { fontSize: 20 },
  rowTi: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  rowSu: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  go: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gd },
  time: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3 },
  empty: { fontFamily: fonts.sans, fontSize: 12, color: colors.t3, padding: 12 },
});
