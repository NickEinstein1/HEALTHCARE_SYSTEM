// Patient 360 — Claim Detail Screen
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { StatusBadge, ClaimTimeline, SectionHeader, Divider, PrimaryButton } from '../../../unihealth-shared/components';

const MOCK_CLAIMS: Record<string, any> = {
  'CLM-087': {
    id: 'CLM-087', date: '2026-06-30', facility: 'Kenyatta National Hospital',
    service: 'General Consultation', payer: 'SHIF', status: 'paid',
    billedAmount: 2400, approvedAmount: 2100, patientLiability: 300,
    icd10: 'J06.9 — Acute upper respiratory infection',
    lineItems: [
      { description: 'Outpatient Consultation (Gen. Practitioner)', billed: 1800, approved: 1800 },
      { description: 'Rapid Malaria RDT', billed: 400, approved: 300 },
      { description: 'Amoxicillin 500mg × 21', billed: 200, approved: 0, note: 'Generic equivalent available' },
    ],
    timeline: [
      { label: 'Encounter Closed', date: '2026-06-30 16:00', done: true },
      { label: 'Claim Submitted', date: '2026-06-30 16:01', done: true },
      { label: 'AI Audit Scored', date: '2026-06-30 16:01', done: true },
      { label: 'Auto-Adjudicated', date: '2026-06-30 16:02', done: true },
      { label: 'Payment Released', date: '2026-07-01 08:00', done: true },
    ],
    hasEob: true,
  },
  'CLM-054': {
    id: 'CLM-054', date: '2026-05-01', facility: 'Avenue Hospital',
    service: 'Lab Tests (Urine Culture)', payer: 'PHF', status: 'rejected',
    billedAmount: 3200, approvedAmount: 0, patientLiability: 3200,
    icd10: 'N30.9 — Cystitis, unspecified',
    lineItems: [
      { description: 'Urine Culture & Sensitivity', billed: 3200, approved: 0, note: 'PHF tariff does not cover urine C&S at Level 3' },
    ],
    timeline: [
      { label: 'Claim Submitted', date: '2026-05-01 10:00', done: true },
      { label: 'AI Audit Scored', date: '2026-05-01 10:01', done: true },
      { label: 'Human Review', date: '2026-05-02 09:00', done: true },
      { label: 'Rejected', date: '2026-05-02 09:15', done: true },
    ],
    hasEob: false,
    rejectionReason: 'PHF does not cover urine culture at a Level 3 facility without a referral. You may appeal this decision within 30 days.',
  },
};

export default function PatientClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const claim = MOCK_CLAIMS[id ?? 'CLM-087'] ?? MOCK_CLAIMS['CLM-087'];

  const handleDispute = () => {
    Alert.alert(
      'Dispute this decision?',
      'You can raise a formal dispute with SHA or your insurer. A case reference will be issued within 2 working days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Raise Dispute', onPress: () => {
          Toast.show({ type: 'info', text1: 'Dispute submitted', text2: 'Ref: DSP-' + Date.now().toString().slice(-6) });
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.claimId}>{claim.id}</Text>
            <Text style={styles.claimFacility}>{claim.facility}</Text>
            <Text style={styles.claimDate}>{claim.date}</Text>
          </View>
          <StatusBadge status={claim.status} />
        </View>

        {/* Financial Summary */}
        <View style={styles.financialCard}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Billed amount</Text>
            <Text style={styles.financialValue}>KES {claim.billedAmount.toLocaleString()}</Text>
          </View>
          <Divider />
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Approved by {claim.payer}</Text>
            <Text style={[styles.financialValue, { color: Colors.statusSuccess }]}>
              KES {claim.approvedAmount.toLocaleString()}
            </Text>
          </View>
          <Divider />
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Your liability</Text>
            <Text style={[
              styles.financialValue,
              { color: claim.patientLiability > 0 ? Colors.statusDanger : Colors.statusSuccess },
            ]}>
              KES {claim.patientLiability.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Diagnosis */}
        <SectionHeader title="Diagnosis" />
        <View style={styles.noteBox}><Text style={styles.noteText}>{claim.icd10}</Text></View>

        {/* Line Items */}
        <SectionHeader title="Claim Line Items" />
        {claim.lineItems.map((item: any, i: number) => (
          <View key={i} style={[styles.lineItem, item.approved === 0 && styles.lineItemRejected]}>
            <Text style={styles.lineDesc}>{item.description}</Text>
            <View style={styles.lineAmounts}>
              <Text style={styles.lineBilled}>Billed: KES {item.billed.toLocaleString()}</Text>
              <Text style={[
                styles.lineApproved,
                { color: item.approved > 0 ? Colors.statusSuccess : Colors.statusDanger },
              ]}>
                Approved: KES {item.approved.toLocaleString()}
              </Text>
            </View>
            {item.note && <Text style={styles.lineNote}>ⓘ {item.note}</Text>}
          </View>
        ))}

        {/* Rejection Reason */}
        {claim.status === 'rejected' && claim.rejectionReason && (
          <>
            <SectionHeader title="Rejection Reason" />
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>{claim.rejectionReason}</Text>
              <PrimaryButton
                label="Raise a Dispute"
                variant="secondary"
                onPress={handleDispute}
                style={styles.disputeBtn}
              />
            </View>
          </>
        )}

        {/* Timeline */}
        <SectionHeader title="Claim Timeline" />
        <ClaimTimeline steps={claim.timeline} />

        {/* EOB */}
        {claim.hasEob && (
          <>
            <Divider />
            <PrimaryButton
              label="View Explanation of Benefits"
              onPress={() => router.push(`/eob/${claim.id}` as any)}
            />
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  claimId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  claimFacility: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  claimDate: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  financialCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  financialLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  financialValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  noteBox: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  noteText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  lineItem: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.xs,
  },
  lineItemRejected: { borderColor: Colors.statusDanger, borderLeftWidth: 3 },
  lineDesc: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  lineAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  lineBilled: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  lineApproved: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },
  lineNote: { color: Colors.statusWarning, fontSize: Typography.fontSizeXs, fontStyle: 'italic' },
  rejectionBox: {
    backgroundColor: Colors.statusDangerBg, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.statusDanger, padding: Spacing.md, gap: Spacing.md,
  },
  rejectionText: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, lineHeight: 22 },
  disputeBtn: {},
});
