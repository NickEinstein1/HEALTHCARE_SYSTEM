import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ID_TYPE_OPTIONS, type IdTypeKey } from "../../lib/signInConfig";
import { auth } from "../../theme/authTheme";
import { authInputStyle, AuthField } from "./AuthForm";
import { fonts } from "../../theme/typography";

type Props = {
  value: IdTypeKey;
  onChange: (v: IdTypeKey) => void;
  dark?: boolean;
};

export function IdTypePicker({ value, onChange, dark }: Props) {
  const [open, setOpen] = useState(false);
  const label = ID_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <AuthField label="ID Type" dark={dark}>
      <Pressable onPress={() => setOpen(true)}>
        <View style={authInputStyle(dark)}>
          <Text style={[styles.val, dark && { color: auth.text }]}>{label}</Text>
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, dark && styles.sheetDark]}>
            <Text style={[styles.sheetTitle, dark && { color: auth.text }]}>Select ID type</Text>
            <ScrollView>
              {ID_TYPE_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  style={[styles.opt, o.value === value && styles.optSel]}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optTxt, dark && { color: auth.text }]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </AuthField>
  );
}

const styles = StyleSheet.create({
  val: { fontFamily: fonts.sans, fontSize: 14, color: "#14201a", paddingVertical: 2 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "60%",
    padding: 16,
  },
  sheetDark: { backgroundColor: "#0c1830" },
  sheetTitle: { fontFamily: fonts.sansExtra, fontSize: 16, color: "#14201a", marginBottom: 12 },
  opt: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eef2ee" },
  optSel: { backgroundColor: "rgba(26,138,74,0.08)" },
  optTxt: { fontFamily: fonts.sans, fontSize: 14, color: "#14201a" },
});
