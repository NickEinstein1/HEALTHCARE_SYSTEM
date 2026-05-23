import { StyleSheet, Text, View } from "react-native";
import { TagTone, tagStyles } from "../../theme/colors";

export function Tag({ label, tone = "green" }: { label: string; tone?: TagTone }) {
  const s = tagStyles[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.text, { color: s.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  text: { fontSize: 10, fontWeight: "800" },
});
