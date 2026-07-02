// Patient 360 — Home Screen
import React from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import {
  CoverageCard, BenefitMeter, StatusBadge, SectionHeader, Divider,
} from '../../unihealth-shared/components';
import { usePatientAuthStore } from '../store/authStore';

const MOCK_PATIENT = {
  name: 'Jane Wanjiku',
  memberId: 'SHIF-00291847',
  scheme: 'SHIF',
  status: 'active',
  dependants: 3,
  validUntil: 'Dec 2026',
};

const MOCK_FUNDS = [
  { label: 'PHF (Primary Healthcare)', used: 8500, limit: 50000 },
  { label: 'SHIF (National Hospital)', used: 31000, limit: 150000 },
  { label: 'ECCIF (Emergency & Critical)', used: 0, limit: 200000 },
];

const MOCK_RECENT_CLAIMS = [
  { id: 'CLM-087', facility: 'Kenyatta National Hospital', amount: 'KES 2,100', status: 'paid', date: 'Jun 30' },
  { id: 'CLM-081', facility: 'Mater Hospital', amount: 'KES 4,400', status: 'approved', date: 'Jun 18' },
  { id: 'CLM-073', facility: 'Nairobi Hospital', amount: 'KES 1,200', status: 'paid', date: 'Jun 5' },
];

const MOCK_ALERTS = [
  { icon: '💊', text: 'Premium payment due in 3 days — KES 2,750', action: 'Pay Now', route: '/premium/pay' },
  { icon: '📋', text: 'EOB available for Claim CLM-081', action: 'View', route: '/eob/CLM-081' },
];

export default function PatientHomeScreen() {
  const { user } = usePatientAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.accentInsurance} colors={[Colors.accentInsurance]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name ?? MOCK_PATIENT.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Alerts */}
        {MOCK_ALERTS.map((alert, i) => (
          <TouchableOpacity
            key={i}
            style={styles.alertCard}
            onPress={() => router.push(alert.route as any)}
            accessibilityRole="button"
          >
            <Text style={styles.alertIcon}>{alert.icon}</Text>
            <Text style={styles.alertText}>{alert.text}</Text>
            <Text style={styles.alertAction}>{alert.action} →</Text>
          </TouchableOpacity>
        ))}

        <Divider />

        {/* Coverage Card */}
        <SectionHeader title="Your Coverage" />
        <CoverageCard
          scheme={MOCK_PATIENT.scheme}
          status={MOCK_PATIENT.status}
          memberName={user?.name ?? MOCK_PATIENT.name}
          memberId={MOCK_PATIENT.memberId}
          dependants={MOCK_PATIENT.dependants}
          validUntil={MOCK_PATIENT.validUntil}
          onPress={() => router.push('/coverage')}
        />

        <Divider />

        {/* Benefit Balances */}
        <SectionHeader title="Benefit Balances" subtitle="Current year utilization" />
        <View style={styles.fundsCard}>
          {MOCK_FUNDS.map((f, i) => (
            <View key={f.label}>
              <BenefitMeter label={f.label} used={f.used} limit={f.limit} />
              {i < MOCK_FUNDS.length - 1 && <Divider style={styles.innerDivider} />}
            </View>
          ))}
        </View>

        <Divider />

        {/* Recent Claims */}
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Recent Claims" />
          <TouchableOpacity onPress={() => router.push('/claims')} accessibilityRole="link">
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {MOCK_RECENT_CLAIMS.map((claim) => (
          <TouchableOpacity
            key={claim.id}
            style={styles.claimRow}
            onPress={() => router.push(`/claims/${claim.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`Claim ${claim.id} from ${claim.facility}`}
          >
            <View style={styles.claimLeft}>
              <Text style={styles.claimFacility}>{claim.facility}</Text>
              <Text style={styles.claimMeta}>{claim.id} · {claim.date}</Text>
            </View>
            <View style={styles.claimRight}>
              <Text style={styles.claimAmount}>{claim.amount}</Text>
              <StatusBadge status={claim.status} size="sm" />
            </View>
          </TouchableOpacity>
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  greeting: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  name: { color: Colors.textPrimary, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  notifBtn: { padding: Spacing.xs, position: 'relative' },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.statusDanger,
  },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.statusWarningBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.statusWarning,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  alertIcon: { fontSize: 18 },
  alertText: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSizeSm },
  alertAction: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },

  fundsCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  innerDivider: { marginVertical: Spacing.sm },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm },

  claimRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  claimLeft: { gap: 2, flex: 1 },
  claimRight: { alignItems: 'flex-end', gap: Spacing.xs },
  claimFacility: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  claimMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  claimAmount: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemiBold },

  bottomPad: { height: Spacing.section },
});
