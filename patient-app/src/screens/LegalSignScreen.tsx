import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedScrollScreen } from "../components/animated/AnimatedScrollScreen";
import { ScreenIntro } from "../components/ScreenIntro";
import { Panel } from "../components/ui/Panel";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Tag } from "../components/ui/Tag";
import { usePatient } from "../context/PatientContext";
import { api, type LegalDocument } from "../lib/api";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";

const LABELS: Record<string, string> = {
  poa: "Power of Attorney",
  surgical_consent: "Surgical Consent",
  emergency_consent: "Emergency Consent",
};

export function LegalSignScreen() {
  const { patientId, toast } = usePatient();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [attestation, setAttestation] = useState("I have read this document and agree to its terms.");
  const [agentName, setAgentName] = useState("");
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.legalDocuments(patientId);
      setDocuments(res.documents ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, [patientId, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createPoa = async () => {
    try {
      const res = await api.legalDocumentCreate(patientId, "poa", agentName ? { agent_name: agentName } : undefined);
      setSelected(res.document);
      toast("Power of Attorney created.");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Create failed");
    }
  };

  const sign = async () => {
    if (!selected || !signerName.trim()) {
      toast("Enter your full legal name.");
      return;
    }
    try {
      const res = await api.legalDocumentSign(selected.id, {
        signer_role: "patient",
        signer_name: signerName.trim(),
        attestation: attestation.trim(),
      }, patientId);
      setSelected(res.document);
      toast(res.document.status === "completed" ? "Document completed and verified." : "Signature recorded.");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sign failed");
    }
  };

  const verify = async (docId: string) => {
    try {
      const res = await api.legalDocumentVerify(docId, patientId);
      setVerifyMsg(res.valid ? `Verified · Code ${res.verification_code ?? "—"}` : "Verification incomplete");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Verify failed");
    }
  };

  return (
    <AnimatedScrollScreen>
      <ScreenIntro text="Sign power of attorney and consent forms with cryptographic verification." />
      <Panel title="Create Power of Attorney">
        <Text style={styles.help}>Appoint a healthcare agent to make decisions on your behalf.</Text>
        <TextInput
          style={styles.input}
          value={agentName}
          onChangeText={setAgentName}
          placeholder="Agent full name"
          placeholderTextColor={colors.t3}
        />
        <PrimaryButton label="Create POA" onPress={() => void createPoa()} />
      </Panel>

      <Panel title="Your signing queue" noPadding>
        {loading && <Text style={styles.empty}>Loading…</Text>}
        {!loading && documents.length === 0 && (
          <Text style={styles.empty}>No documents pending. Staff may send surgical or emergency consent for you to sign.</Text>
        )}
        {documents.map((doc) => (
          <View key={doc.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{LABELS[doc.doc_type] ?? doc.title}</Text>
              <Text style={styles.meta}>{doc.status} · {doc.id}</Text>
            </View>
            <Tag label={doc.status === "completed" ? "Done" : "Sign"} tone={doc.status === "completed" ? "green" : "amber"} />
            <SecondaryButton label="Open" onPress={() => setSelected(doc)} style={{ marginLeft: 8 }} />
            <SecondaryButton label="Verify" onPress={() => void verify(doc.id)} style={{ marginLeft: 6 }} />
          </View>
        ))}
      </Panel>

      {selected && (
        <Panel title={selected.title}>
          <Text style={styles.body}>{selected.body}</Text>
          {selected.status === "pending_signatures" && (
            <>
              <Text style={styles.label}>Full legal name</Text>
              <TextInput style={styles.input} value={signerName} onChangeText={setSignerName} placeholder="As on ID" placeholderTextColor={colors.t3} />
              <Text style={styles.label}>Attestation</Text>
              <TextInput
                style={[styles.input, { minHeight: 72 }]}
                value={attestation}
                onChangeText={setAttestation}
                multiline
                placeholderTextColor={colors.t3}
              />
              <PrimaryButton label="Sign electronically" onPress={() => void sign()} />
            </>
          )}
          {(selected.signatures ?? []).map((s) => (
            <Text key={s.id} style={styles.sig}>
              {s.signer_name} ({s.signer_role}) · {s.signed_at}
            </Text>
          ))}
          {selected.verification_code ? (
            <Text style={styles.code}>Verification code: {selected.verification_code}</Text>
          ) : null}
        </Panel>
      )}

      {verifyMsg ? <Text style={styles.verify}>{verifyMsg}</Text> : null}
    </AnimatedScrollScreen>
  );
}

const styles = StyleSheet.create({
  help: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.t3, marginBottom: 10 },
  label: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.t2, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.bdr,
    borderRadius: 10,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.t1,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.bdr },
  name: { fontFamily: fonts.sansExtra, fontSize: 12.5, color: colors.t1 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 2 },
  empty: { padding: 14, fontFamily: fonts.sans, fontSize: 11.5, color: colors.t3 },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.t2, lineHeight: 20, marginBottom: 8 },
  sig: { fontFamily: fonts.sans, fontSize: 11, color: colors.t3, marginTop: 6 },
  code: { fontFamily: fonts.mono, fontSize: 11, color: colors.te, marginTop: 10, fontWeight: "700" },
  verify: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.te, padding: 14, textAlign: "center" },
});
