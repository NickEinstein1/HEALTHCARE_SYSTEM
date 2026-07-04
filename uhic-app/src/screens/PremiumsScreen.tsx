import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { Notice } from "../components/ui/Notice";
import { useUhic } from "../context/UhicContext";
import { api } from "../lib/api";
import { fmtKes } from "../lib/format";
import type { UhicPremiumQuote } from "../types/uhic";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function PremiumsScreen() {
  const { loading, refresh, toast } = useUhic();
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<UhicPremiumQuote | null>(null);
  const [form, setForm] = useState({
    scheme_type: "SHIF",
    gross_salary_kes: "45000",
    age: "35",
    base_rate_kes: "3500",
    occupation_class: "2",
    prior_claims_count: "0",
    prior_claims_amount_kes: "0",
  });

  const runQuote = async () => {
    setBusy(true);
    try {
      const res = await api.uhicPremiumQuote({
        scheme_type: form.scheme_type,
        gross_salary_kes: Number(form.gross_salary_kes),
        age: Number(form.age),
        base_rate_kes: Number(form.base_rate_kes),
        occupation_class: form.occupation_class,
        prior_claims_count: Number(form.prior_claims_count),
        prior_claims_amount_kes: Number(form.prior_claims_amount_kes),
      });
      setQuote(res);
      toast(`Quote: ${fmtKes(res.monthly_contribution_kes ?? res.monthly_premium_kes ?? 0)}/month`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <Panel title="Premium / SHIF Quote" subtitle="Actuarial contribution & risk-rated premium">
        <Field label="Scheme" value={form.scheme_type} onChange={(v) => setForm((f) => ({ ...f, scheme_type: v }))} />
        <Field label="Gross salary (KES)" value={form.gross_salary_kes} onChange={(v) => setForm((f) => ({ ...f, gross_salary_kes: v }))} keyboard="numeric" />
        <Field label="Age" value={form.age} onChange={(v) => setForm((f) => ({ ...f, age: v }))} keyboard="numeric" />
        <Field label="Base rate (private)" value={form.base_rate_kes} onChange={(v) => setForm((f) => ({ ...f, base_rate_kes: v }))} keyboard="numeric" />
        <Pressable style={styles.btn} onPress={() => void runQuote()} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.w} /> : <Text style={styles.btnText}>Calculate Quote</Text>}
        </Pressable>
      </Panel>

      {quote ? (
        <Notice icon="💰" title={`${quote.scheme_type} quote`}>
          Monthly {fmtKes(quote.monthly_contribution_kes ?? quote.monthly_premium_kes ?? 0)}
          {quote.rate != null ? ` · SHIF rate ${(quote.rate * 100).toFixed(2)}%` : ""}
          {quote.age_factor != null ? ` · Age factor ${quote.age_factor}` : ""}
        </Notice>
      ) : null}

      <Panel title="National SHIF Contributions" subtitle="Formal payroll · informal means-testing">
        <Text style={styles.formula}>
          Formal: clamp(2.75% × gross salary, Ksh 300, Ksh 9,000)
        </Text>
        <Text style={styles.body}>
          Informal: graduated means-testing by declared monthly income. M-Pesa/USSD collection · payroll batch ·
          KRA iTax remittance (9th of month) · universal household membership under SHA.
        </Text>
      </Panel>

      <Panel title="Private Risk Rating">
        <Text style={styles.body}>
          Premium = base_rate × age_factor × occupation_factor × claims_history_factor. Underwriting factors align to
          occupation class and prior claims experience per UniHealth Insurance Cover 2.0.
        </Text>
      </Panel>
    </ScreenScroll>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: "numeric" | "default";
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholderTextColor={colors.t4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t3, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.t1,
    backgroundColor: colors.mesh2,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.violetDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.w },
  formula: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.violetDark, marginBottom: 8 },
  body: { fontFamily: fonts.sans, fontSize: 12, color: colors.t2, lineHeight: 18 },
});
