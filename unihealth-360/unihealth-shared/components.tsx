// UniHealth 360 — Shared Component Library
// Both apps import these components. Keep in sync.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow, StatusColors } from './tokens';

// ─── StatCard ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accent?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, unit, trend, trendValue, accent = Colors.accentInsurance, style,
}) => (
  <View style={[styles.statCard, style]}>
    <View style={[styles.statCardAccent, { backgroundColor: accent }]} />
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statValueRow}>
      <Text style={styles.statValue}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </View>
    {trend && trendValue && (
      <Text style={[styles.statTrend,
        { color: trend === 'up' ? Colors.statusDanger : trend === 'down' ? Colors.statusSuccess : Colors.textMuted }
      ]}>
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
      </Text>
    )}
  </View>
);

// ─── StatusBadge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const key = status.toLowerCase();
  const colors = StatusColors[key] ?? StatusColors.inactive;
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg, borderColor: colors.border },
      size === 'sm' && styles.badgeSm,
    ]}>
      <Text style={[
        styles.badgeText,
        { color: colors.text },
        size === 'sm' && styles.badgeTextSm,
      ]}>
        {displayLabel}
      </Text>
    </View>
  );
};

// ─── BenefitMeter ─────────────────────────────────────────────────────────────
interface BenefitMeterProps {
  label: string;
  used: number;
  limit: number;
  currency?: string;
  accent?: string;
}

