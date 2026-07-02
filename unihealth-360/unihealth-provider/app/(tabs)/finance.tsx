// Provider App — Finance / Actuarial Dashboard
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { StatCard, SectionHeader, BenefitMeter, Divider, PrimaryButton } from '../../unihealth-shared/components';
import Toast from 'react-native-toast-message';

const LOSS_RATIO_DATA = [
  { month: 'Jan', ratio: 0.61 }, { month: 'Feb', ratio: 0.64 },
  { month: 'Mar', ratio: 0.58 }, { month: 'Apr', ratio: 0.67 },
  { month: 'May', ratio: 0.71 }, { month: 'Jun', ratio: 0.68 },
];
const TARGET_RATIO = 0.65;

// Simple inline SVG line chart — no chart library required
function LossRatioChart() {
  const W = 320; const H = 120; const PAD = 24;
  const values = LOSS_RATIO_DATA.map((d) => d.ratio);
  const min = 0.5; const max = 0.85;
  const toY = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const toX = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const targetY = toY(TARGET_RATIO);

  return (
    <View style={styles.chartWrap} accessibilityLabel="Loss ratio line chart. Values: Jan 61%, Feb 64%, Mar 58%, Apr 67%, May 71%, Jun 68%. Target 65%.">
      <Svg width={W} height={H}>
        {/* Target band */}
        <Line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY}
          stroke={Colors.statusWarning} strokeWidth={1.5} strokeDasharray="4,4" />
        <SvgText x={W - PAD + 2} y={targetY + 4} fontSize={9} fill={Colors.statusWarning}>Target</SvgText>
        {/* Data line */}
        <Polyline points={points} fill="none" stroke={Colors.accentInsurance} strokeWidth={2.5} />
        {/* Dots */}
        {values.map((v, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(v)} r={4}
            fill={v > TARGET_RATIO ? Colors.statusDanger : Colors.statusSuccess} />
        ))}
        {/* X labels */}
        {LOSS_RATIO_DATA.map((d, i) => (
          <SvgText key={i} x={toX(i)} y={H - 4} fontSize={9} fill={Colors.textMuted} textAnchor="middle">
            {d.month}
          </SvgText>
        ))}
      </Svg>
      {/* Accessible text table below chart */}
      <View style={styles.chartTable}>
        {LOSS_RATIO_DATA.map((d) => (
          <Text key={d.month} style={styles.chartTableCell}>
            {d.month}: {(d.ratio * 100).toFixed(0)}%
          </Text>
        ))}
      </View>
    </View>
  );
}

// Fund depletion slider scenario tool
function DepletionScenario() {
  const [growth, setGrowth] = useState(5); // percent
  const baseMonthsLeft = 6;
  const adjustedMonths = Math.max(1, Math.round(baseMonthsLeft * (1 - growth / 100)));
  const depletionDate = new Date(2026, 6 + adjustedMonths, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.scenarioCard}>
      <Text style={styles.scenarioLabel}>
        Claims Growth Rate Scenario — illustrative only
      </Text>
      <View style={styles.scenarioSliderRow}>
        {[0, 5, 10, 15, 20, 25].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.scenarioBtn, growth === v && styles.scenarioBtnActive]}
            onPress={() => setGrowth(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: growth === v }}
          >
            <Text style={[styles.scenarioBtnText, growth === v && styles.scenarioBtnTextActive]}>
              +{v}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[
        styles.scenarioResult,
        { borderColor: adjustedMonths <= 3 ? Colors.statusDanger : Colors.statusWarning },
      ]}>
        <Text style={styles.scenarioResultLabel}>Projected ECCIF Depletion</Text>
        <Text style={[
          styles.scenarioResultValue,
          { color: adjustedMonths <= 3 ? Colors.statusDanger : Colors.textPrimary },
        ]}>
          {depletionDate}
        </Text>
        <Text style={styles.scenarioDisclaimer}>
          ⚠ Illustrative client-side estimate. Not a certified actuarial projection.
        </Text>
      </View>
    </View>
  );
}

