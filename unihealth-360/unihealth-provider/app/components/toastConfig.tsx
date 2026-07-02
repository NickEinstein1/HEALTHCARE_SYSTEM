// Provider App — Toast config (matches dark theme)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../unihealth-shared/tokens';

const Base = ({
  text1, text2, borderColor,
}: { text1?: string; text2?: string; borderColor: string }) => (
  <View style={[styles.toast, { borderLeftColor: borderColor }]}>
    {text1 && <Text style={styles.title}>{text1}</Text>}
    {text2 && <Text style={styles.body}>{text2}</Text>}
  </View>
);

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <Base text1={text1} text2={text2} borderColor={Colors.statusSuccess} />
  ),
  error: ({ text1, text2 }: any) => (
    <Base text1={text1} text2={text2} borderColor={Colors.statusDanger} />
  ),
  info: ({ text1, text2 }: any) => (
    <Base text1={text1} text2={text2} borderColor={Colors.accentInsurance} />
  ),
  warning: ({ text1, text2 }: any) => (
    <Base text1={text1} text2={text2} borderColor={Colors.statusWarning} />
  ),
};

const styles = StyleSheet.create({
  toast: {
    width: '90%',
    backgroundColor: Colors.bgSurfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    gap: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeSm,
    fontWeight: Typography.fontWeightSemiBold,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizeXs,
  },
});
