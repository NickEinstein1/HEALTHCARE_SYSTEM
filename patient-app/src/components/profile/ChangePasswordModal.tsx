import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";
import { ProfileField } from "./ProfileField";
import { api } from "../../lib/api";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

const MIN_LEN = 8;

type Props = {
  visible: boolean;
  patientId: string;
  changesRemaining: number;
  onClose: () => void;
  onSuccess: (remaining: number) => void;
  onError: (msg: string) => void;
};

export function ChangePasswordModal({
  visible,
  patientId,
  changesRemaining,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setLocalErr("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setLocalErr("");
    if (changesRemaining <= 0) {
      setLocalErr("You have used all allowed password changes. Contact UniHealth support.");
      return;
    }
    if (!current.trim()) {
      setLocalErr("Enter your current password.");
      return;
    }
    if (next.length < MIN_LEN) {
      setLocalErr(`New password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (next !== confirm) {
      setLocalErr("New password and confirmation do not match.");
      return;
    }
    if (next === current) {
      setLocalErr("New password must be different from your current password.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.changePassword(patientId, {
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });
      reset();
      onSuccess(res.password_changes_remaining);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Password change failed";
      setLocalErr(msg.replace(/^\d+\s*—?\s*/, ""));
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.sub}>
            For your security, enter your current password. You may change your portal password{" "}
            {changesRemaining} more time{changesRemaining === 1 ? "" : "s"} on this account.
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ProfileField
              label="Current password"
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Required"
            />
            <ProfileField
              label="New password"
              value={next}
              onChangeText={setNext}
              secureTextEntry
              autoCapitalize="none"
              hint={`Minimum ${MIN_LEN} characters`}
            />
            <ProfileField
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
            />
            {localErr ? <Text style={styles.err}>⚠️ {localErr}</Text> : null}
            {busy ? <ActivityIndicator color={colors.g} style={{ marginVertical: 12 }} /> : null}
            <PrimaryButton label={busy ? "Updating…" : "Update password"} onPress={() => void submit()} disabled={busy} />
            <SecondaryButton label="Cancel" onPress={close} style={{ marginTop: 10 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(6,21,16,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bdr,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.gd },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  err: { fontFamily: fonts.sans, fontSize: 12, color: colors.r, marginBottom: 12 },
});
