// Provider App — Claims Portal
import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import {
  StatusBadge, SectionHeader, EmptyState, PrimaryButton, RiskScoreGauge,
} from '../../unihealth-shared/components';

const STATUSES = ['all', 'draft', 'submitted', 'flagged', 'approved', 'paid', 'rejected'] as const;

const MOCK_CLAIMS = [
  {
    id: 'CLM-089', encounterId: 'ENC-2031', patient: 'James Kamau',
    amount: 4200, status: 'submitted', date: '2026-07-01', riskScore: 12,
    payer: 'SHIF', provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-088', encounterId: 'ENC-2029', patient: 'Alice Ochieng',
    amount: 7800, status: 'flagged', date: '2026-07-01', riskScore: 78,
    payer: 'PHF', provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-087', encounterId: 'ENC-2027', patient: 'Felix Mwangi',
    amount: 2100, status: 'paid', date: '2026-06-30', riskScore: 5,
    payer: 'SHIF', provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-086', encounterId: 'ENC-2025', patient: 'Susan Otieno',
    amount: 15000, status: 'approved', date: '2026-06-30', riskScore: 22,
    payer: 'ECCIF', provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-085', encounterId: 'ENC-2023', patient: 'Peter Njoroge',
    amount: 1800, status: 'draft', date: '2026-06-29', riskScore: null,
    payer: 'SHIF', provider: 'Nairobi County Hospital',
  },
  {
    id: 'CLM-084', encounterId: 'ENC-2021', patient: 'Grace Wanjiku',
    amount: 3400, status: 'rejected', date: '2026-06-28', riskScore: 91,
    payer: 'Private', provider: 'Nairobi County Hospital',
  },
];

export default function ClaimsScreen() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = MOCK_CLAIMS.filter((c) => {
    const matchesTab = activeTab === 'all' || c.status === activeTab;
    const matchesSearch = !search || c.patient.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search);
    return matchesTab && matchesSearch;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search claims or patients..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search claims"
        />
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        accessibilityRole="tablist"
      >
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
      </ScrollView>

      {/* Claims List */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentInsurance}
            colors={[Colors.accentInsurance]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="No claims found"
            message={activeTab === 'all' ? 'No claims have been submitted yet.' : `No ${activeTab} claims.`}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.claimCard,
              item.status === 'flagged' && styles.claimCardFlagged,
            ]}
            onPress={() => router.push(`/claims/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Claim ${item.id} for ${item.patient}, ${item.status}`}
          >
            <View style={styles.claimCardHeader}>
              <View>
                <Text style={styles.claimId}>{item.id}</Text>
                <Text style={styles.claimEncounterRef}>
                  Linked encounter: {item.encounterId}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.claimCardBody}>
              <View>
                <Text style={styles.claimPatient}>{item.patient}</Text>
                <Text style={styles.claimMeta}>{item.payer} · {item.date}</Text>
              </View>
              <View style={styles.claimAmountCol}>
                <Text style={styles.claimAmount}>KES {item.amount.toLocaleString()}</Text>
                {item.riskScore !== null && (
                  <Text style={[
                    styles.riskBadge,
                    {
                      color: item.riskScore >= 70 ? Colors.statusDanger
                        : item.riskScore >= 40 ? Colors.statusWarning
                        : Colors.statusSuccess,
                    },
                  ]}>
                    ⚠ Risk: {item.riskScore}
                  </Text>
                )}
                {item.status === 'draft' && (
                  <Text style={styles.draftNote}>Auto-drafted from EHR</Text>
                )}
              </View>
            </View>

            {item.status === 'draft' && (
              <PrimaryButton
                label="Submit Claim"
                onPress={() => router.push(`/claims/${item.id}`)}
                style={styles.submitBtn}
              />
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },

  searchBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: 44,
  },

  tabsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  tabActive: {
    backgroundColor: Colors.accentInsurance + '22',
    borderColor: Colors.accentInsurance,
  },
  tabText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  tabTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },

  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },

  claimCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  claimCardFlagged: { borderColor: Colors.statusDanger },

  claimCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  claimId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  claimEncounterRef: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },

  claimCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  claimPatient: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium },
  claimMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },
  claimAmountCol: { alignItems: 'flex-end', gap: 4 },
  claimAmount: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  riskBadge: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },
  draftNote: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  submitBtn: { marginTop: Spacing.xs },
});
