import { useCallback, useEffect, useState } from "react";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { api } from "../lib/api";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function AppointmentsScreen() {
  const { patientId, summary, toast } = usePatient();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [facility, setFacility] = useState("KNH Nairobi");
  const [dept, setDept] = useState("Cardiology");
  const [time, setTime] = useState("09:00");
  const [slots, setSlots] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await api.appointments(patientId);
      setRows(list);
    } catch {
      setRows([]);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!bookOpen) return;
    api.appointmentSlots(date, facility, dept)
      .then((r) => setSlots(r.available))
      .catch(() => setSlots(["08:00", "09:00", "10:00", "14:00", "15:00"]));
  }, [bookOpen, date, facility, dept]);

  const book = async () => {
    try {
      const name = summary?.patient
        ? `${summary.patient.given_name ?? ""} ${summary.patient.family_name ?? ""}`.trim()
        : patientId;
      await api.appointmentCreate({
        patient_id: patientId,
        patient_name: name,
        facility,
        department: dept,
        date,
        time,
        booked_by: "patient",
      });
      toast(`Booked ${date} ${time}`);
      setBookOpen(false);
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Booking failed");
    }
  };

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Book, view, and cancel appointments — same API as the web portal." />
      <PrimaryButton label="+ Book appointment" onPress={() => setBookOpen(true)} style={{ marginBottom: 14 }} />

      <Panel title="Your appointments" noPadding>
        {rows.length === 0 ? (
          <Text style={styles.empty}>No appointments yet.</Text>
        ) : (
          rows.map((r) => (
            <View key={String(r.id)} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTi}>
                  {String(r.department)} · {String(r.facility)}
                </Text>
                <Text style={styles.rowSu}>
                  {String(r.date)} {String(r.time)}
                </Text>
              </View>
              <Tag label={String(r.status ?? "pending")} tone="amber" />
              {String(r.status) === "pending" ? (
                <SecondaryButton
                  label="Cancel"
                  onPress={async () => {
                    await api.appointmentCancel(String(r.id), "Patient app");
                    toast("Cancelled");
                    void load();
                  }}
                  style={{ marginLeft: 8 }}
                />
              ) : null}
            </View>
          ))
        )}
      </Panel>

      <Modal visible={bookOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTi}>Book appointment</Text>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} />
            <Text style={styles.label}>Facility</Text>
            <TextInput style={styles.input} value={facility} onChangeText={setFacility} />
            <Text style={styles.label}>Department</Text>
            <TextInput style={styles.input} value={dept} onChangeText={setDept} />
            <Text style={styles.label}>Time</Text>
            <View style={styles.slotRow}>
              {slots.map((s) => (
                <SecondaryButton
                  key={s}
                  label={s}
                  onPress={() => setTime(s)}
                  style={time === s ? { borderColor: colors.g } : undefined}
                />
              ))}
            </View>
            <View style={styles.modalFt}>
              <SecondaryButton label="Close" onPress={() => setBookOpen(false)} />
              <PrimaryButton label="Confirm" onPress={book} />
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 16, fontFamily: fonts.sans, fontSize: 12, color: colors.t3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.bdr,
  },
  rowTi: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  rowSu: { fontFamily: fonts.mono, fontSize: 11, color: colors.t3, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: "rgba(2,6,23,0.45)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.bdr,
  },
  modalTi: { fontFamily: fonts.serif, fontSize: 20, color: colors.t1, marginBottom: 12 },
  label: { fontFamily: fonts.sansExtra, fontSize: 10, color: colors.t3, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.bdr,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    fontFamily: fonts.sans,
    color: colors.t1,
    backgroundColor: colors.bg,
  },
  slotRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  modalFt: { flexDirection: "row", gap: 10, marginTop: 16, justifyContent: "flex-end" },
});
