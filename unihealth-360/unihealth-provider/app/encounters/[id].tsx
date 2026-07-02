// Provider App — Encounter Detail Screen
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { StatusBadge, SectionHeader, Divider, PrimaryButton, BenefitMeter } from '../../../unihealth-shared/components';

const MOCK_ENC = {
  id: 'ENC-2031', date: '2026-07-01', time: '08:44', type: 'Outpatient',
  status: 'closed',
  patient: { name: 'Alice Ochieng', dob: '1988-03-14', gender: 'Female', memberId: 'PHF-00172341' },
  coverage: { scheme: 'PHF', status: 'active', used: 14500, limit: 50000 },
  clinician: 'Dr. J. Kamau (MBChB)', facility: 'Nairobi County Hospital',
  chiefComplaint: 'Lower back pain for 3 weeks, worsening with movement.',
  vitals: [
    { label: 'BP', value: '122 / 80 mmHg' }, { label: 'Temp', value: '36.8 °C' },
    { label: 'SpO₂', value: '98%' }, { label: 'Weight', value: '72 kg' },
    { label: 'Height', value: '165 cm' }, { label: 'RR', value: '16 /min' },
  ],
  diagnoses: [{ code: 'M54.5', description: 'Low back pain', type: 'Primary' }],
  aiDiagnosticNote: 'AI-assisted: mechanical low back pain (p=0.84). Radicular pattern absent. Conservative management appropriate.',
  procedures: [
    { code: 'CONSULT-ORTHO', description: 'Orthopaedic Consultation', covered: true },
    { code: 'XRAY-LS', description: 'X-Ray Lumbar Spine (AP/Lat)', covered: true },
  ],
  medications: [
    { name: 'Ibuprofen 400mg', sig: 'PO TDS × 5 days', covered: true },
    { name: 'Omeprazole 20mg', sig: 'PO OD', covered: true },
  ],
  notes: 'Patient counselled on posture, rest, and return-to-work timeline. Follow-up in 2 weeks if no improvement.',
  claimId: 'CLM-088', claimStatus: 'flagged',
};

export default function EncounterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const enc = MOCK_ENC;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.encId}>{enc.id}</Text>
            <Text style={styles.encMeta}>{enc.date} · {enc.time} · {enc.type}</Text>
          </View>
          <StatusBadge status={enc.status} />
        </View>

        {/* Patient + Coverage */}
        <View style={styles.patientCard}>
          <View style={styles.patientRow}>
            <View>
              <Text style={styles.patientName}>{enc.patient.name}</Text>
              <Text style={styles.patientMeta}>{enc.patient.gender} · DOB {enc.patient.dob}</Text>
              <Text style={styles.memberId}>{enc.patient.memberId}</Text>
            </View>
            <StatusBadge status={enc.coverage.status} />
          </View>
          <Divider />
          <BenefitMeter
            label={`${enc.coverage.scheme} Benefit Balance`}
            used={enc.coverage.used}
            limit={enc.coverage.limit}
          />
        </View>

        {/* Chief Complaint */}
        <SectionHeader title="Chief Complaint" />
        <View style={styles.noteBox}><Text style={styles.noteText}>{enc.chiefComplaint}</Text></View>

        {/* Vitals */}
        <SectionHeader title="Vitals" />
        <View style={styles.vitalsGrid}>
          {enc.vitals.map((v) => (
            <View key={v.label} style={styles.vitalCard}>
              <Text style={styles.vitalLabel}>{v.label}</Text>
              <Text style={styles.vitalValue}>{v.value}</Text>
            </View>
          ))}
        </View>

        {/* Diagnoses */}
        <SectionHeader title="Diagnoses" />
        {enc.diagnoses.map((d) => (
          <View key={d.code} style={styles.dxRow}>
            <View style={styles.dxBadge}><Text style={styles.dxBadgeText}>{d.type}</Text></View>
            <View style={styles.dxInfo}>
              <Text style={styles.dxCode}>{d.code}</Text>
              <Text style={styles.dxDesc}>{d.description}</Text>
            </View>
          </View>
        ))}
        <View style={styles.aiNote}>
          <Text style={styles.aiNoteLabel}>🤖 Clinical AI Note</Text>
          <Text style={styles.aiNoteText}>{enc.aiDiagnosticNote}</Text>
        </View>

        {/* Procedures */}
        <SectionHeader title="Procedures" />
        {enc.procedures.map((p) => (
          <View key={p.code} style={styles.serviceRow}>
            <Text style={styles.serviceCode}>{p.code}</Text>
            <Text style={styles.serviceDesc}>{p.description}</Text>
            <StatusBadge status={p.covered ? 'active' : 'inactive'} label={p.covered ? 'Covered' : 'Uncovered'} size="sm" />
          </View>
        ))}

        {/* Medications */}
        <SectionHeader title="Medications" />
        {enc.medications.map((m) => (
          <View key={m.name} style={styles.serviceRow}>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medSig}>{m.sig}</Text>
            </View>
            <StatusBadge status={m.covered ? 'active' : 'inactive'} label={m.covered ? 'Covered' : 'Uncovered'} size="sm" />
          </View>
        ))}

        {/* Notes */}
        <SectionHeader title="Clinical Notes" />
        <View style={styles.noteBox}><Text style={styles.noteText}>{enc.notes}</Text></View>

        {/* Claim Link */}
        <Divider />
        {enc.claimId ? (
          <PrimaryButton
            label={`View Linked Claim: ${enc.claimId} (${enc.claimStatus?.toUpperCase()})`}
            variant={enc.claimStatus === 'flagged' ? 'danger' : 'secondary'}
            onPress={() => router.push(`/claims/${enc.claimId}` as any)}
          />
        ) : (
          <View style={styles.noClaimBox}>
            <Text style={styles.noClaimText}>No claim linked — encounter still open</Text>
          </View>
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
  encId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  encMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  patientCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.md,
  },
  patientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { color: Colors.textPrimary, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  patientMeta: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  memberId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeXs },
  noteBox: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  noteText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, lineHeight: 22 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vitalCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, minWidth: '30%', flex: 1, gap: 4,
  },
  vitalLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  vitalValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  dxRow: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start',
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  dxBadge: {
    backgroundColor: Colors.accentInsurance + '22', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: Colors.accentInsurance,
  },
  dxBadgeText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeXs },
  dxInfo: { flex: 1 },
  dxCode: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  dxDesc: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  aiNote: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs,
  },
  aiNoteLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  aiNoteText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, fontStyle: 'italic', lineHeight: 20 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  serviceCode: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, width: 80 },
  serviceDesc: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, flex: 1 },
  medInfo: { flex: 1 },
  medName: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  medSig: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  noClaimBox: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, alignItems: 'center',
  },
  noClaimText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, fontStyle: 'italic' },
});
