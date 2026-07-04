import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthError, AuthField, AuthHeader, AuthStepper, authInputStyle } from "../../components/auth/AuthForm";
import { AuthGhostBtn, AuthPrimaryBtn } from "../../components/auth/AuthButtons";
import { IdTypePicker } from "../../components/auth/IdTypePicker";
import { requestPatientOtp } from "../../lib/auth";
import { config } from "../../lib/config";
import { FACILITIES, ID_TYPES, PHONE_RX, type IdTypeKey } from "../../lib/signInConfig";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Prefer not to say" },
];

export function RegisterScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [idType, setIdType] = useState<IdTypeKey>("national");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nhif, setNhif] = useState("");
  const [facility, setFacility] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFacility, setShowFacility] = useState(false);
  const [showGender, setShowGender] = useState(false);

  const ic = ID_TYPES[idType];

  const validateStep1 = () => {
    const e: string[] = [];
    if (!firstName.trim() || !lastName.trim()) e.push("Enter your full name.");
    const id = idNumber.replace(/\s/g, "");
    if (!id || !ic.rx.test(id)) e.push(ic.err);
    if (!dob.trim()) e.push("Date of birth is required (YYYY-MM-DD).");
    if (!gender) e.push("Select a gender.");
    if (!phone.replace(/[\s-]/g, "") || !PHONE_RX.test(phone.replace(/[\s-]/g, ""))) {
      e.push("Enter a valid Kenyan mobile number.");
    }
    if (!email.includes("@")) e.push("Enter a valid email address.");
    return e[0] ?? "";
  };

  const validateStep2 = () => {
    if (!/^\d{4}$/.test(pin)) return "PIN must be exactly 4 digits.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return "";
  };

  const submitStep1 = () => {
    const msg = validateStep1();
    if (msg) {
      setErr(msg);
      return;
    }
    setErr("");
    setStep(2);
  };

  const submitRegister = () => {
    const msg = validateStep2();
    if (msg) {
      setErr(msg);
      return;
    }
    setErr("");
    setLoading(true);
    const ph = phone.replace(/[\s-]/g, "");
    const pid = config.defaultPatientId;
    void (async () => {
      try {
        await requestPatientOtp(pid, ph);
        navigation.navigate("Mfa", {
          phone: ph,
          flow: "register",
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          patientId: pid,
          pin,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not send OTP");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <AuthShell variant="dark" showBrand={false}>
      <ScrollView style={styles.darkScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.pad}>
          <AuthStepper step={step === 1 ? 1 : 2} />
          <AuthHeader
            dark
            ico="🙋"
            title="Create Patient Account"
            subtitle="Register for UniHealth Patient 360"
            onBack={() => (step === 2 ? setStep(1) : navigation.navigate("Landing"))}
          />

          {step === 1 ? (
            <>
              <AuthField label="First Name" dark>
                <TextInput style={authInputStyle(true)} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="Last Name" dark>
                <TextInput style={authInputStyle(true)} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={auth.textDim} />
              </AuthField>
              <IdTypePicker value={idType} onChange={setIdType} dark />
              <AuthField label="ID Number" hint={ic.hint} dark>
                <TextInput style={authInputStyle(true)} value={idNumber} onChangeText={setIdNumber} placeholder={ic.ph} placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="Date of Birth" hint="YYYY-MM-DD" dark>
                <TextInput style={authInputStyle(true)} value={dob} onChangeText={setDob} placeholder="1990-01-15" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="Gender" dark>
                <Pressable onPress={() => setShowGender(true)}>
                  <View style={authInputStyle(true)}>
                    <Text style={styles.pickTxt}>{GENDERS.find((g) => g.value === gender)?.label ?? "Select gender"}</Text>
                  </View>
                </Pressable>
              </AuthField>
              <AuthField label="Mobile Number" dark>
                <TextInput style={authInputStyle(true)} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0712 345 678" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="Email" dark>
                <TextInput style={authInputStyle(true)} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="NHIF / SHA Number" hint="Optional" dark>
                <TextInput style={authInputStyle(true)} value={nhif} onChangeText={setNhif} placeholder="e.g. 123456789" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthField label="Preferred Facility" dark>
                <Pressable onPress={() => setShowFacility(true)}>
                  <View style={authInputStyle(true)}>
                    <Text style={styles.pickTxt}>{facility || "Select facility"}</Text>
                  </View>
                </Pressable>
              </AuthField>
              <AuthError message={err} dark />
              <AuthPrimaryBtn label="Continue" onPress={submitStep1} dark />
            </>
          ) : (
            <>
              <AuthField label="4-Digit UniHealth PIN" hint="Used for quick sign-in — keep private" dark>
                <TextInput
                  style={[authInputStyle(true), styles.pinCenter]}
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={auth.textDim}
                />
              </AuthField>
              <AuthField label="Password" hint="At least 8 characters" dark>
                <TextInput style={authInputStyle(true)} value={password} onChangeText={setPassword} secureTextEntry placeholder="Create password" placeholderTextColor={auth.textDim} />
              </AuthField>
              <AuthError message={err} dark />
              {loading ? (
                <ActivityIndicator color={auth.accent} style={{ marginTop: 12 }} />
              ) : (
                <AuthPrimaryBtn label="Create Account" onPress={submitRegister} dark />
              )}
            </>
          )}

          <AuthGhostBtn label="Already have an account? Sign In" onPress={() => navigation.navigate("SignIn")} accent />
        </View>
      </ScrollView>

      {showGender ? (
        <PickerOverlay
          title="Gender"
          options={GENDERS}
          onPick={(v) => {
            setGender(v);
            setShowGender(false);
          }}
          onClose={() => setShowGender(false)}
        />
      ) : null}
      {showFacility ? (
        <PickerOverlay
          title="Preferred facility"
          options={FACILITIES.map((f) => ({ value: f, label: f }))}
          onPick={(v) => {
            setFacility(v);
            setShowFacility(false);
          }}
          onClose={() => setShowFacility(false)}
        />
      ) : null}
    </AuthShell>
  );
}

function PickerOverlay({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {options.map((o) => (
          <Pressable key={o.value} style={styles.opt} onPress={() => onPick(o.value)}>
            <Text style={styles.optTxt}>{o.label}</Text>
          </Pressable>
        ))}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  darkScroll: { flex: 1 },
  pad: { padding: 18 },
  pickTxt: { fontFamily: fonts.sans, fontSize: 14, color: auth.text },
  pinCenter: { textAlign: "center", letterSpacing: 8, fontSize: 18 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0c1830",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "50%",
  },
  sheetTitle: { fontFamily: fonts.sansExtra, fontSize: 16, color: auth.text, marginBottom: 12 },
  opt: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: auth.border },
  optTxt: { fontFamily: fonts.sans, fontSize: 14, color: auth.text },
});
