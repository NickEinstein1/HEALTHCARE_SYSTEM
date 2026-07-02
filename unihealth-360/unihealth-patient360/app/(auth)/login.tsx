// Patient 360 — Login Screen (Keycloak OIDC + Biometric fallback)
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { PrimaryButton } from '../../../unihealth-shared/components';
import { usePatientAuthStore } from '../../store/authStore';

export default function PatientLoginScreen() {
  const { login } = usePatientAuthStore();
  const [phoneOrId, setPhoneOrId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBiometric = async () => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!supported || !enrolled) {
      setError('Biometric authentication is not set up on this device.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity to access UniHealth 360',
      cancelLabel: 'Use PIN instead',
      disableDeviceFallback: false,
    });
    if (result.success) {
      await performLogin('biometric_token_' + Date.now(), {
        id: 'patient-001',
        name: 'Jane Wanjiku',
        email: 'jane@example.ke',
        memberId: 'SHIF-00291847',
        patientId: 'PAT-0001',
      });
    } else {
      setError('Biometric verification failed. Try your PIN.');
    }
  };

  const performLogin = async (token: string, user: any) => {
    await login(token, user);
    router.replace('/(tabs)');
  };

  const handlePinLogin = async () => {
    if (!phoneOrId.trim()) { setError('Enter your phone number or National ID.'); return; }
    if (pin.length < 4) { setError('Enter your 4–6 digit PIN.'); return; }
    setLoading(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 900));
      await performLogin('mock_patient_jwt_' + Date.now(), {
        id: 'patient-001',
        name: 'Jane Wanjiku',
        email: 'jane@example.ke',
        memberId: 'SHIF-00291847',
        patientId: 'PAT-0001',
      });
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>360</Text>
            </View>
            <Text style={styles.appName}>UniHealth 360</Text>
            <Text style={styles.appSub}>Your health, your coverage, one app</Text>
          </View>

          {/* Biometric Quick Login */}
          <TouchableOpacity
            style={styles.biometricBtn}
            onPress={handleBiometric}
            accessibilityRole="button"
            accessibilityLabel="Sign in with fingerprint or Face ID"
          >
            <Text style={styles.biometricIcon}>👆</Text>
            <View>
              <Text style={styles.biometricTitle}>Sign in with Biometrics</Text>
              <Text style={styles.biometricSub}>Fingerprint or Face ID</Text>
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or use PIN</Text>
            <View style={styles.orLine} />
          </View>

          {/* PIN Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number or National ID</Text>
              <TextInput
                style={styles.input}
                value={phoneOrId}
                onChangeText={setPhoneOrId}
                placeholder="0712345678 or 12345678"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                accessibilityLabel="Phone number or National ID"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PIN</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                placeholder="••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                accessibilityLabel="PIN"
              />
            </View>

            <PrimaryButton
              label={loading ? 'Signing in…' : 'Sign In'}
              onPress={handlePinLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            <Text style={styles.helpText}>
              New member? Contact the SHA helpline: 0800 720 601{'\n'}
              Or visit your nearest public health facility.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  kav: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center', gap: Spacing.lg },

  logoArea: { alignItems: 'center', gap: Spacing.sm },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentInsurance + '33',
    borderWidth: 2, borderColor: Colors.accentInsurance,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: Colors.accentInsurance, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  appName: { color: Colors.textPrimary, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  appSub: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, textAlign: 'center' },

  biometricBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.accentInsurance + '66',
    padding: Spacing.lg,
  },
  biometricIcon: { fontSize: 36 },
  biometricTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemiBold },
  biometricSub: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, marginTop: 2 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },

  form: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, gap: Spacing.md,
  },

  errorBox: {
    backgroundColor: Colors.statusDangerBg, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.statusDanger, padding: Spacing.md,
  },
  errorText: { color: Colors.statusDanger, fontSize: Typography.fontSizeSm },

  field: { gap: Spacing.xs },
  label: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  input: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border, color: Colors.textPrimary, fontSize: Typography.fontSizeMd,
    paddingHorizontal: Spacing.md, height: 48,
  },

  loginBtn: {},
  helpText: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, textAlign: 'center', lineHeight: 18 },
});
