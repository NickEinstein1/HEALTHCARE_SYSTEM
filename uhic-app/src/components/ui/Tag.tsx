import { StyleSheet, Text, View } from "react-native";
import { TagTone, tagStyles } from "../../theme/colors";

const toneMap: Record<string, TagTone> = {
  green: "green",
  amber: "amber",
  red: "red",
  violet: "violet",
  teal: "teal",
  grey: "grey",
};

export function Tag({ label, tone = "violet" }: { label: string; tone?: TagTone | string }) {
  const resolved = toneMap[tone] ?? "grey";
  const s = tagStyles[resolved];
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
