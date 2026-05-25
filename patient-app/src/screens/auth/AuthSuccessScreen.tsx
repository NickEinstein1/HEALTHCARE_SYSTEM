import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthShell } from "../../components/auth/AuthShell";
import { AuthPrimaryBtn, AuthGhostBtn } from "../../components/auth/AuthButtons";
import { PATIENT_ROLE } from "../../lib/signInConfig";
import { config } from "../../lib/config";
import { signInPatient } from "../../lib/auth";
import { setPatientId } from "../../lib/storage";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

type Props = NativeStackScreenProps<AuthStackParamList, "AuthSuccess"> & {
  onSignedIn: () => void;
};

export function AuthSuccessScreen({ navigation, route, onSignedIn }: Props) {
  const c = PATIENT_ROLE;
  const { flow, displayName } = route.params;
  const [launching, setLaunching] = useState(false);

  const launch = async () => {
    setLaunching(true);
    try {
      const pid = config.defaultPatientId;
      await setPatientId(pid);
      await signInPatient(pid);
      onSignedIn();
    } finally {
      setLaunching(false);
    }
  };

  const isRegister = flow === "register";

  return (
    <AuthShell showBrand={false}>
      <View style={styles.pad}>
        <Text style={styles.ring}>✅</Text>
        <Text style={styles.title}>{isRegister ? "Account created!" : "Access Granted"}</Text>
        <Text style={styles.sub}>
          {isRegister
            ? `Welcome to UniHealth${displayName ? `, ${displayName}` : ""}. You can sign in now and book your first appointment.`
            : c.successMsg}
        </Text>

        <View style={styles.card}>
          <Text style={styles.ico}>{c.ico}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.role}>{c.successRole}</Text>
            <Text style={styles.sec}>UniHealth verified · Session secured</Text>
          </View>
        </View>

        <View style={styles.session}>
          <Text style={styles.sessionTxt}>
            Session expires in 30 minutes of inactivity (KDPA policy). TLS encrypted · audit log active.
          </Text>
        </View>

        {launching ? (
          <ActivityIndicator color="#1a8a4a" style={{ marginTop: 16 }} />
        ) : (
          <AuthPrimaryBtn
            label={isRegister ? "Sign In & Open Patient 360" : "Launch Patient 360 →"}
            onPress={launch}
          />
        )}

        {isRegister ? (
          <AuthGhostBtn label="Back to home" onPress={() => navigation.navigate("Landing")} />
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, alignItems: "center" },
  ring: { fontSize: 48, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: "#14201a", textAlign: "center" },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: "#5f776a", textAlign: "center", marginTop: 10, lineHeight: 20 },
  card: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(61,142,248,0.08)",
    borderWidth: 1,
    borderColor: "rgba(61,142,248,0.22)",
    width: "100%",
  },
  ico: { fontSize: 28 },
  role: { fontFamily: fonts.sansExtra, fontSize: 13, color: auth.patientBlue },
  sec: { fontFamily: fonts.sans, fontSize: 11, color: "#5f776a", marginTop: 4 },
  session: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f4f7f4",
    borderRadius: 8,
    width: "100%",
  },
  sessionTxt: { fontFamily: fonts.sans, fontSize: 11, color: "#5f776a", lineHeight: 16 },
});
