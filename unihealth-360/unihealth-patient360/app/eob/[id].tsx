// Patient 360 — Explanation of Benefits (EOB) Viewer
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { SectionHeader, Divider, PrimaryButton, StatusBadge } from '../../../unihealth-shared/components';

const MOCK_EOBS: Record<string, any> = {
  'CLM-087': {
    eobId: 'EOB-CLM-087', claimId: 'CLM-087',
    issueDate: '2026-07-01', payer: 'Social Health Authority (SHA)',
    payerRef: 'SHA-PAY-2026-00447821',
    member: 'Jane Wanjiku', memberId: 'SHIF-00291847',
    facility: 'Kenyatta National Hospital', facilityTier: 'Level 6',
    serviceDate: '2026-06-30',
    diagnosis: 'J06.9 — Acute upper respiratory infection',
    summary: {
      totalBilled: 2400,
      notCovered: 200,
      planDiscount: 100,
      planPaid: 2100,
      memberOwes: 300,
    },
    lineItems: [
      { service: 'Outpatient Consultation (GP)', billed: 1800, notCovered: 0, planPaid: 1800, memberOwes: 0 },
      { service: 'Rapid Malaria RDT', billed: 400, notCovered: 0, planPaid: 300, memberOwes: 100 },
      { service: 'Amoxicillin 500mg × 21', billed: 200, notCovered: 200, planPaid: 0, memberOwes: 200, note: 'Generic equivalent dispensable at no cost at public pharmacy' },
    ],
    paymentDetail: {
      method: 'M-Pesa B2B transfer to provider',
      transactionRef: 'MPESA-TXN-7A38CX',
      datePaid: '2026-07-01',
    },
    footer: 'This is not a bill. If you have questions about this EOB, contact SHA on 0800 720 601 or visit sha.go.ke. You have the right to appeal any decision within 30 days of this notice.',
  },
};

export default function EobViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eob = MOCK_EOBS[id ?? 'CLM-087'] ?? MOCK_EOBS['CLM-087'];

  const handleShare = async () => {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      Toast.show({ type: 'info', text1: 'EOB PDF', text2: 'PDF generation would trigger here in production' });
    } else {
      Toast.show({ type: 'error', text1: 'Sharing unavailable', text2: 'Cannot share on this device.' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* EOB Header */}
        <View style={styles.eobHeader}>
          <View style={styles.eobTitleRow}>
            <Text style={styles.eobTitle}>Explanation of Benefits</Text>
            <StatusBadge status="paid" label="Processed" size="sm" />
          </View>
          <Text style={styles.eobId}>{eob.eobId}</Text>
          <Text style={styles.eobMeta}>Issued: {eob.issueDate} · Payer: {eob.payer}</Text>
        </View>

        {/* Member & Service */}
        <View style={styles.infoCard}>
          <Row label="Member" value={eob.member} />
          <Divider />
          <Row label="Member ID" value={eob.memberId} />
          <Divider />
          <Row label="Facility" value={eob.facility} />
          <Divider />
          <Row label="Facility Tier" value={eob.facilityTier} />
          <Divider />
          <Row label="Service Date" value={eob.serviceDate} />
          <Divider />
          <Row label="Diagnosis" value={eob.diagnosis} />
        </View>

        {/* Financial Summary */}
        <SectionHeader title="Financial Summary" />
        <View style={styles.summaryCard}>
          <SummaryRow label="Total billed by facility" value={eob.summary.totalBilled} />
          <Divider />
          <SummaryRow label="Services not covered" value={-eob.summary.notCovered} negative />
          <Divider />
          <SummaryRow label="Plan discount applied" value={-eob.summary.planDiscount} negative />
          <Divider />
          <View style={[styles.summaryRow, styles.summaryHighlight]}>
            <Text style={[styles.summaryLabel, styles.summaryHighlightText]}>SHA paid provider</Text>
            <Text style={[styles.summaryValue, { color: Colors.statusSuccess }]}>
              KES {eob.summary.planPaid.toLocaleString()}
            </Text>
          </View>
          <Divider />
          <View style={[styles.summaryRow, styles.summaryHighlight]}>
            <Text style={[styles.summaryLabel, styles.summaryHighlightText]}>Your responsibility</Text>
            <Text style={[styles.summaryValue, { color: eob.summary.memberOwes > 0 ? Colors.statusWarning : Colors.statusSuccess }]}>
              KES {eob.summary.memberOwes.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Line Items */}
        <SectionHeader title="Service Detail" />
        <View style={styles.lineItemHeader}>
          <Text style={[styles.lineColHead, { flex: 2 }]}>Service</Text>
          <Text style={styles.lineColHead}>Billed</Text>
          <Text style={styles.lineColHead}>Paid</Text>
          <Text style={styles.lineColHead}>You owe</Text>
        </View>
        {eob.lineItems.map((item: any, i: number) => (
          <View key={i} style={[styles.lineItem, item.memberOwes > 0 && styles.lineItemOwed]}>
            <View style={styles.lineServiceRow}>
              <Text style={styles.lineService} numberOfLines={2}>{item.service}</Text>
            </View>
            <View style={styles.lineAmountsRow}>
              <Text style={styles.lineAmountCell}>KES {item.billed.toLocaleString()}</Text>
              <Text style={[styles.lineAmountCell, { color: Colors.statusSuccess }]}>KES {item.planPaid.toLocaleString()}</Text>
              <Text style={[styles.lineAmountCell, { color: item.memberOwes > 0 ? Colors.statusWarning : Colors.textMuted }]}>
                KES {item.memberOwes.toLocaleString()}
              </Text>
            </View>
            {item.note && <Text style={styles.lineNote}>ⓘ {item.note}</Text>}
          </View>
        ))}

        {/* Payment Detail */}
        <SectionHeader title="Payment to Provider" />
        <View style={styles.infoCard}>
          <Row label="Method" value={eob.paymentDetail.method} />
          <Divider />
          <Row label="Reference" value={eob.paymentDetail.transactionRef} />
          <Divider />
          <Row label="Date" value={eob.paymentDetail.datePaid} />
        </View>

        {/* Footer notice */}
        <View style={styles.footerBox}>
          <Text style={styles.footerText}>{eob.footer}</Text>
        </View>

        {/* Actions */}
        <PrimaryButton label="Download / Share PDF" onPress={handleShare} />
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

const SummaryRow = ({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, negative && { color: Colors.statusDanger }]}>
      {negative ? '-' : ''}KES {Math.abs(value).toLocaleString()}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  eobHeader: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.xs,
  },
  eobTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eobTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  eobId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm },
  eobMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  infoCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  rowLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, flex: 1 },
  rowValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, flex: 1, textAlign: 'right' },
  summaryCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  summaryHighlight: { paddingVertical: Spacing.sm },
  summaryLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  summaryHighlightText: { color: Colors.textPrimary, fontWeight: Typography.fontWeightSemiBold },
  summaryValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemiBold },
  lineItemHeader: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  lineColHead: { flex: 1, color: Colors.textMuted, fontSize: Typography.fontSizeXs, textAlign: 'center' },
  lineItem: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs, gap: Spacing.xs,
  },
  lineItemOwed: { borderColor: Colors.statusWarning },
  lineServiceRow: {},
  lineService: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  lineAmountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineAmountCell: { color: Colors.textSecondary, fontSize: Typography.fontSizeXs, flex: 1, textAlign: 'center' },
  lineNote: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, fontStyle: 'italic' },
  footerBox: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  footerText: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, lineHeight: 18 },
});
