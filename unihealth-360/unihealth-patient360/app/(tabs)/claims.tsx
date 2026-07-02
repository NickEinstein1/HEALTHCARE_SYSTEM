// Patient 360 — Claims History Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { StatusBadge, EmptyState, SectionHeader } from '../../unihealth-shared/components';

const STATUSES = ['all', 'paid', 'approved', 'pending', 'rejected'] as const;

const MOCK_CLAIMS = [
  {
    id: 'CLM-087', facility: 'Kenyatta National Hospital', date: '2026-06-30',
    amount: 2100, status: 'paid', payer: 'SHIF', hasEob: true,
    service: 'General Consultation',
  },
  {
    id: 'CLM-081', facility: 'Mater Hospital Nairobi', date: '2026-06-18',
    amount: 4400, status: 'approved', payer: 'SHIF', hasEob: true,
    service: 'Physiotherapy',
  },
  {
    id: 'CLM-073', facility: 'Nairobi Hospital', date: '2026-06-05',
    amount: 1200, status: 'paid', payer: 'PHF', hasEob: true,
    service: 'Antenatal Check-up',
  },
  {
    id: 'CLM-068', facility: 'MP Shah Hospital', date: '2026-05-22',
    amount: 14500, status: 'paid', payer: 'SHIF', hasEob: true,
    service: 'Appendectomy (Day Surgery)',
  },
  {
    id: 'CLM-054', facility: 'Avenue Hospital', date: '2026-05-01',
    amount: 3200, status: 'rejected', payer: 'PHF', hasEob: false,
    service: 'Lab Tests (Urine Culture)',
  },
];

export default function PatientClaimsScreen() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = MOCK_CLAIMS.filter((c) => {
    const matchesTab = activeTab === 'all' || c.status === activeTab;
    const matchesSearch = !search || c.facility.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search);
    return matchesTab && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by facility or claim ID..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search claims"
        />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Totals */}
            <View style={styles.totalsRow}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Paid Out</Text>
                <Text style={styles.totalValue}>KES 22,200</Text>
              </View>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Claims Filed</Text>
                <Text style={styles.totalValue}>{MOCK_CLAIMS.length}</Text>
              </View>
            </View>

            {/* Status Tabs */}
            <View style={styles.tabsWrap}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.tab, activeTab === s && styles.tabActive]}
                  onPress={() => setActiveTab(s)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === s }}
                >
                  <Text style={[styles.tabText, activeTab === s && styles.tabTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }}
            tintColor={Colors.accentInsurance}
            colors={[Colors.accentInsurance]}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="📄" title="No claims found" message="No matching claims for the selected filter." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.claimCard}
            onPress={() => router.push(`/claims/${item.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`${item.service} at ${item.facility}, ${item.status}`}
          >
            <View style={styles.claimCardHeader}>
              <Text style={styles.claimService}>{item.service}</Text>
              <StatusBadge status={item.status} size="sm" />
            </View>
            <Text style={styles.claimFacility}>{item.facility}</Text>
            <View style={styles.claimCardFooter}>
              <Text style={styles.claimMeta}>{item.id} · {item.payer} · {item.date}</Text>
              <Text style={styles.claimAmount}>KES {item.amount.toLocaleString()}</Text>
            </View>
            {item.hasEob && (
              <TouchableOpacity
                style={styles.eobLink}
                onPress={() => router.push(`/eob/${item.id}` as any)}
                accessibilityRole="link"
              >
                <Text style={styles.eobLinkText}>View Explanation of Benefits →</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },

  searchBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  searchInput: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, color: Colors.textPrimary,
    fontSize: Typography.fontSizeMd, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, height: 44,
  },

  totalsRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.sm },
  totalCard: {
    flex: 1, backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 4,
  },
  totalLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  totalValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },

  tabsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  tabActive: { backgroundColor: Colors.accentInsurance + '22', borderColor: Colors.accentInsurance },
  tabText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  tabTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },

  list: { padding: Spacing.lg, gap: Spacing.sm },

  claimCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs,
  },
  claimCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  claimService: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium, flex: 1 },
  claimFacility: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  claimCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  claimMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  claimAmount: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemiBold },
  eobLink: { marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border },
  eobLinkText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm },
});
