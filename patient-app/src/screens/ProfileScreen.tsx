import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ChangePasswordModal } from "../components/profile/ChangePasswordModal";
import { ProfileField } from "../components/profile/ProfileField";
import { ToggleRow } from "../components/profile/ToggleRow";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Notice } from "../components/ui/Notice";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { api, type PatientProfile } from "../lib/api";
import { signOut } from "../lib/auth";
import { displayAflId } from "../lib/patientPortalData";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

type Props = { onSignOut: () => void };

const EMPTY: PatientProfile = {
  patient_id: "",
  given_name: "",
  family_name: "",
  email: "",
  phone: "",
  emergency_name: "",
  emergency_phone: "",
  preferred_language: "en",
  notify_sms: true,
  notify_email: true,
  notify_push: true,
  notify_appointments: true,
  notify_results: true,
  password_changes_used: 0,
  password_changes_remaining: 2,
  password_changes_allowed: 2,
  has_password: false,
};

export function ProfileScreen({ onSignOut }: Props) {
  const { patientId, summary, refresh, toast } = usePatient();
  const [profile, setProfile] = useState<PatientProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const aflId = displayAflId(patientId);
  const initials = useMemo(() => {
    const g = profile.given_name?.[0] ?? "";
    const f = profile.family_name?.[0] ?? "";
    return (g + f).toUpperCase() || "?";
  }, [profile.given_name, profile.family_name]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await api.patientProfile(patientId);
      setProfile(p);
      setDirty(false);
    } catch {
      const fallback = summary?.patient;
      setProfile({
        ...EMPTY,
        patient_id: patientId,
        given_name: fallback?.given_name ?? "Patience",
        family_name: fallback?.family_name ?? "Mutiso",
        email: "p.mutiso@example.com",
        phone: "0712345678",
        nhi_number: fallback ? undefined : undefined,
        gender: fallback?.gender ?? null,
        birth_date: fallback?.birth_date ? String(fallback.birth_date) : null,
        password_changes_remaining: 2,
        has_password: true,
      });
      toast("Profile loaded offline — save when API is available.");
    } finally {
      setLoading(false);
    }
  }, [patientId, summary?.patient, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.patientProfileUpdate(patientId, {
        given_name: profile.given_name,
        family_name: profile.family_name,
        email: profile.email,
        phone: profile.phone,
        emergency_name: profile.emergency_name,
        emergency_phone: profile.emergency_phone,
        preferred_language: profile.preferred_language,
        notify_sms: profile.notify_sms,
        notify_email: profile.notify_email,
        notify_push: profile.notify_push,
        notify_appointments: profile.notify_appointments,
        notify_results: profile.notify_results,
      });
      setProfile(updated);
      setDirty(false);
      toast("Profile saved successfully.");
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const securityAction = async (label: string, type: string) => {
    try {
      await api.uiAction({ role: "patient", patient_id: patientId, label, type });
    } catch {
      /* offline ok */
    }
    toast(label);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.g} size="large" />
        <Text style={styles.loadingTxt}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <>
      <AnimatedScrollScreen>
        <ScreenIntro
          text="Personal details, contacts, notification preferences, and account security."
          accent
        />

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>
              {profile.given_name} {profile.family_name}
            </Text>
            <Text style={styles.heroSub}>{aflId}</Text>
            <View style={styles.tagRow}>
              <Tag label="Patient 360" tone="green" />
              {dirty ? <Tag label="Unsaved" tone="amber" /> : <Tag label="Synced" tone="blue" />}
            </View>
          </View>
        </View>

        <Panel title="Personal details" subtitle="Editable — synced to your FHIR Patient record">
          <ProfileField label="First name" value={profile.given_name} onChangeText={(v) => patch("given_name", v)} />
          <ProfileField label="Last name" value={profile.family_name} onChangeText={(v) => patch("family_name", v)} />
          <ProfileField
            label="UniHealth patient ID"
            value={patientId}
            editable={false}
            hint="Assigned by the national registry — cannot be changed"
          />
          <ProfileField
            label="AFL member ID"
            value={aflId}
            editable={false}
          />
          <ProfileField
            label="Gender"
            value={profile.gender ?? summary?.patient?.gender ?? "—"}
            editable={false}
          />
          <ProfileField
            label="Date of birth"
            value={String(profile.birth_date ?? summary?.patient?.birth_date ?? "—")}
            editable={false}
          />
          {profile.nhi_number ? (
            <ProfileField label="NHI number" value={profile.nhi_number} editable={false} />
          ) : null}
        </Panel>

        <Panel title="Contact details">
          <ProfileField
            label="Primary phone"
            value={profile.phone}
            onChangeText={(v) => patch("phone", v)}
            keyboardType="phone-pad"
            placeholder="+254…"
          />
          <ProfileField
            label="Email address"
            value={profile.email}
            onChangeText={(v) => patch("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ProfileField
            label="Emergency contact name"
            value={profile.emergency_name}
            onChangeText={(v) => patch("emergency_name", v)}
          />
          <ProfileField
            label="Emergency contact phone"
            value={profile.emergency_phone}
            onChangeText={(v) => patch("emergency_phone", v)}
            keyboardType="phone-pad"
          />
        </Panel>

        <Panel title="Notification preferences" subtitle="How UniHealth reaches you" noPadding>
          <ToggleRow
            label="SMS alerts"
            subtitle="Appointments, results, and billing"
            value={profile.notify_sms}
            onValueChange={(v) => patch("notify_sms", v)}
          />
          <ToggleRow
            label="Email"
            subtitle="Summaries and consent updates"
            value={profile.notify_email}
            onValueChange={(v) => patch("notify_email", v)}
          />
          <ToggleRow
            label="Push notifications"
            subtitle="This device"
            value={profile.notify_push}
            onValueChange={(v) => patch("notify_push", v)}
          />
          <ToggleRow
            label="Appointment reminders"
            value={profile.notify_appointments}
            onValueChange={(v) => patch("notify_appointments", v)}
          />
          <ToggleRow
            label="New results"
            value={profile.notify_results}
            onValueChange={(v) => patch("notify_results", v)}
          />
        </Panel>

        <Panel title="Security & access" subtitle="Password, PIN, and sessions">
          <Notice
            icon="🔐"
            title="Active session"
            body="Signed in to Patient 360 · TLS encrypted · Session ends after 30 minutes of inactivity."
            tone="green"
          />
          <View style={styles.secRow}>
            <Text style={styles.secLbl}>Portal password changes</Text>
            <Text style={styles.secVal}>
              {profile.password_changes_used} of {profile.password_changes_allowed} used ·{" "}
              {profile.password_changes_remaining} remaining
            </Text>
          </View>
          <PrimaryButton
            label={
              profile.password_changes_remaining > 0
                ? "Change password"
                : "Password change limit reached"
            }
            onPress={() => setPwdOpen(true)}
            disabled={profile.password_changes_remaining <= 0}
            style={{ marginTop: 12 }}
          />
          <Text style={styles.pwdHint}>
            You must enter your current password. A maximum of two password changes is allowed per account.
          </Text>
          <View style={styles.secActions}>
            <SecondaryButton
              label="Change PIN"
              onPress={() =>
                void securityAction(
                  "PIN change flow started — OTP sent to your registered phone.",
                  "change_pin",
                )
              }
              style={styles.secBtn}
            />
            <SecondaryButton
              label="Sign out all devices"
              onPress={() =>
                void securityAction("All other sessions signed out.", "signout_all")
              }
              style={styles.secBtn}
            />
          </View>
        </Panel>

        <Panel title="Account">
          <PrimaryButton
            label={saving ? "Saving…" : dirty ? "Save changes" : "Save changes"}
            onPress={() => void save()}
            disabled={saving || !dirty}
          />
          <SecondaryButton
            label="Sign out"
            onPress={async () => {
              await signOut();
              onSignOut();
            }}
            style={{ marginTop: 12, alignSelf: "flex-start" }}
          />
          <Text style={styles.caption}>Sign out clears this device’s session (same as the web portal).</Text>
        </Panel>
      </AnimatedScrollScreen>

      <ChangePasswordModal
        visible={pwdOpen}
        patientId={patientId}
        changesRemaining={profile.password_changes_remaining}
        onClose={() => setPwdOpen(false)}
        onSuccess={(remaining) => {
          setProfile((p) => ({
            ...p,
            password_changes_remaining: remaining,
            password_changes_used: p.password_changes_allowed - remaining,
          }));
          toast("Password updated successfully.");
        }}
        onError={() => {}}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  loadingTxt: { fontFamily: fonts.sans, fontSize: 13, color: colors.t3, marginTop: 12 },
  hero: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginBottom: 18,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.bdr,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.gl,
    borderWidth: 1,
    borderColor: colors.gm,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontFamily: fonts.serif, fontSize: 22, color: colors.gd },
  heroName: { fontFamily: fonts.serif, fontSize: 20, color: colors.gd },
  heroSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginTop: 4 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  secRow: { marginTop: 8 },
  secLbl: { fontFamily: fonts.sansExtra, fontSize: 11, color: colors.t3, textTransform: "uppercase" },
  secVal: { fontFamily: fonts.sans, fontSize: 13, color: colors.t1, marginTop: 4 },
  pwdHint: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 10, lineHeight: 16 },
  secActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  secBtn: { flexGrow: 1, minWidth: "46%" },
  caption: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 10, lineHeight: 16 },
});
