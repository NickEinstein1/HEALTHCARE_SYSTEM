// Provider App — Main Dashboard
import React from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import {
  StatCard, SectionHeader, StatusBadge, BenefitMeter, Divider,
} from '../../unihealth-shared/components';
import { insuranceApi, auditApi } from '../../unihealth-shared/api';
import { useAuthStore } from '../store/authStore';

// Mock data (replaced by live API in production)
const MOCK_STATS = {
  openClaims: 14,
  pendingPreauth: 3,
  paidToday: 'KES 182,500',
  flaggedClaims: 2,
  members: 1284,
  rejectionRate: '4.2%',
};

const MOCK_RECENT_CLAIMS = [
  { id: 'CLM-089', patient: 'J. Kamau', amount: 'KES 4,200', status: 'submitted', date: 'Today 09:14' },
  { id: 'CLM-088', patient: 'A. Ochieng', amount: 'KES 7,800', status: 'flagged', date: 'Today 08:51' },
  { id: 'CLM-087', patient: 'F. Mwangi', amount: 'KES 2,100', status: 'paid', date: 'Yesterday' },
  { id: 'CLM-086', patient: 'S. Otieno', amount: 'KES 15,000', status: 'approved', date: 'Yesterday' },
];

const MOCK_FUNDS = [
  { label: 'PHF', used: 31000, limit: 50000 },
  { label: 'SHIF', used: 94000, limit: 150000 },
  { label: 'ECCIF', used: 42000, limit: 80000 },
];

export default function DashboardScreen() {
  const { token, user } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentInsurance}
            colors={[Colors.accentInsurance]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>UniHealth Provider</Text>
            <Text style={styles.facilityName}>
              {user?.facilityName ?? 'Nairobi County Hospital'}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role ?? 'doctor'}</Text>
          </View>
        </View>

        <Divider />

        {/* Key Metrics */}
        <SectionHeader title="Today at a Glance" />
        <View style={styles.statsGrid}>
          <StatCard
            label="Open Claims"
            value={MOCK_STATS.openClaims}
            accent={Colors.accentInsurance}
            style={styles.statHalf}
          />
          <StatCard
            label="Pending Pre-Auth"
            value={MOCK_STATS.pendingPreauth}
            accent={Colors.statusWarning}
            style={styles.statHalf}
          />
          <StatCard
            label="Paid Today"
            value={MOCK_STATS.paidToday}
            accent={Colors.statusSuccess}
            style={styles.statHalf}
          />
          <StatCard
            label="AI-Flagged"
            value={MOCK_STATS.flaggedClaims}
            accent={Colors.statusDanger}
            style={styles.statHalf}
          />
        </View>

        <Divider />

        {/* Fund utilization */}
        <SectionHeader
          title="Fund Utilization"
          subtitle="Current period — this facility"
        />
        <View style={styles.card}>
          {MOCK_FUNDS.map((f, i) => (
            <View key={f.label}>
              <BenefitMeter
                label={f.label}
                used={f.used}
                limit={f.limit}
                accent={Colors.accentInsurance}
              />
              {i < MOCK_FUNDS.length - 1 && <Divider style={styles.innerDivider} />}
            </View>
          ))}
        </View>

        <Divider />

        {/* Recent Claims */}
        <SectionHeader
          title="Recent Claims"
          subtitle="Latest activity across this facility"
        />
        {MOCK_RECENT_CLAIMS.map((claim) => (
          <View key={claim.id} style={styles.claimRow}>
            <View style={styles.claimLeft}>
              <Text style={styles.claimId}>{claim.id}</Text>
              <Text style={styles.claimPatient}>{claim.patient}</Text>
              <Text style={styles.claimDate}>{claim.date}</Text>
            </View>
            <View style={styles.claimRight}>
              <Text style={styles.claimAmount}>{claim.amount}</Text>
              <StatusBadge status={claim.status} size="sm" />
            </View>
          </View>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.xs },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  greeting: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  facilityName: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  roleBadge: {
    backgroundColor: Colors.accentInsurance + '33',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.accentInsurance,
  },
  roleBadgeText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statHalf: { width: '47%' },

  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  innerDivider: { marginVertical: Spacing.sm },

  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  claimLeft: { gap: 2 },
  claimRight: { alignItems: 'flex-end', gap: Spacing.xs },
  claimId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  claimPatient: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd },
  claimDate: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  claimAmount: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },

  bottomPad: { height: Spacing.section },
});
