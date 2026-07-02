// Provider App — Claim Detail & Adjudicator Review Screen
import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import {
  StatusBadge, ClaimTimeline, RiskScoreGauge, PrimaryButton, SectionHeader, Divider,
} from '../../../unihealth-shared/components';

const MOCK_CLAIM = {
  id: 'CLM-088',
  encounterId: 'ENC-2029',
  patient: 'Alice Ochieng',
  dob: '1988-03-14',
  gender: 'Female',
  memberId: 'SHIF-00291847',
  payer: 'PHF',
  provider: 'Nairobi County Hospital',
  dateSubmitted: '2026-07-01',
  status: 'flagged',
  riskScore: 78,
  reasonCodes: [
    'Procedure "MRI Lumbar Spine" not found in linked encounter documentation',
    'Billed amount exceeds PHF tariff by 40%',
  ],
  lineItems: [
    { code: 'MRI-LS', description: 'MRI Lumbar Spine', amount: 18500, matched: false },
    { code: 'CONSULT-ORTHO', description: 'Orthopaedic Consultation', amount: 3500, matched: true },
    { code: 'XRAY-LS', description: 'X-Ray Lumbar Spine (AP/Lat)', amount: 1200, matched: true },
  ],
  encounterSummary: {
    date: '2026-06-30',
    diagnosis: 'M54.5 — Low back pain',
    clinicalAiNote: 'AI-assisted differential: mechanical low back pain, probability 0.84',
    observations: ['BP 122/80 mmHg', 'Weight 72 kg', 'No neurological deficits documented'],
    medications: ['Ibuprofen 400mg PO TDS x 5 days', 'Omeprazole 20mg PO OD'],
  },
  timeline: [
    { label: 'Encounter Closed', date: '2026-06-30 17:42', done: true },
    { label: 'Claim Auto-Drafted', date: '2026-06-30 17:43', done: true },
    { label: 'Claim Submitted', date: '2026-07-01 09:14', done: true },
    { label: 'AI Audit Scored', date: '2026-07-01 09:14', done: true, active: true },
    { label: 'Human Review', done: false },
    { label: 'Adjudication Decision', done: false },
    { label: 'Payment', done: false },
  ],
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const claim = MOCK_CLAIM; // In production: useQuery to fetch by id

  const [decision, setDecision] = useState<'approve' | 'partial' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = decision !== null && note.trim().length > 0;

  const handleSubmit = () => {
    Alert.alert(
      `Confirm ${decision === 'approve' ? 'Approval' : decision === 'partial' ? 'Partial Approval' : 'Rejection'}`,
      `This decision will be recorded and is auditable. Reason note:\n\n"${note}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setSubmitting(true);
            // In production: await insuranceApi.decideClaim(id, { decision, note }, token)
            setTimeout(() => {
              setSubmitting(false);
              Toast.show({ type: 'success', text1: 'Decision recorded', text2: `Claim ${id} marked as ${decision}` });
              router.back();
            }, 1000);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.claimId}>{claim.id}</Text>
            <Text style={styles.claimPatient}>{claim.patient}</Text>
            <Text style={styles.claimMeta}>{claim.payer} · {claim.dateSubmitted}</Text>
          </View>
          <StatusBadge status={claim.status} />
        </View>

        {/* AI Risk Score */}
        {claim.riskScore !== null && (
          <>
            <SectionHeader title="AI Audit Score" subtitle="Generated before payment — not overrideable by provider" />
            <RiskScoreGauge score={claim.riskScore} reasonCodes={claim.reasonCodes} />
          </>
        )}

        <Divider />

        {/* Claim vs Encounter Side-by-Side */}
        <SectionHeader title="Claim vs. Clinical Record" />
        <View style={styles.encounter}>
          <Text style={styles.encounterLabel}>Linked Encounter: {claim.encounterId}</Text>
          <Text style={styles.encounterDate}>{claim.encounterSummary.date}</Text>
          <Text style={styles.encounterDx}>{claim.encounterSummary.diagnosis}</Text>
          <Text style={styles.encounterAi}>{claim.encounterSummary.clinicalAiNote}</Text>
          <Divider />
          {claim.encounterSummary.observations.map((o, i) => (
            <Text key={i} style={styles.encounterObs}>• {o}</Text>
          ))}
          <Divider />
          {claim.encounterSummary.medications.map((m, i) => (
            <Text key={i} style={styles.encounterMed}>💊 {m}</Text>
          ))}
        </View>

        {/* Line Items */}
        <SectionHeader title="Billed Line Items" style={{ marginTop: Spacing.lg }} />
        {claim.lineItems.map((item) => (
          <View
            key={item.code}
            style={[styles.lineItem, !item.matched && styles.lineItemMismatch]}
          >
            <View style={styles.lineItemLeft}>
              {!item.matched && <Text style={styles.mismatchIcon} accessibilityLabel="Mismatch warning">⚠</Text>}
              <View>
                <Text style={styles.lineItemCode}>{item.code}</Text>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                {!item.matched && (
                  <Text style={styles.mismatchLabel}>Not found in encounter documentation</Text>
                )}
              </View>
            </View>
            <Text style={[styles.lineItemAmount, !item.matched && { color: Colors.statusDanger }]}>
              KES {item.amount.toLocaleString()}
            </Text>
          </View>
        ))}

        <Divider />

        {/* Claim Timeline */}
        <SectionHeader title="Claim Timeline" />
        <ClaimTimeline steps={claim.timeline} />

        <Divider />

        {/* Decision Panel — only for adjudicators */}
        <SectionHeader
          title="Adjudication Decision"
          subtitle="A reasoned note is required before submitting any decision."
        />

        <View style={styles.decisionButtons}>
          {(['approve', 'partial', 'reject'] as const).map((d) => (
            <PrimaryButton
              key={d}
              label={d === 'approve' ? 'Approve' : d === 'partial' ? 'Partial' : 'Reject'}
              variant={d === 'reject' ? 'danger' : decision === d ? 'primary' : 'secondary'}
              onPress={() => setDecision(d)}
              style={styles.decisionBtn}
            />
          ))}
        </View>

        <TextInput
          style={[styles.noteInput, note.length === 0 && decision !== null && styles.noteInputRequired]}
          placeholder="Enter a reasoned note for this decision (required)..."
          placeholderTextColor={Colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Decision note"
          accessibilityHint="Required. Explain your adjudication decision."
        />
        {decision !== null && note.length === 0 && (
          <Text style={styles.noteRequired} accessibilityLiveRegion="polite">
            ⓘ A reasoned note is required to submit a decision.
          </Text>
        )}

        <PrimaryButton
          label={submitting ? 'Submitting...' : 'Submit Decision'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          style={styles.submitBtn}
        />

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.xs },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  claimId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  claimPatient: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium },
  claimMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },

  encounter: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  encounterLabel: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  encounterDate: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  encounterDx: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium, marginTop: Spacing.xs },
  encounterAi: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, fontStyle: 'italic' },
  encounterObs: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  encounterMed: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },

  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lineItemMismatch: { borderColor: Colors.statusDanger, borderLeftWidth: 3 },
  lineItemLeft: { flexDirection: 'row', gap: Spacing.sm, flex: 1 },
  mismatchIcon: { fontSize: 16, color: Colors.statusDanger, marginTop: 2 },
  lineItemCode: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  lineItemDesc: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  mismatchLabel: { color: Colors.statusDanger, fontSize: Typography.fontSizeXs, marginTop: 2 },
  lineItemAmount: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },

  decisionButtons: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  decisionBtn: { flex: 1 },

  noteInput: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMd,
    padding: Spacing.md,
    minHeight: 100,
    marginBottom: Spacing.xs,
  },
  noteInputRequired: { borderColor: Colors.statusWarning },
  noteRequired: { color: Colors.statusWarning, fontSize: Typography.fontSizeSm, marginBottom: Spacing.sm },

  submitBtn: { marginTop: Spacing.md },
  bottomPad: { height: 40 },
});
