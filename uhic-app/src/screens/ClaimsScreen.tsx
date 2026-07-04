import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Panel } from "../components/ui/Panel";
import { ScreenScroll } from "../components/ScreenScroll";
import { SyncBadge } from "../components/SyncBadge";
import { Tag } from "../components/ui/Tag";
import { useUhic } from "../context/UhicContext";
import { api } from "../lib/api";
import { claimStatusTone, fmtKes, fraudTone } from "../lib/format";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

export function ClaimsScreen() {
  const { claims, loading, refresh, toast, syncVersion, lastSyncAt, syncing } = useUhic();
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    member_id: "UHIC-M-0001",
    patient_id: "P001",
    encounter_id: "ENC-P001-NEW",
    provider_id: "FAC-A",
    scheme_type: "SHIF",
    submitted_amount_kes: "8500",
  });

  const submitClaim = async () => {
    if (!form.encounter_id.trim()) {
      toast("Encounter ID required — claims must link to clinical encounter.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.uhicSubmitClaim({
        ...form,
        submitted_amount_kes: Number(form.submitted_amount_kes),
      });
      toast(`Claim ${res.claim.claim_id} · fraud ${res.claim.fraud_score}`);
      setShowForm(false);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (claimId: string, decision: string) => {
    setBusy(true);
    try {
      await api.uhicDecideClaim(claimId, { decision, note: "UHIC mobile review" });
      toast(`Claim ${claimId} ${decision}d`);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll refreshing={loading} onRefresh={() => void refresh()}>
      <SyncBadge syncVersion={syncVersion} syncing={syncing} lastSyncAt={lastSyncAt} />
      <Pressable style={styles.btn} onPress={() => setShowForm((v) => !v)}>
        <Text style={styles.btnText}>{showForm ? "Hide form" : "Submit claim"}</Text>
      </Pressable>

      {showForm ? (
        <Panel title="New claim" subtitle="encounter_id FK required">
          {(["member_id", "patient_id", "encounter_id", "provider_id", "scheme_type", "submitted_amount_kes"] as const).map((k) => (
            <View key={k} style={{ marginBottom: 8 }}>
              <Text style={styles.label}>{k}</Text>
              <TextInput
                style={styles.input}
                value={form[k]}
                onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))}
                placeholderTextColor={colors.t4}
              />
            </View>
          ))}
        <Pressable style={styles.btnPrimary} onPress={() => void submitClaim()} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.w} /> : <Text style={styles.btnTextPrimary}>Submit</Text>}
        </Pressable>
        </Panel>
      ) : null}

      <Panel title="Claims queue" subtitle="Structural binding to clinical.encounters">
        {claims.map((c) => (
          <View key={c.claim_id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.id}>{c.claim_id}</Text>
              <Text style={styles.meta}>
                {c.encounter_id} · {fmtKes(c.submitted_amount_kes)}
              </Text>
              <View style={styles.tags}>
                <Tag label={c.status} tone={claimStatusTone(c.status)} />
                <Tag label={`Fraud ${c.fraud_score}`} tone={fraudTone(c.fraud_band)} />
              </View>
            </View>
            {c.status === "submitted" || c.status === "flagged" ? (
              <View style={styles.actions}>
                <Pressable onPress={() => void decide(c.claim_id, "approve")} disabled={busy}>
                  <Text style={styles.approve}>Approve</Text>
                </Pressable>
                <Pressable onPress={() => void decide(c.claim_id, "reject")} disabled={busy}>
                  <Text style={styles.reject}>Reject</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </Panel>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.violetLight,
    borderWidth: 1,
    borderColor: colors.violetMid,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  btnPrimary: {
    backgroundColor: colors.violetDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.violetDark },
  btnTextPrimary: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.w },
  label: { fontFamily: fonts.mono, fontSize: 10, color: colors.t3, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.t1,
    backgroundColor: colors.mesh2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bdr,
    gap: 8,
  },
  id: { fontFamily: fonts.mono, fontSize: 12, color: colors.t1 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 6 },
  actions: { justifyContent: "center", gap: 8 },
  approve: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.g },
  reject: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.r },
});
