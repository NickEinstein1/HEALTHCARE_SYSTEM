import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthError, AuthHeader, AuthStepper } from "../../components/auth/AuthForm";
import { AuthGhostBtn, AuthPrimaryBtn } from "../../components/auth/AuthButtons";
import { PinInput } from "../../components/auth/PinInput";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "Mfa">;

export function MfaScreen({ navigation, route }: Props) {
  const { phone, flow, displayName } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendLeft, setResendLeft] = useState(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
    setTimeout(() => {
      setLoading(false);
      navigation.replace("AuthSuccess", { flow, displayName });
    }, 1200);
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

        <Text style={styles.note}>
          A 6-digit OTP was sent via SMS to {masked}
        </Text>

        <AuthError message={err} />
        <PinInput length={6} value={otp} onChange={setOtp} />

        <Pressable
          disabled={resendLeft > 0}
          onPress={() => setResendLeft(30)}
          style={{ marginTop: 12 }}
        >
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
  pad: { padding: 18 },
  note: { fontFamily: fonts.sans, fontSize: 12, color: "#5f776a", marginBottom: 14, lineHeight: 18 },
  resend: { fontFamily: fonts.sansBold, fontSize: 12, color: "#1a8a4a", textAlign: "center" },
});