export default function FinanceScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <SectionHeader title="Finance & Actuarial" subtitle="Scheme-level financial health indicators" />

        {/* Top stats */}
        <View style={styles.statsRow}>
          <StatCard label="Loss Ratio (Jun)" value="68%" trend="up" trendValue="+3pp" accent={Colors.statusWarning} style={styles.stat} />
          <StatCard label="IBNR Reserve" value="KES 44M" accent={Colors.accentInsurance} style={styles.stat} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Claims Paid (Jun)" value="KES 8.4M" accent={Colors.statusSuccess} style={styles.stat} />
          <StatCard label="Premiums (Jun)" value="KES 12.3M" accent={Colors.accentInsurance} style={styles.stat} />
        </View>

        <Divider />

        {/* Loss Ratio Chart */}
        <SectionHeader title="Loss Ratio Trend" subtitle="Target: 65% | Above target = more claims paid than expected" />
        <View style={styles.chartCard}>
          <LossRatioChart />
        </View>

        <Divider />

        {/* IBNR Reserve */}
        <SectionHeader title="IBNR Reserve Estimate" subtitle="Incurred but not yet reported claims" />
        <View style={styles.ibnrCard}>
          <View style={styles.ibnrRow}>
            <View style={styles.ibnrBand}>
              <Text style={styles.ibnrBandLabel}>Low</Text>
              <Text style={styles.ibnrBandValue}>KES 38M</Text>
            </View>
            <View style={[styles.ibnrBand, styles.ibnrBandCentral]}>
              <Text style={[styles.ibnrBandLabel, { color: Colors.accentInsurance }]}>Central</Text>
              <Text style={[styles.ibnrBandValue, { color: Colors.accentInsurance, fontSize: Typography.fontSizeXl }]}>KES 44M</Text>
            </View>
            <View style={styles.ibnrBand}>
              <Text style={styles.ibnrBandLabel}>High</Text>
              <Text style={styles.ibnrBandValue}>KES 52M</Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* Fund Depletion */}
        <SectionHeader title="Fund Depletion Status" subtitle="Current year allocation utilization" />
        {[
          { label: 'PHF — Primary Healthcare Fund', used: 71, limit: 100, unit: '%' },
          { label: 'SHIF — National Hospital Insurance', used: 58, limit: 100, unit: '%' },
          { label: 'ECCIF — Emergency & Critical Illness', used: 39, limit: 100, unit: '%' },
        ].map((f) => (
          <View key={f.label} style={styles.fundCard}>
            <BenefitMeter label={f.label} used={f.used} limit={f.limit} currency="%" />
          </View>
        ))}

        <Divider />

        {/* Private Reserve Adequacy */}
        <SectionHeader title="Private Reserve Adequacy" subtitle="IRA minimum solvency requirement" />
        <View style={styles.reserveCard}>
          <View style={styles.reserveRow}>
            <View style={styles.reserveBar}>
              <View style={[styles.reserveBarFill, { width: '70%', backgroundColor: Colors.statusSuccess }]} />
              <View style={[styles.reserveBarFill, { width: '16.7%', backgroundColor: Colors.statusWarning }]} />
            </View>
          </View>
          <View style={styles.reserveLegend}>
            <Text style={styles.reserveLegendItem}>■ Current Reserve: KES 210M</Text>
            <Text style={[styles.reserveLegendItem, { color: Colors.statusWarning }]}>■ IRA Minimum: KES 180M</Text>
          </View>
          <Text style={styles.reserveNote}>Reserve adequacy: 116.7% of IRA minimum ✓</Text>
        </View>

        <Divider />

        {/* Depletion Scenario Tool */}
        <SectionHeader title="Depletion Scenario Tool" />
        <DepletionScenario />

        <PrimaryButton
          label="Export Actuarial Summary"
          onPress={() => Toast.show({ type: 'success', text1: 'Export queued', text2: 'Actuarial summary PDF ready for download' })}
          variant="secondary"
          style={styles.exportBtn}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  stat: { flex: 1 },
  chartCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, alignItems: 'center',
  },
  chartWrap: { alignItems: 'center', width: '100%' },
  chartTable: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  chartTableCell: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  ibnrCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  ibnrRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ibnrBand: { flex: 1, alignItems: 'center', gap: 4 },
  ibnrBandCentral: {
    backgroundColor: Colors.accentInsurance + '11', borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.accentInsurance + '44', padding: Spacing.sm,
  },
  ibnrBandLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  ibnrBandValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  fundCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  reserveCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm,
  },
  reserveRow: { gap: Spacing.xs },
  reserveBar: {
    flexDirection: 'row', height: 20, borderRadius: Radius.full,
    overflow: 'hidden', backgroundColor: Colors.bgSurfaceRaised,
  },
  reserveBarFill: { height: 20 },
  reserveLegend: { gap: 4 },
  reserveLegendItem: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  reserveNote: { color: Colors.statusSuccess, fontSize: Typography.fontSizeSm },
  scenarioCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
  },
  scenarioLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  scenarioSliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scenarioBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSurfaceRaised,
  },
  scenarioBtnActive: { borderColor: Colors.accentInsurance, backgroundColor: Colors.accentInsurance + '22' },
  scenarioBtnText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  scenarioBtnTextActive: { color: Colors.accentInsurance, fontWeight: Typography.fontWeightMedium },
  scenarioResult: {
    borderWidth: 2, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs,
  },
  scenarioResultLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  scenarioResultValue: { fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  scenarioDisclaimer: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, fontStyle: 'italic' },
  exportBtn: { marginTop: Spacing.md },
});
