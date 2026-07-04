import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthError, AuthHeader, AuthStepper } from "../../components/auth/AuthForm";
import { AuthGhostBtn, AuthPrimaryBtn } from "../../components/auth/AuthButtons";
import { PinInput } from "../../components/auth/PinInput";
import { completePatientMfa, requestPatientOtp } from "../../lib/auth";
import { config } from "../../lib/config";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Mfa">;

export function MfaScreen({ navigation, route }: Props) {
  const { phone, flow, displayName, patientId, pin } = route.params;
  const pid = patientId || config.defaultPatientId;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendLeft, setResendLeft] = useState(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");

  const masked = phone.length > 6 ? `${phone.slice(0, 4)}•••${phone.slice(-2)}` : phone;

  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendLeft]);

  const verify = () => {
    if (!otp.every((d) => d.length === 1)) {
      setErr("Enter the complete 6-digit OTP.");
      return;
    }
    setErr("");
    setLoading(true);
    void (async () => {
      try {
        await completePatientMfa({
          patientId: pid,
          phone,
          code: otp.join(""),
          pin,
        });
        navigation.replace("AuthSuccess", { flow, displayName, patientId: pid });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "OTP verification failed");
      } finally {
        setLoading(false);
      }
    })();
  };

  const resend = () => {
    setResendLeft(30);
    void (async () => {
      try {
        const res = await requestPatientOtp(pid, phone);
        if (res.debug_otp && __DEV__) {
          setHint(`Dev OTP: ${res.debug_otp}`);
        } else {
          setHint("A new OTP was sent.");
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Resend failed");
      }
    })();
  };

  return (
    <AuthShell
      footer={
        <AuthGhostBtn
          label={flow === "register" ? "Back to registration" : "Back to sign in"}
          onPress={() => navigation.goBack()}
        />
      }
    >
      <View style={styles.pad}>
        <AuthStepper step={3} />
        <AuthHeader
          ico="🔐"
          title="Verify your identity"
          subtitle="Step 3 of 3 — Multi-factor authentication"
          onBack={() => navigation.goBack()}
        />

        <Text style={styles.note}>A 6-digit OTP was sent via SMS to {masked}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <AuthError message={err} />
        <PinInput length={6} value={otp} onChange={setOtp} />

        <Pressable disabled={resendLeft > 0} onPress={resend} style={{ marginTop: 12 }}>
          <Text style={[styles.resend, resendLeft > 0 && { opacity: 0.5 }]}>
            {resendLeft > 0 ? `Resend OTP in ${resendLeft}s` : "Resend OTP"}
          </Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#1a8a4a" style={{ marginTop: 16 }} />
        ) : (
          <AuthPrimaryBtn label="Verify OTP" onPress={verify} />
        )}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24 },
  note: { fontFamily: fonts.sans, fontSize: 13, color: "#5f776a", marginBottom: 12, lineHeight: 20 },
  hint: { fontFamily: fonts.mono, fontSize: 11, color: "#0a4a26", marginBottom: 8 },
  resend: { fontFamily: fonts.sansBold, fontSize: 12, color: "#1a8a4a" },
});