export const BenefitMeter: React.FC<BenefitMeterProps> = ({
  label, used, limit, currency = 'KES', accent = Colors.accentInsurance,
}) => {
  const pct = Math.min(used / limit, 1);
  const pctDisplay = Math.round(pct * 100);
  const barColor = pct > 0.85 ? Colors.statusDanger : pct > 0.65 ? Colors.statusWarning : accent;

  return (
    <View style={styles.benefitMeter}>
      <View style={styles.benefitMeterHeader}>
        <Text style={styles.benefitMeterLabel}>{label}</Text>
        <Text style={styles.benefitMeterPct}>{pctDisplay}% used</Text>
      </View>
      <View style={styles.benefitMeterTrack}>
        <View style={[styles.benefitMeterFill, { width: `${pctDisplay}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.benefitMeterFooter}>
        <Text style={styles.benefitMeterSub}>{currency} {used.toLocaleString()} used</Text>
        <Text style={styles.benefitMeterSub}>{currency} {limit.toLocaleString()} limit</Text>
      </View>
    </View>
  );
};

// ─── ClaimTimeline ────────────────────────────────────────────────────────────
interface TimelineStep {
  label: string;
  date?: string;
  done: boolean;
  active?: boolean;
}

interface ClaimTimelineProps {
  steps: TimelineStep[];
}

export const ClaimTimeline: React.FC<ClaimTimelineProps> = ({ steps }) => (
  <View style={styles.timeline}>
    {steps.map((step, i) => (
      <View key={i} style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <View style={[
            styles.timelineDot,
            step.done && styles.timelineDotDone,
            step.active && styles.timelineDotActive,
          ]} />
          {i < steps.length - 1 && (
            <View style={[styles.timelineConnector, step.done && styles.timelineConnectorDone]} />
          )}
        </View>
        <View style={styles.timelineContent}>
          <Text style={[
            styles.timelineLabel,
            step.done && styles.timelineLabelDone,
            step.active && styles.timelineLabelActive,
          ]}>
            {step.label}
          </Text>
          {step.date && <Text style={styles.timelineDate}>{step.date}</Text>}
        </View>
      </View>
    ))}
  </View>
);

// ─── RiskScoreGauge ───────────────────────────────────────────────────────────
interface RiskScoreGaugeProps {
  score: number; // 0–100
  reasonCodes?: string[];
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({ score, reasonCodes = [] }) => {
  const color = score >= 70 ? Colors.statusDanger : score >= 40 ? Colors.statusWarning : Colors.statusSuccess;
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk';

  return (
    <View style={styles.riskGauge}>
      <View style={[styles.riskGaugeBadge, { borderColor: color, backgroundColor: color + '22' }]}>
        <Text style={[styles.riskGaugeScore, { color }]}>{score}</Text>
        <Text style={[styles.riskGaugeLabel, { color }]}>{label}</Text>
      </View>
      {reasonCodes.length > 0 && (
        <View style={styles.riskGaugeReasons}>
          {reasonCodes.map((r, i) => (
            <View key={i} style={styles.riskGaugeReason}>
              <Text style={styles.riskGaugeReasonDot}>•</Text>
              <Text style={styles.riskGaugeReasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── CoverageCard ─────────────────────────────────────────────────────────────
interface CoverageCardProps {
  scheme: string;
  status: string;
  memberName: string;
  memberId: string;
  dependants?: number;
  validUntil?: string;
  onPress?: () => void;
}

export const CoverageCard: React.FC<CoverageCardProps> = ({
  scheme, status, memberName, memberId, dependants = 0, validUntil, onPress,
}) => (
  <TouchableOpacity
    style={styles.coverageCard}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Coverage card for ${memberName}, scheme ${scheme}, status ${status}`}
  >
    <View style={styles.coverageCardHeader}>
      <View style={styles.coverageCardAccent} />
      <Text style={styles.coverageCardScheme}>{scheme}</Text>
      <StatusBadge status={status} size="sm" />
    </View>
    <Text style={styles.coverageCardName}>{memberName}</Text>
    <Text style={styles.coverageCardId}>ID: {memberId}</Text>
    <View style={styles.coverageCardFooter}>
      <Text style={styles.coverageCardMeta}>{dependants} dependant{dependants !== 1 ? 's' : ''}</Text>
      {validUntil && <Text style={styles.coverageCardMeta}>Valid until {validUntil}</Text>}
    </View>
  </TouchableOpacity>
);

// ─── PrimaryButton ────────────────────────────────────────────────────────────
interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label, onPress, loading = false, disabled = false, variant = 'primary', style,
}) => {
  const bgMap = {
    primary: Colors.accentInsurance,
    secondary: Colors.bgSurfaceRaised,
    danger: Colors.statusDanger,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? Colors.bgSurface : bgMap[variant] },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading
        ? <ActivityIndicator color={Colors.textPrimary} size="small" />
        : <Text style={[styles.buttonText, disabled && { color: Colors.textMuted }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
};

// ─── SectionHeader ────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string; style?: ViewStyle }> = ({
  title, subtitle, style,
}) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; message: string }> = ({
  icon, title, message,
}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateIcon}>{icon}</Text>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    <Text style={styles.emptyStateMsg}>{message}</Text>
  </View>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // StatCard
  statCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flex: 1,
    minWidth: 140,
    overflow: 'hidden',
    ...Shadow.card,
  },
  statCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizeSm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize2xl,
    fontWeight: Typography.fontWeightBold,
  },
  statUnit: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  statTrend: { fontSize: Typography.fontSizeXs, marginTop: Spacing.xs },

  // StatusBadge
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  badgeTextSm: { fontSize: Typography.fontSizeXs },

  // BenefitMeter
  benefitMeter: { gap: Spacing.xs },
  benefitMeterHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  benefitMeterLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  benefitMeterPct: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  benefitMeterTrack: {
    height: 8,
    backgroundColor: Colors.bgSurfaceRaised,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  benefitMeterFill: { height: 8, borderRadius: Radius.full },
  benefitMeterFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  benefitMeterSub: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  // ClaimTimeline
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', minHeight: 48 },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.bgSurface,
    marginTop: 4,
  },
  timelineDotDone: { borderColor: Colors.statusSuccess, backgroundColor: Colors.statusSuccess },
  timelineDotActive: { borderColor: Colors.accentInsurance, backgroundColor: Colors.accentInsurance },
  timelineConnector: { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 2 },
  timelineConnectorDone: { backgroundColor: Colors.statusSuccess },
  timelineContent: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.lg },
  timelineLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  timelineLabelDone: { color: Colors.textSecondary },
  timelineLabelActive: { color: Colors.textPrimary, fontWeight: Typography.fontWeightSemiBold },
  timelineDate: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },

  // RiskScoreGauge
  riskGauge: { gap: Spacing.sm },
  riskGaugeBadge: {
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  riskGaugeScore: { fontSize: Typography.fontSize3xl, fontWeight: Typography.fontWeightBold },
  riskGaugeLabel: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  riskGaugeReasons: { gap: Spacing.xs },
  riskGaugeReason: { flexDirection: 'row', gap: Spacing.xs },
  riskGaugeReasonDot: { color: Colors.statusDanger, fontSize: Typography.fontSizeSm },
  riskGaugeReasonText: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, flex: 1 },

  // CoverageCard
  coverageCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadow.card,
  },
  coverageCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  coverageCardAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.accentInsurance,
  },
  coverageCardScheme: { color: Colors.textPrimary, fontWeight: Typography.fontWeightSemiBold, flex: 1, fontSize: Typography.fontSizeLg },
  coverageCardName: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightMedium },
  coverageCardId: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  coverageCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  coverageCardMeta: { color: Colors.textSecondary, fontSize: Typography.fontSizeXs },

  // PrimaryButton
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },

  // SectionHeader
  sectionHeader: { gap: Spacing.xs, marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },

  // EmptyState
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: Spacing.section, gap: Spacing.sm },
  emptyStateIcon: { fontSize: 48 },
  emptyStateTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemiBold },
  emptyStateMsg: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, textAlign: 'center' },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
});
