import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton } from "../components/ui/Buttons";
import { usePatient } from "../context/PatientContext";
import { CARE_TEAM } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Thread = { id: string; from: string; role: string; initials: string; preview: string; time: string; unread?: boolean };

const THREADS: Thread[] = [
  { id: "1", from: "Dr. James Mutuku", role: "Cardiologist · KNH", initials: "JM", preview: "Your potassium result needs a follow-up visit…", time: "2h", unread: true },
  { id: "2", from: "Sr. Faith Muthoni", role: "Nursing · KNH", initials: "FM", preview: "Reminder: fasting labs before 8am tomorrow.", time: "1d" },
];

export function MessagesScreen() {
  const { toast, summary } = usePatient();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const name = summary?.patient.given_name ?? "Patient";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        eyebrow="Secure messaging"
        title="Messages"
        subtitle="MyChart-style messaging with your care team (demo)."
      />
      <Panel title="Care team">
        {CARE_TEAM.map((c) => (
          <View key={c.name} style={styles.team}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{c.initials}</Text>
            </View>
            <View>
              <Text style={styles.teamName}>{c.name}</Text>
              <Text style={styles.teamRole}>{c.role}</Text>
            </View>
          </View>
        ))}
      </Panel>
      <Panel title="Inbox">
        {THREADS.map((t) => (
          <View key={t.id} style={styles.thread}>
            <View style={[styles.avatar, t.unread && styles.avatarUnread]}>
              <Text style={styles.avatarTxt}>{t.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadFrom}>{t.from}</Text>
              <Text style={styles.threadRole}>{t.role}</Text>
              <Text style={styles.preview} numberOfLines={2}>{t.preview}</Text>
            </View>
            <Text style={styles.time}>{t.time}</Text>
          </View>
        ))}
      </Panel>
      <Panel title={`Message Dr. Mutuku`}>
        {sent ? (
          <Text style={styles.sent}>✓ Message sent securely. Typical reply within 1 business day.</Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={`Hi, this is ${name}…`}
              placeholderTextColor={colors.t4}
              multiline
            />
            <PrimaryButton
              label="Send secure message"
              onPress={() => {
                if (!text.trim()) {
                  toast("Enter a message.");
                  return;
                }
                setSent(true);
                toast("Message sent to care team.");
              }}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  team: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  teamName: { fontFamily: fonts.sansExtra, fontSize: 13, color: colors.t1 },
  teamRole: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3 },
  thread: { flexDirection: "row", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.gl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gm,
  },
  avatarUnread: { borderColor: colors.g, borderWidth: 2 },
  avatarTxt: { fontFamily: fonts.sansExtra, fontSize: 12, color: colors.gd },
  threadFrom: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  threadRole: { fontFamily: fonts.sans, fontSize: 10, color: colors.t3 },
  preview: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.t2, marginTop: 4 },
  time: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3 },
  input: {
    minHeight: 88,
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 10,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.t1,
    backgroundColor: colors.bg,
    textAlignVertical: "top",
  },
  sent: { fontFamily: fonts.sans, fontSize: 13, color: colors.gd, lineHeight: 20 },
});
