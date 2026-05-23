import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthShell } from "../../components/auth/AuthShell";
import {
  AuthError,
  AuthField,
  AuthHeader,
  AuthHint,
  AuthStepper,
  authInputStyle,
} from "../../components/auth/AuthForm";
import { AuthAltBtn, AuthGhostBtn, AuthOrLine, AuthPrimaryBtn } from "../../components/auth/AuthButtons";
import { IdTypePicker } from "../../components/auth/IdTypePicker";
import { PinInput } from "../../components/auth/PinInput";
import { ID_TYPES, PATIENT_ROLE, PHONE_RX, type IdTypeKey } from "../../lib/signInConfig";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn">;

export function PatientSignInScreen({ navigation }: Props) {
  const c = PATIENT_ROLE;
  const [idType, setIdType] = useState<IdTypeKey>("national");
  const [patId, setPatId] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const ic = ID_TYPES[idType];

  useEffect(() => {
    setPatId("");
  }, [idType]);

  const submit = () => {
    setErr("");
    const id = patId.replace(/\s/g, "");
    const pinStr = pin.join("");
    const ph = phone.replace(/[\s-]/g, "");
    if (!id || !ic.rx.test(id)) {
      setErr(ic.err);
      return;
    }
    if (pinStr.length < 4) {
      setErr("Enter your complete 4-digit UniHealth PIN.");
      return;
    }
    if (!ph || !PHONE_RX.test(ph)) {
      setErr("Enter your registered mobile phone number (e.g. 0712 345 678).");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate("Mfa", { phone: ph, flow: "signIn" });
    }, 1200);
  };

  const stubAlt = () => {
    const ph = phone.replace(/[\s-]/g, "") || "0712345678";
    navigation.navigate("Mfa", { phone: ph, flow: "signIn" });
  };

  return (
    <AuthShell
      footer={
        <AuthGhostBtn
          label="Don't have an account? Create Account"
          onPress={() => navigation.navigate("Register")}
        />
      }
    >
      <View style={styles.pad}>
        <AuthStepper step={2} />
        <AuthHeader ico={c.ico} title={c.title} subtitle={c.sub} onBack={() => navigation.navigate("Landing")} />
        <AuthHint ico="🏛️" head={c.noteHead} sub={c.noteBody} />
        <AuthError message={err} />

        <IdTypePicker value={idType} onChange={setIdType} />
        <AuthField label={ic.lbl} hint={ic.hint} error={err && !patId ? ic.err : undefined}>
          <TextInput
            style={authInputStyle()}
            value={patId}
            onChangeText={setPatId}
            placeholder={ic.ph}
            placeholderTextColor="#9bb0a5"
            autoCapitalize="none"
            keyboardType={idType === "national" ? "number-pad" : "default"}
          />
        </AuthField>

        <AuthField
          label="4-Digit UniHealth PIN"
          hint="The 4-digit PIN you set when registering"
          right={
            <Pressable>
              <Text style={styles.forgot}>Forgot PIN?</Text>
            </Pressable>
          }
        >
          <PinInput length={4} value={pin} onChange={setPin} />
        </AuthField>

        <AuthField label="Registered Phone Number" hint="Phone linked to your Patient Portal account">
          <TextInput
            style={authInputStyle()}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 0712 345 678"
            placeholderTextColor="#9bb0a5"
            keyboardType="phone-pad"
          />
        </AuthField>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 12 }} color="#1a8a4a" />
        ) : (
          <AuthPrimaryBtn label="Verify with UniHealth" onPress={submit} />
        )}

        <AuthOrLine />
        <View style={styles.altRow}>
          <AuthAltBtn label="👁️ Biometric" onPress={stubAlt} />
          <AuthAltBtn label="📱 Practice 360" onPress={stubAlt} />
          <AuthAltBtn
            label="📞 *147# USSD"
            onPress={() => Alert.alert("USSD", "Dial *147# on your UniHealth-registered phone to verify via USSD.")}
          />
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 18 },
  forgot: { fontFamily: fonts.sans, fontSize: 11, color: "#1a8a4a" },
  altRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
});
