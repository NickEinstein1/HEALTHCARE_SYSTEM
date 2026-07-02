// Provider App — Compliance & Audit Console
import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import {
  SectionHeader, StatCard, StatusBadge, PrimaryButton, Divider, EmptyState,
} from '../../unihealth-shared/components';

const MOCK_FLAGS = [
  { code: 'Phantom Claim', count: 14, trend: 'up' as const, trendValue: '+3 this week' },
  { code: 'Upcoding', count: 9, trend: 'down' as const, trendValue: '-2 this week' },
  { code: 'Duplicate Billing', count: 4, trend: 'neutral' as const, trendValue: 'Unchanged' },
  { code: 'Unbundling', count: 6, trend: 'up' as const, trendValue: '+1 this week' },
];

const MOCK_PROVIDERS = [
  { id: 'P-001', name: 'Mwangi Medical Centre', riskScore: 71, claimVol: 340, peerAvg: 190, rejectionRate: 0.22, flags: 8 },
  { id: 'P-002', name: 'Sunshine Clinic Ltd', riskScore: 45, claimVol: 120, peerAvg: 115, rejectionRate: 0.07, flags: 2 },
  { id: 'P-003', name: 'City Health Hospital', riskScore: 28, claimVol: 210, peerAvg: 200, rejectionRate: 0.04, flags: 1 },
];

const REPORT_TYPES = ['SHA Submission', 'IRA Quarterly', 'ODPC DPIA Record'] as const;

