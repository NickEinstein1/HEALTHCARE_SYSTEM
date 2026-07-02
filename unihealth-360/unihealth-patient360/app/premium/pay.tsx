// Patient 360 — M-Pesa Premium Payment Screen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { PrimaryButton, SectionHeader, Divider } from '../../../unihealth-shared/components';

type PaymentState = 'idle' | 'pending_stk' | 'waiting' | 'success' | 'failed';

export default function PremiumPayScreen() {
  const [phone, setPhone] = useState('07');
  const [state, setState] = useState<PaymentState>('idle');
  const [error, setError] = useState('');

  const PREMIUM_AMOUNT = 2750;

  const validatePhone = (p: string) =>
    /^(07|01)\d{8}$/.test(p.replace(/\s/g, ''));

  const handlePay = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Enter a valid Kenyan mobile number (07XXXXXXXX or 01XXXXXXXX)');
      return;
    }
    setError('');
    setState('pending_stk');

    // Simulate STK Push initiation
    await new Promise((r) => setTimeout(r, 1200));
    setState('waiting');

    // Simulate M-Pesa callback (3s)
    await new Promise((r) => setTimeout(r, 3000));

    // In production: poll /insurance/premium/mpesa/{transactionId}/status
    const success = Math.random() > 0.15; // 85% success for demo
    if (success) {
      setState('success');
      Toast.show({ type: 'success', text1: 'Payment received!', text2: `KES ${PREMIUM_AMOUNT.toLocaleString()} confirmed via M-Pesa` });
    } else {
      setState('failed');
      setError('Payment was not confirmed. Check your M-Pesa PIN and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Amount Summary */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Premium Due</Text>
            <Text style={styles.amountValue}>KES {PREMIUM_AMOUNT.toLocaleString()}</Text>
            <Text style={styles.amountMeta}>SHIF Contribution · Due 9 July 2026</Text>
          </View>

          {/* Payment Flow States */}
          {state === 'idle' || state === 'failed' ? (
            <>
              <SectionHeader title="Pay via M-Pesa" subtitle="An STK push will be sent to your phone." />

              {error ? (
                <View style={styles.errorBox} accessibilityLiveRegion="assertive">
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>M-Pesa Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(''); }}
                  placeholder="0712 345 678"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={12}
                  accessibilityLabel="M-Pesa phone number"
                />
              </View>

              <View style={styles.summaryBox}>
                <Row label="Amount" value={`KES ${PREMIUM_AMOUNT.toLocaleString()}`} />
                <Divider />
                <Row label="Fund" value="SHIF / SHA" />
                <Divider />
                <Row label="Period" value="July 2026" />
              </View>

              <PrimaryButton
                label="Send STK Push"
                onPress={handlePay}
                disabled={phone.length < 9}
                style={styles.payBtn}
              />
              <Text style={styles.disclaimer}>
                You will receive a prompt on your phone. Enter your M-Pesa PIN to confirm.
                Do not share your PIN with anyone.
              </Text>
            </>
          ) : state === 'pending_stk' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateIcon}>📲</Text>
              <Text style={styles.stateTitle}>Sending STK Push…</Text>
              <Text style={styles.stateSub}>Requesting payment prompt for {phone}</Text>
            </View>
          ) : state === 'waiting' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateIcon}>⏳</Text>
              <Text style={styles.stateTitle}>Waiting for confirmation</Text>
              <Text style={styles.stateSub}>
                Enter your M-Pesa PIN on your phone.{'\n'}
                This usually takes under 30 seconds.
              </Text>
            </View>
          ) : state === 'success' ? (
            <View style={[styles.stateCard, styles.stateCardSuccess]}>
              <Text style={styles.stateIcon}>✅</Text>
              <Text style={[styles.stateTitle, { color: Colors.statusSuccess }]}>Payment Confirmed!</Text>
              <Text style={styles.stateSub}>
                KES {PREMIUM_AMOUNT.toLocaleString()} received.{'\n'}
                Your coverage remains active through December 2026.
              </Text>
              <PrimaryButton
                label="Back to Coverage"
                onPress={() => router.replace('/coverage')}
                style={{ marginTop: Spacing.lg }}
              />
            </View>
          ) : null}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  kav: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },

  amountCard: {
    backgroundColor: Colors.accentInsurance + '22',
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accentInsurance,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.xs,
  },
  amountLabel: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  amountValue: { color: Colors.textPrimary, fontSize: Typography.fontSize3xl, fontWeight: Typography.fontWeightBold },
  amountMeta: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },

  errorBox: {
    backgroundColor: Colors.statusDangerBg, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.statusDanger, padding: Spacing.md,
  },
  errorText: { color: Colors.statusDanger, fontSize: Typography.fontSizeSm },

  field: { gap: Spacing.xs },
  label: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  input: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, color: Colors.textPrimary,
    fontSize: Typography.fontSizeLg, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, height: 52,
  },

  summaryBox: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  rowLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  rowValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },

  payBtn: {},
  disclaimer: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, textAlign: 'center', lineHeight: 18 },

  stateCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.section, alignItems: 'center', gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  stateCardSuccess: { borderColor: Colors.statusSuccess, backgroundColor: Colors.statusSuccessBg },
  stateIcon: { fontSize: 56 },
  stateTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold, textAlign: 'center' },
  stateSub: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm, textAlign: 'center', lineHeight: 22 },

  bottomPad: { height: Spacing.section },
});
