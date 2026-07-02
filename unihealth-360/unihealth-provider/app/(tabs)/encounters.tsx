// Provider App — Encounters Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { StatusBadge, EmptyState, SectionHeader } from '../../unihealth-shared/components';

const MOCK_ENCOUNTERS = [
  {
    id: 'ENC-2031', patient: 'Alice Ochieng', dob: '1988-03-14',
    date: '2026-07-01', time: '08:44', type: 'Outpatient',
    diagnosis: 'M54.5 — Low back pain', status: 'closed',
    claimStatus: 'flagged', claimId: 'CLM-088',
    coverage: 'PHF · Active',
  },
  {
    id: 'ENC-2030', patient: 'Brian Kipchoge', dob: '1975-11-02',
    date: '2026-07-01', time: '09:20', type: 'Outpatient',
    diagnosis: 'J06.9 — Acute upper respiratory infection',
    status: 'closed', claimStatus: 'submitted', claimId: 'CLM-089',
    coverage: 'SHIF · Active',
  },
  {
    id: 'ENC-2029', patient: 'Carol Mutua', dob: '1992-06-30',
    date: '2026-06-30', time: '14:15', type: 'Inpatient',
    diagnosis: 'K35.2 — Acute appendicitis', status: 'closed',
    claimStatus: 'paid', claimId: 'CLM-087',
    coverage: 'ECCIF · Active',
  },
  {
    id: 'ENC-2028', patient: 'David Omondi', dob: '2001-08-19',
    date: '2026-06-30', time: '11:00', type: 'Outpatient',
    diagnosis: 'Pending documentation', status: 'open',
    claimStatus: null, claimId: null,
    coverage: 'SHIF · Active',
  },
  {
    id: 'ENC-2027', patient: 'Esther Njeri', dob: '1969-04-07',
    date: '2026-06-29', time: '10:30', type: 'Outpatient',
    diagnosis: 'E11.9 — Type 2 diabetes without complications',
    status: 'closed', claimStatus: 'draft', claimId: 'CLM-085',
    coverage: 'SHIF · Active',
  },
];

const STATUS_FILTERS = ['all', 'open', 'closed'] as const;

export default function EncountersScreen() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = MOCK_ENCOUNTERS.filter((e) => {
    const matchFilter = filter === 'all' || e.status === filter;
    const matchSearch =
      !search ||
      e.patient.toLowerCase().includes(search.toLowerCase()) ||
      e.id.includes(search) ||
      e.diagnosis.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search patient, encounter ID, diagnosis..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search encounters"
        />
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === f }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 900); }}
            tintColor={Colors.accentInsurance}
            colors={[Colors.accentInsurance]}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="🩺" title="No encounters found" message="No encounters match the current filter." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.status === 'open' && styles.cardOpen]}
            onPress={() => router.push(`/encounters/${item.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`Encounter ${item.id} for ${item.patient}`}
          >
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.encId}>{item.id}</Text>
                <Text style={styles.encDate}>{item.date} · {item.time} · {item.type}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>

            {/* Patient */}
            <Text style={styles.patient}>{item.patient}</Text>
            <Text style={styles.dob}>DOB: {item.dob}</Text>

            {/* Diagnosis */}
            <View style={styles.dxRow}>
              <Text style={styles.dxLabel}>Dx:</Text>
              <Text style={styles.dxValue} numberOfLines={2}>{item.diagnosis}</Text>
            </View>

            {/* Coverage chip */}
            <View style={styles.coverageChip}>
              <View style={styles.coverageDot} />
              <Text style={styles.coverageText}>{item.coverage}</Text>
            </View>

            {/* Claim link */}
            {item.claimId ? (
              <TouchableOpacity
                style={styles.claimLink}
                onPress={() => router.push(`/claims/${item.claimId}` as any)}
                accessibilityRole="link"
              >
                <Text style={styles.claimLinkText}>
                  {item.claimId} · <Text style={{ color: item.claimStatus === 'flagged' ? Colors.statusDanger : Colors.accentInsurance }}>
                    {item.claimStatus?.toUpperCase()}
                  </Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noClaimNote}>No claim yet — encounter still open</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  searchRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  search: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, color: Colors.textPrimary, fontSize: Typography.fontSizeMd,
    paddingHorizontal: Spacing.md, height: 44,
  },
  filterRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
  },
  filterTabActive: { backgroundColor: Colors.accentInsurance + '22', borderColor: Colors.accentInsurance },
  filterText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  filterTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },

  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.xs,
  },
  cardOpen: { borderColor: Colors.accentDoctor },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  encId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  encDate: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },
  patient: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  dob: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  dxRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start', marginTop: Spacing.xs },
  dxLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, width: 24 },
  dxValue: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, flex: 1 },
  coverageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.statusSuccessBg, borderRadius: Radius.full,
    alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.statusSuccess,
  },
  coverageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.statusSuccess },
  coverageText: { color: Colors.statusSuccess, fontSize: Typography.fontSizeXs },
  claimLink: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: Spacing.xs, marginTop: Spacing.xs,
  },
  claimLinkText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  noClaimNote: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, fontStyle: 'italic' },
});
