// Patient 360 — Coverage Screen
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import {
  CoverageCard, BenefitMeter, StatusBadge, SectionHeader, Divider, PrimaryButton,
} from '../../unihealth-shared/components';

const MOCK_COVERAGE = {
  scheme: 'SHIF',
  status: 'active',
  memberName: 'Jane Wanjiku',
  memberId: 'SHIF-00291847',
  householdId: 'HH-00043721',
  policyNumber: 'POL-2024-00291847',
  enrolledDate: '2024-01-01',
  validUntil: '2026-12-31',
  primaryFacility: 'Nairobi City Health Centre (Level 3)',
  dependants: [
    { name: 'John Wanjiku (Spouse)', relationship: 'Spouse', dob: '1982-07-12', status: 'active' },
    { name: 'Michael Wanjiku', relationship: 'Child', dob: '2010-03-05', status: 'active' },
    { name: 'Sarah Wanjiku', relationship: 'Child', dob: '2013-11-20', status: 'active' },
  ],
  funds: [
    { label: 'PHF — Primary Healthcare Fund', used: 8500, limit: 50000, description: 'Outpatient, preventive, community health' },
    { label: 'SHIF — National Hospital Insurance', used: 31000, limit: 150000, description: 'Inpatient, specialist care' },
    { label: 'ECCIF — Emergency & Critical Illness', used: 0, limit: 200000, description: 'Emergency, ICU, oncology, dialysis' },
  ],
  premium: { amount: 2750, dueDate: '2026-07-09', status: 'due', channel: 'M-Pesa' },
};

export default function CoverageScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Coverage Card */}
        <CoverageCard
          scheme={MOCK_COVERAGE.scheme}
          status={MOCK_COVERAGE.status}
          memberName={MOCK_COVERAGE.memberName}
          memberId={MOCK_COVERAGE.memberId}
          dependants={MOCK_COVERAGE.dependants.length}
          validUntil="Dec 2026"
        />

        {/* Policy Detail */}
        <View style={styles.detailCard}>
          <Row label="Policy Number" value={MOCK_COVERAGE.policyNumber} />
          <Divider />
          <Row label="Household ID" value={MOCK_COVERAGE.householdId} />
          <Divider />
          <Row label="Enrolled" value={MOCK_COVERAGE.enrolledDate} />
          <Divider />
          <Row label="Valid Until" value={MOCK_COVERAGE.validUntil} />
          <Divider />
          <Row label="Primary Facility" value={MOCK_COVERAGE.primaryFacility} />
        </View>

        {/* Premium Status */}
        <View style={[
          styles.premiumCard,
          { borderColor: MOCK_COVERAGE.premium.status === 'due' ? Colors.statusWarning : Colors.statusSuccess },
        ]}>
          <View style={styles.premiumHeader}>
            <Text style={styles.premiumTitle}>Monthly Premium</Text>
            <StatusBadge status={MOCK_COVERAGE.premium.status} />
          </View>
          <Text style={styles.premiumAmount}>KES {MOCK_COVERAGE.premium.amount.toLocaleString()}</Text>
          <Text style={styles.premiumDue}>Due: {MOCK_COVERAGE.premium.dueDate}</Text>
          <PrimaryButton
            label="Pay via M-Pesa"
            onPress={() => router.push('/premium/pay')}
            style={styles.payBtn}
          />
        </View>

        {/* Benefit Balances */}
        <SectionHeader title="Benefit Balances" subtitle="Annual allocation, current year" />
        {MOCK_COVERAGE.funds.map((f) => (
          <View key={f.label} style={styles.fundCard}>
            <BenefitMeter label={f.label} used={f.used} limit={f.limit} />
            <Text style={styles.fundDesc}>{f.description}</Text>
          </View>
        ))}

        {/* Dependants */}
        <SectionHeader title="Dependants" subtitle={`${MOCK_COVERAGE.dependants.length} registered`} />
        {MOCK_COVERAGE.dependants.map((d, i) => (
          <View key={i} style={styles.dependantRow}>
            <View style={styles.dependantAvatar}>
              <Text style={styles.dependantInitial}>{d.name[0]}</Text>
            </View>
            <View style={styles.dependantInfo}>
              <Text style={styles.dependantName}>{d.name}</Text>
              <Text style={styles.dependantMeta}>{d.relationship} · DOB {d.dob}</Text>
            </View>
            <StatusBadge status={d.status} size="sm" />
          </View>
        ))}

        <PrimaryButton
          label="Manage Dependants"
          onPress={() => router.push('/dependants/manage')}
          variant="secondary"
          style={styles.manageDeps}
        />

        <View style={styles.bottomPad} />
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
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },

  detailCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  rowLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, flex: 1 },
  rowValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, flex: 1, textAlign: 'right' },

  premiumCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 2,
    padding: Spacing.lg, gap: Spacing.xs,
  },
  premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumTitle: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  premiumAmount: { color: Colors.textPrimary, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  premiumDue: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  payBtn: { marginTop: Spacing.sm },

  fundCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm,
  },
  fundDesc: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  dependantRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md,
  },
  dependantAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accentInsurance + '33',
    borderWidth: 1, borderColor: Colors.accentInsurance,
    alignItems: 'center', justifyContent: 'center',
  },
  dependantInitial: { color: Colors.accentInsurance, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  dependantInfo: { flex: 1, gap: 2 },
  dependantName: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  dependantMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  manageDeps: { marginTop: Spacing.xs },
  bottomPad: { height: Spacing.section },
});
