// UniHealth 360 — Shared Design Tokens
// These mirror the web platform's CSS variables exactly.
// Both apps import from here so visual language stays identical.

export const Colors = {
  // Backgrounds
  bgPage: '#0E1116',
  bgSurface: '#161B22',
  bgSurfaceRaised: '#1C232D',
  bgSurfaceHover: '#21293A',

  // Borders
  border: '#2A313C',
  borderFocus: '#7F77DD',

  // Text
  textPrimary: '#E6E8EB',
  textSecondary: '#9AA4B2',
  textMuted: '#6B7280',
  textInverse: '#0E1116',

  // Module accents
  accentInsurance: '#7F77DD',
  accentDoctor: '#3B82F6',
  accentNurse: '#10B981',
  accentLab: '#F59E0B',
  accentPharmacy: '#8B5CF6',
  accentDental: '#EC4899',
  accentCancer: '#EF4444',
  accentGynecology: '#F472B6',

  // Status
  statusSuccess: '#1D9E75',
  statusSuccessBg: '#0D2B22',
  statusWarning: '#BA7517',
  statusWarningBg: '#2A1F07',
  statusDanger: '#E24B4A',
  statusDangerBg: '#2A0F0F',
  statusInfo: '#3B82F6',
  statusInfoBg: '#0F1F3A',

  // Primitives
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const Typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 17,
  fontSizeXl: 20,
  fontSize2xl: 24,
  fontSize3xl: 30,

  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,

  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

// Status badge colors lookup
export const StatusColors: Record<string, { bg: string; text: string; border: string }> = {
  active:     { bg: Colors.statusSuccessBg, text: Colors.statusSuccess, border: Colors.statusSuccess },
  paid:       { bg: Colors.statusSuccessBg, text: Colors.statusSuccess, border: Colors.statusSuccess },
  approved:   { bg: Colors.statusSuccessBg, text: Colors.statusSuccess, border: Colors.statusSuccess },
  pending:    { bg: Colors.statusWarningBg, text: Colors.statusWarning, border: Colors.statusWarning },
  submitted:  { bg: Colors.statusInfoBg,    text: Colors.statusInfo,    border: Colors.statusInfo },
  flagged:    { bg: Colors.statusDangerBg,  text: Colors.statusDanger,  border: Colors.statusDanger },
  rejected:   { bg: Colors.statusDangerBg,  text: Colors.statusDanger,  border: Colors.statusDanger },
  inactive:   { bg: Colors.bgSurfaceRaised, text: Colors.textMuted,     border: Colors.border },
  draft:      { bg: Colors.bgSurfaceRaised, text: Colors.textSecondary, border: Colors.border },
  low:        { bg: Colors.statusSuccessBg, text: Colors.statusSuccess, border: Colors.statusSuccess },
  medium:     { bg: Colors.statusWarningBg, text: Colors.statusWarning, border: Colors.statusWarning },
  high:       { bg: Colors.statusDangerBg,  text: Colors.statusDanger,  border: Colors.statusDanger },
};
