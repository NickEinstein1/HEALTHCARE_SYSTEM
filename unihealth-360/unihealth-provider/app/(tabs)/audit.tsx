// Provider App — Audit Queue (AI-Flagged Claims for Adjudicators)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { RiskScoreGauge, StatusBadge, SectionHeader, EmptyState, StatCard } from '../../unihealth-shared/components';

const MOCK_FLAGGED = [
  {
    id: 'CLM-088', patient: 'Alice Ochieng', encounterId: 'ENC-2031',
    payer: 'PHF', amount: 22200, riskScore: 78, date: '2026-07-01',
    reasonCodes: ['Procedure not in linked encounter', 'Amount exceeds tariff by 40%'],
    provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-074', patient: 'George Maina', encounterId: 'ENC-2010',
    payer: 'SHIF', amount: 8500, riskScore: 65, date: '2026-06-28',
    reasonCodes: ['Duplicate billing: same procedure on same date at another facility'],
    provider: 'City Medical Centre',
  },
  {
    id: 'CLM-061', patient: 'Hilda Atieno', encounterId: 'ENC-1994',
    payer: 'ECCIF', amount: 45000, riskScore: 91, date: '2026-06-22',
    reasonCodes: [
      'Phantom claim: no matching EHR encounter found',
      'Member gender mismatch with billed procedure',
    ],
    provider: 'Sunrise Medical Centre',
  },
  {
    id: 'CLM-055', patient: 'Ivan Njoroge', encounterId: 'ENC-1981',
    payer: 'SHIF', amount: 3200, riskScore: 42, date: '2026-06-18',
    reasonCodes: ['Upcoding: billed diagnosis severity inconsistent with documented vitals'],
    provider: 'Westlands Clinic',
  },
];

export default function AuditQueueScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const highRisk = MOCK_FLAGGED.filter((c) => c.riskScore >= 70).length;
  const medRisk = MOCK_FLAGGED.filter((c) => c.riskScore >= 40 && c.riskScore < 70).length;
  const totalValue = MOCK_FLAGGED.reduce((s, c) => s + c.amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={[...MOCK_FLAGGED].sort((a, b) => b.riskScore - a.riskScore)}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 900); }}
            tintColor={Colors.statusDanger}
            colors={[Colors.statusDanger]}
          />
        }
        ListHeaderComponent={
          <>
            <SectionHeader
              title="AI-Flagged Claim Queue"
              subtitle="Sorted by risk score — highest risk first. Every claim requires a human decision."
            />
            <View style={styles.statsRow}>
              <StatCard label="High Risk" value={highRisk} accent={Colors.statusDanger} style={styles.stat} />
              <StatCard label="Medium Risk" value={medRisk} accent={Colors.statusWarning} style={styles.stat} />
              <StatCard label="Total Value" value={`KES ${(totalValue / 1000).toFixed(0)}K`} accent={Colors.accentInsurance} style={styles.stat} />
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="✅" title="Queue is clear" message="No AI-flagged claims pending review." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.riskScore >= 70 ? styles.cardHigh : styles.cardMedium,
            ]}
            onPress={() => router.push(`/claims/${item.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`Flagged claim ${item.id}, risk score ${item.riskScore}`}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.claimId}>{item.id}</Text>
                <Text style={styles.encRef}>↳ {item.encounterId}</Text>
              </View>
              {/* Inline mini gauge */}
              <View style={[
                styles.scoreChip,
                { borderColor: item.riskScore >= 70 ? Colors.statusDanger : Colors.statusWarning },
              ]}>
                <Text style={[
                  styles.scoreText,
                  { color: item.riskScore >= 70 ? Colors.statusDanger : Colors.statusWarning },
                ]}>
                  {item.riskScore}
                </Text>
                <Text style={[
                  styles.scoreLabel,
                  { color: item.riskScore >= 70 ? Colors.statusDanger : Colors.statusWarning },
                ]}>
                  risk
                </Text>
              </View>
            </View>

            <Text style={styles.patient}>{item.patient}</Text>
            <Text style={styles.meta}>{item.provider} · {item.payer} · {item.date}</Text>
            <Text style={styles.amount}>KES {item.amount.toLocaleString()}</Text>

            {/* Reason codes */}
            {item.reasonCodes.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Text style={styles.reasonBullet} accessibilityLabel="Warning">⚠</Text>
                <Text style={styles.reasonText}>{r}</Text>
              </View>
            ))}

            <View style={styles.reviewPrompt}>
              <Text style={styles.reviewPromptText}>Tap to review & adjudicate →</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  stat: { flex: 1 },
  card: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, padding: Spacing.md, gap: Spacing.xs,
  },
  cardHigh: { borderColor: Colors.statusDanger, borderLeftWidth: 4 },
  cardMedium: { borderColor: Colors.statusWarning, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { gap: 2 },
  claimId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold },
  encRef: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  scoreChip: {
    borderWidth: 2, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    alignItems: 'center', minWidth: 56,
  },
  scoreText: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, lineHeight: 26 },
  scoreLabel: { fontSize: Typography.fontSizeXs },
  patient: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  meta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  amount: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  reasonRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start', marginTop: Spacing.xs },
  reasonBullet: { color: Colors.statusDanger, fontSize: Typography.fontSizeSm },
  reasonText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, flex: 1, lineHeight: 18 },
  reviewPrompt: {
    marginTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xs,
  },
  reviewPromptText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, textAlign: 'right' },
});
