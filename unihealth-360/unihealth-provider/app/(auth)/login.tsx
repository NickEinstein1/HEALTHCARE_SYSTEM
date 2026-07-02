// Provider App — Login Screen (Keycloak OIDC)
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '../../../unihealth-shared/tokens';
import { PrimaryButton } from '../../../unihealth-shared/components';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter your credentials.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // In production: POST to Keycloak /realms/unihealth/protocol/openid-connect/token
      // Mock auth for development:
      await new Promise((r) => setTimeout(r, 800));
      await login('mock_jwt_token_' + Date.now(), {
        id: 'user-001',
        name: username,
        role: 'doctor',
        facilityId: 'FAC-001',
        facilityName: 'Nairobi County Hospital',
        email: `${username}@hospital.ke`,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>UH</Text>
            </View>
            <Text style={styles.appName}>UniHealth Provider</Text>
            <Text style={styles.appSub}>Clinical & Insurance Portal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubtitle}>
              Use your UniHealth 360 credentials (Keycloak SSO)
            </Text>

            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Username or Email</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="doctor@hospital.ke"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Username or email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                accessibilityLabel="Password"
              />
            </View>

            <PrimaryButton
              label={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginBtn}
            />

            <Text style={styles.ssoNote}>
              SSO powered by Keycloak — realm: unihealth{'\n'}
              Contact your facility administrator to reset credentials.
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
  content: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },

  logoArea: { alignItems: 'center', marginBottom: Spacing.section },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentInsurance + '33',
    borderWidth: 2, borderColor: Colors.accentInsurance,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: { color: Colors.accentInsurance, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  appName: { color: Colors.textPrimary, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  appSub: { color: Colors.textMuted, fontSize: Typography.fontSizeSm, marginTop: 4 },

  form: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  formTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  formSubtitle: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },

  errorBox: {
    backgroundColor: Colors.statusDangerBg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.statusDanger,
    padding: Spacing.md,
  },
  errorText: { color: Colors.statusDanger, fontSize: Typography.fontSizeSm },

  field: { gap: Spacing.xs },
  label: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  input: {
    backgroundColor: Colors.bgSurfaceRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizeMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    height: 48,
  },

  loginBtn: { marginTop: Spacing.sm },
  ssoNote: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizeXs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
});