export default function ComplianceScreen() {
  const [activeSection, setActiveSection] = useState<'flags' | 'providers' | 'audit' | 'reports'>('flags');
  const [exportLoading, setExportLoading] = useState(false);
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);

  const handleExport = () => {
    setExportLoading(true);
    setTimeout(() => {
      setExportLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Audit export ready',
        text2: 'Hash-chain integrity verified — 0 anomalies',
      });
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Section Switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionTabs}
      >
        {(['flags', 'providers', 'audit', 'reports'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sectionTab, activeSection === s && styles.sectionTabActive]}
            onPress={() => setActiveSection(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSection === s }}
          >
            <Text style={[styles.sectionTabText, activeSection === s && styles.sectionTabTextActive]}>
              {s === 'flags' ? 'Fraud Flags' : s === 'providers' ? 'Provider Risk' : s === 'audit' ? 'Audit Log' : 'Reports'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* FRAUD FLAGS */}
        {activeSection === 'flags' && (
          <>
            <SectionHeader
              title="Fraud Flag Overview"
              subtitle="AI-generated, pending human review"
            />
            <View style={styles.statsRow}>
              <StatCard label="Total Flags" value={33} accent={Colors.statusDanger} style={styles.stat} />
              <StatCard label="Resolved" value={24} accent={Colors.statusSuccess} style={styles.stat} />
              <StatCard label="Pending" value={9} accent={Colors.statusWarning} style={styles.stat} />
            </View>
            <Divider />
            {MOCK_FLAGS.map((f) => (
              <View key={f.code} style={styles.flagRow}>
                <View style={styles.flagLeft}>
                  <Text style={styles.flagCode}>{f.code}</Text>
                  <Text style={[
                    styles.flagTrend,
                    { color: f.trend === 'up' ? Colors.statusDanger : f.trend === 'down' ? Colors.statusSuccess : Colors.textMuted },
                  ]}>
                    {f.trend === 'up' ? '↑' : f.trend === 'down' ? '↓' : '→'} {f.trendValue}
                  </Text>
                </View>
                <View style={styles.flagBar}>
                  <View style={[styles.flagBarFill, { width: `${(f.count / 20) * 100}%`, backgroundColor: Colors.statusDanger }]} />
                </View>
                <Text style={styles.flagCount}>{f.count}</Text>
              </View>
            ))}
          </>
        )}

        {/* PROVIDER RISK */}
        {activeSection === 'providers' && (
          <>
            <SectionHeader
              title="Provider Risk Scorecards"
              subtitle="Sorted by risk score — higher = more scrutiny needed"
            />
            {MOCK_PROVIDERS.map((p) => (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <View style={[
                    styles.providerScore,
                    { backgroundColor: (p.riskScore >= 70 ? Colors.statusDanger : p.riskScore >= 45 ? Colors.statusWarning : Colors.statusSuccess) + '22' }
                  ]}>
                    <Text style={[
                      styles.providerScoreText,
                      { color: p.riskScore >= 70 ? Colors.statusDanger : p.riskScore >= 45 ? Colors.statusWarning : Colors.statusSuccess },
                    ]}>
                      {p.riskScore} / 100
                    </Text>
                  </View>
                </View>
                <View style={styles.providerStats}>
                  <View style={styles.providerStat}>
                    <Text style={styles.providerStatLabel}>Claim Volume</Text>
                    <Text style={styles.providerStatValue}>{p.claimVol}</Text>
                    <Text style={styles.providerStatPeer}>Peer avg: {p.peerAvg}</Text>
                  </View>
                  <View style={styles.providerStat}>
                    <Text style={styles.providerStatLabel}>Rejection Rate</Text>
                    <Text style={[
                      styles.providerStatValue,
                      { color: p.rejectionRate > 0.15 ? Colors.statusDanger : Colors.textPrimary },
                    ]}>
                      {(p.rejectionRate * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.providerStat}>
                    <Text style={styles.providerStatLabel}>Audit Flags</Text>
                    <Text style={[styles.providerStatValue, p.flags > 5 && { color: Colors.statusDanger }]}>
                      {p.flags}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* AUDIT LOG EXPORT */}
        {activeSection === 'audit' && (
          <>
            <SectionHeader
              title="Audit Log Export"
              subtitle="Hash-chained, append-only. Tamper-evidence verified before export."
            />
            <View style={styles.auditCard}>
              <Text style={styles.auditIntegrity}>✓ Hash-chain verified — 0 tampering anomalies detected</Text>
              <Text style={styles.auditEntries}>2,847 log entries in current range</Text>
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>From</Text>
                <View style={styles.dateInput}><Text style={styles.dateValue}>2026-06-01</Text></View>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>To</Text>
                <View style={styles.dateInput}><Text style={styles.dateValue}>2026-07-01</Text></View>
              </View>
            </View>
            <PrimaryButton
              label={exportLoading ? 'Exporting...' : 'Export Audit Log'}
              onPress={handleExport}
              loading={exportLoading}
            />
          </>
        )}

        {/* REGULATORY REPORTS */}
        {activeSection === 'reports' && (
          <>
            <SectionHeader
              title="Regulatory Report Generator"
              subtitle="SHA, IRA, and ODPC formatted reports"
            />
            {REPORT_TYPES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reportOption, reportType === r && styles.reportOptionSelected]}
                onPress={() => setReportType(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: reportType === r }}
              >
                <View style={[styles.radioCircle, reportType === r && styles.radioCircleSelected]} />
                <Text style={styles.reportLabel}>{r}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.reportPreview}>
              <Text style={styles.reportPreviewLabel}>Report Preview</Text>
              <Text style={styles.reportPreviewText}>
                {reportType} — Period: 2026-Q2{'\n'}
                Facility: Nairobi County Hospital{'\n'}
                Total Claims: 1,284 | Paid: KES 8,400,000{'\n'}
                Fraud Flags: 33 | Human-Reviewed: 24{'\n'}
                Generated by UniHealth UHIC v1.0{'\n'}
                Hash: 3a7f…c921
              </Text>
            </View>
            <PrimaryButton
              label="Export Report"
              onPress={() => Toast.show({ type: 'success', text1: 'Report exported', text2: `${reportType} ready for submission` })}
            />
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  sectionTabs: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  sectionTabActive: { backgroundColor: Colors.accentInsurance + '22', borderColor: Colors.accentInsurance },
  sectionTabText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  sectionTabTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },

  content: { padding: Spacing.lg, gap: Spacing.xs },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  stat: { flex: 1 },

  flagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  flagLeft: { width: 140 },
  flagCode: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  flagTrend: { fontSize: Typography.fontSizeXs, marginTop: 2 },
  flagBar: { flex: 1, height: 8, backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.full, overflow: 'hidden' },
  flagBarFill: { height: 8, borderRadius: Radius.full },
  flagCount: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold, width: 24, textAlign: 'right' },

  providerCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  providerName: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium, flex: 1 },
  providerScore: { borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  providerScoreText: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightBold },
  providerStats: { flexDirection: 'row', justifyContent: 'space-between' },
  providerStat: { gap: 2 },
  providerStatLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  providerStatValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  providerStatPeer: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  auditCard: {
    backgroundColor: Colors.statusSuccessBg, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.statusSuccess, padding: Spacing.lg, gap: Spacing.xs, marginBottom: Spacing.md,
  },
  auditIntegrity: { color: Colors.statusSuccess, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  auditEntries: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  dateRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  dateField: { flex: 1, gap: Spacing.xs },
  dateLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  dateInput: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  dateValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm },

  reportOption: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  reportOptionSelected: { borderColor: Colors.accentInsurance },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
  },
  radioCircleSelected: { borderColor: Colors.accentInsurance, backgroundColor: Colors.accentInsurance },
  reportLabel: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd },

  reportPreview: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.md, padding: Spacing.md,
    marginVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  reportPreviewLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginBottom: Spacing.xs },
  reportPreviewText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, lineHeight: 20, fontFamily: 'monospace' },

  bottomPad: { height: 40 },
});
