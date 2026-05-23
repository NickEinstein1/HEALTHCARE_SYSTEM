import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../../theme/authTheme";
import { fonts } from "../../theme/typography";

export function AuthStepper({ step }: { step: 1 | 2 | 3 }) {
  const dots = [1, 2, 3] as const;
  return (
    <View style={styles.stepper}>
      {dots.map((n, i) => (
        <View key={n} style={styles.stepRow}>
          <View style={[styles.dot, n < step && styles.dotDone, n === step && styles.dotAct]}>
            <Text style={[styles.dotTxt, (n <= step) && styles.dotTxtOn]}>{n < step ? "✓" : n}</Text>
          </View>
          {i < 2 ? <View style={[styles.line, n < step && styles.lineDone]} /> : null}
        </View>
      ))}
    </View>
  );
}

export function AuthHeader({
  ico,
  title,
  subtitle,
  onBack,
  dark,
}: {
  ico: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  dark?: boolean;
}) {
  return (
    <>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back}>
          <Text style={[styles.backTxt, dark && { color: auth.textMuted }]}>← Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.hdr}>
        <Text style={styles.ico}>{ico}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, dark && { color: auth.text }]}>{title}</Text>
          <Text style={[styles.sub, dark && { color: auth.textMuted }]}>{subtitle}</Text>
        </View>
      </View>
    </>
  );
}

export function AuthHint({ ico, head, sub, tone = "blue", dark }: { ico: string; head: string; sub: string; tone?: "blue" | "green"; dark?: boolean }) {
  const bg = tone === "green" ? "rgba(0,229,160,0.08)" : "rgba(61,142,248,0.08)";
  const bd = tone === "green" ? "rgba(0,229,160,0.22)" : "rgba(61,142,248,0.22)";
  return (
    <View style={[styles.hint, { backgroundColor: bg, borderColor: bd }, dark && styles.hintDark]}>
      <Text style={styles.hintIco}>{ico}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.hintHead, dark && { color: auth.text }]}>{head}</Text>
        <Text style={[styles.hintSub, dark && { color: auth.textMuted }]}>{sub}</Text>
      </View>
    </View>
  );
}

export function AuthError({ message, dark }: { message: string; dark?: boolean }) {
  if (!message) return null;
  return (
    <View style={[styles.err, dark && styles.errDark]}>
      <Text style={styles.errTxt}>⚠️ {message}</Text>
    </View>
  );
}

export function AuthField({
  label,
  hint,
  error,
  children,
  dark,
  right,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  dark?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.lblRow}>
        <Text style={[styles.lbl, dark && { color: auth.textMuted }]}>{label}</Text>
        {right}
      </View>
      {children}
      {hint && !error ? <Text style={[styles.fhint, dark && { color: auth.textDim }]}>{hint}</Text> : null}
      {error ? <Text style={styles.ferr}>{error}</Text> : null}
    </View>
  );
}

export function authInputStyle(dark?: boolean) {
  return [
    styles.input,
    dark && styles.inputDark,
  ];
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  stepRow: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#dde3dd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dotDone: { borderColor: "#1a8a4a", backgroundColor: "#e6f5ed" },
  dotAct: { borderColor: "#1a8a4a", backgroundColor: "#1a8a4a" },
  dotTxt: { fontSize: 10, fontWeight: "700", color: "#5f776a" },
  dotTxtOn: { color: "#fff" },
  line: { width: 32, height: 2, backgroundColor: "#dde3dd" },
  lineDone: { backgroundColor: "#1a8a4a" },
  back: { marginBottom: 8 },
  backTxt: { fontFamily: fonts.sansBold, fontSize: 13, color: "#31463a" },
  hdr: { flexDirection: "row", gap: 10, marginBottom: 14 },
  ico: { fontSize: 28 },
  title: { fontFamily: fonts.sansExtra, fontSize: 17, color: "#14201a" },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: "#5f776a", marginTop: 2, lineHeight: 17 },
  hint: {
    flexDirection: "row",
    gap: 10,
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  hintDark: { backgroundColor: "rgba(61,142,248,0.12)" },
  hintIco: { fontSize: 16 },
  hintHead: { fontFamily: fonts.sansExtra, fontSize: 12, color: "#14201a" },
  hintSub: { fontFamily: fonts.sans, fontSize: 11, color: "#5f776a", marginTop: 2 },
  err: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errDark: { backgroundColor: "rgba(255,51,102,0.1)", borderColor: "rgba(255,51,102,0.3)" },
  errTxt: { fontFamily: fonts.sans, fontSize: 12, color: "#7f1d1d" },
  field: { marginBottom: 12 },
  lblRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  lbl: {
    fontFamily: fonts.sansExtra,
    fontSize: 10,
    color: "#5f776a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fhint: { fontFamily: fonts.sans, fontSize: 11, color: "#9bb0a5", marginTop: 4 },
  ferr: { fontFamily: fonts.sans, fontSize: 11, color: auth.err, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: "#dde3dd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: "#14201a",
    backgroundColor: "#f4f7f4",
  },
  inputDark: {
    backgroundColor: auth.inputBg,
    borderColor: auth.border,
    color: auth.text,
  },
});
