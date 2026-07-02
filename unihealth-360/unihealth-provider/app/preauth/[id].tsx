// Provider App — Pre-Authorization Detail Screen
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { StatusBadge, SectionHeader, Divider, PrimaryButton, ClaimTimeline, BenefitMeter } from '../../../unihealth-shared/components';

const MOCK_PREAUTH: Record<string, any> = {
  'PA-009': {
    id: 'PA-009', encounterId: 'ENC-2028',
    patient: 'David Omondi', memberId: 'SHIF-00381920',
    payer: 'SHIF', facilityTier: 'Level 4',
    procedure: 'MRI — Lumbar Spine (1.5T)',
    procedureCode: 'RAD-MRI-LS',
    icd10: 'M54.5 — Low back pain',
    estimatedCost: 18500,
    urgency: 'routine',
    clinicalJustification: 'Patient presents with 6-week history of lower back pain radiating to left leg. Conservative management for 4 weeks has failed. MRI indicated to rule out disc herniation or spinal stenosis before specialist referral.',
    requestedAt: '2026-07-01 11:00',
    status: 'pending',
    slaDeadline: '2026-07-03 11:00',
    coverage: { fund: 'SHIF', used: 31000, limit: 150000 },
    timeline: [
      { label: 'Pre-Auth Requested', date: '2026-07-01 11:00', done: true },
      { label: 'Eligibility Verified', date: '2026-07-01 11:01', done: true },
      { label: 'Payer Review', done: false, active: true },
      { label: 'Decision', done: false },
    ],
  },
};

export default function PreauthDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const preauth = MOCK_PREAUTH[id ?? 'PA-009'] ?? MOCK_PREAUTH['PA-009'];
  const [deciding, setDeciding] = useState(false);

  const handleDecide = (decision: 'approve' | 'reject') => {
    Alert.alert(
      decision === 'approve' ? 'Approve Pre-Authorization' : 'Reject Pre-Authorization',
      `Confirm ${decision} for ${preauth.procedure}?\nThis will be recorded in the audit log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setDeciding(true);
            await new Promise((r) => setTimeout(r, 800));
            setDeciding(false);
            Toast.show({
              type: decision === 'approve' ? 'success' : 'error',
              text1: `Pre-auth ${decision}d`,
              text2: `${preauth.id} — ${preauth.procedure}`,
            });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.preauthId}>{preauth.id}</Text>
            <Text style={styles.preauthMeta}>Requested: {preauth.requestedAt}</Text>
            <Text style={[
              styles.slaText,
              { color: Colors.statusWarning },
            ]}>SLA deadline: {preauth.slaDeadline}</Text>
          </View>
          <StatusBadge status={preauth.status} />
        </View>

        {/* Patient & Coverage */}
        <SectionHeader title="Patient & Coverage" />
        <View style={styles.infoCard}>
          <Row label="Patient" value={preauth.patient} />
          <Divider />
          <Row label="Member ID" value={preauth.memberId} />
          <Divider />
          <Row label="Payer" value={preauth.payer} />
          <Divider />
          <Row label="Facility Tier" value={preauth.facilityTier} />
          <Divider />
          <BenefitMeter label={`${preauth.coverage.fund} Balance`} used={preauth.coverage.used} limit={preauth.coverage.limit} />
        </View>

        {/* Procedure */}
        <SectionHeader title="Procedure Requested" />
        <View style={styles.infoCard}>
          <Row label="Procedure" value={preauth.procedure} />
          <Divider />
          <Row label="Code" value={preauth.procedureCode} />
          <Divider />
          <Row label="ICD-10" value={preauth.icd10} />
          <Divider />
          <Row label="Est. Cost" value={`KES ${preauth.estimatedCost.toLocaleString()}`} />
          <Divider />
          <Row label="Urgency" value={preauth.urgency.toUpperCase()} />
        </View>

        {/* Clinical Justification */}
        <SectionHeader title="Clinical Justification" />
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{preauth.clinicalJustification}</Text>
        </View>

        {/* Timeline */}
        <SectionHeader title="Pre-Auth Timeline" />
        <ClaimTimeline steps={preauth.timeline} />

        <Divider />

        {/* Decision buttons — only for adjudicators */}
        {preauth.status === 'pending' && (
          <>
            <SectionHeader title="Decision" subtitle="This decision is binding and audit-logged." />
            <View style={styles.decisionRow}>
              <PrimaryButton
                label="Approve"
                onPress={() => handleDecide('approve')}
                loading={deciding}
                style={styles.decisionBtn}
              />
              <PrimaryButton
                label="Reject"
                variant="danger"
                onPress={() => handleDecide('reject')}
                loading={deciding}
                style={styles.decisionBtn}
              />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.xs },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: Spacing.sm,
  },
  preauthId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  preauthMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  slaText: { fontSize: Typography.fontSizeXs, marginTop: 2 },
  infoCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  rowLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, flex: 1 },
  rowValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, flex: 1, textAlign: 'right' },
  noteBox: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  noteText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, lineHeight: 22 },
  decisionRow: { flexDirection: 'row', gap: Spacing.sm },
  decisionBtn: { flex: 1 },
});
