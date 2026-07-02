// Provider App — Settings Screen
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { SectionHeader, Divider, PrimaryButton } from '../../unihealth-shared/components';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(true);
  const [autoClaimDraft, setAutoClaimDraft] = React.useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of UniHealth Provider?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? 'DR')[0]}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Dr. J. Kamau'}</Text>
            <Text style={styles.profileRole}>{user?.role ?? 'doctor'}</Text>
            <Text style={styles.profileFacility}>{user?.facilityName ?? 'Nairobi County Hospital'}</Text>
          </View>
        </View>

        <Divider />
        <SectionHeader title="Notifications" />
        <View style={styles.settingsCard}>
          <ToggleRow label="Push notifications" value={pushEnabled} onToggle={setPushEnabled}
            description="Claim status updates, pre-auth decisions" />
          <Divider />
          <ToggleRow label="Flagged-claim alerts" value={true} onToggle={() => {}}
            description="Immediate alert when a claim is AI-flagged" />
        </View>

        <SectionHeader title="Security" />
        <View style={styles.settingsCard}>
          <ToggleRow label="Biometric login" value={biometricEnabled} onToggle={setBiometricEnabled}
            description="Fingerprint / Face ID on app open" />
          <Divider />
          <NavRow label="Change PIN" icon="lock-closed-outline" onPress={() => {}} />
          <Divider />
          <NavRow label="Active sessions" icon="phone-portrait-outline" onPress={() => {}} />
        </View>

        <SectionHeader title="Claims" />
        <View style={styles.settingsCard}>
          <ToggleRow label="Auto-draft claims from encounters"
            value={autoClaimDraft} onToggle={setAutoClaimDraft}
            description="Automatically create a draft claim when an encounter is closed" />
          <Divider />
          <NavRow label="Default payer routing" icon="git-network-outline" onPress={() => {}} />
        </View>

        <SectionHeader title="About" />
        <View style={styles.settingsCard}>
          <NavRow label="Privacy Policy" icon="document-text-outline" onPress={() => {}} />
          <Divider />
          <NavRow label="Terms of Use" icon="document-outline" onPress={() => {}} />
          <Divider />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>App Version</Text>
            <Text style={styles.versionValue}>1.0.0 (build 1)</Text>
          </View>
          <Divider />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>API Environment</Text>
            <Text style={styles.versionValue}>{process.env.EXPO_PUBLIC_API_BASE_URL ?? 'api.unihealth360.ke'}</Text>
          </View>
        </View>

        <PrimaryButton label="Sign Out" onPress={handleLogout} variant="secondary" style={styles.signOut} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ToggleRow = ({
  label, description, value, onToggle,
}: { label: string; description?: string; value: boolean; onToggle: (v: boolean) => void }) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleInfo}>
      <Text style={styles.rowLabel}>{label}</Text>
      {description && <Text style={styles.rowDesc}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: Colors.border, true: Colors.accentInsurance + '88' }}
      thumbColor={value ? Colors.accentInsurance : Colors.textMuted}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    />
  </View>
);

const NavRow = ({
  label, icon, onPress,
}: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) => (
  <TouchableOpacity style={styles.navRow} onPress={onPress} accessibilityRole="menuitem">
    <Ionicons name={icon} size={18} color={Colors.textSecondary} />
    <Text style={styles.rowLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  profileCard: {
    flexDirection: 'row', gap: Spacing.lg, alignItems: 'center',
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accentInsurance + '33',
    borderWidth: 2, borderColor: Colors.accentInsurance, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.accentInsurance, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { color: Colors.textPrimary, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightBold },
  profileRole: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm },
  profileFacility: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  settingsCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md, gap: Spacing.md,
  },
  toggleInfo: { flex: 1, gap: 2 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowLabel: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, flex: 1 },
  rowDesc: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md },
  versionLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },
  versionValue: { color: Colors.textSecondary, fontSize: Typography.fontSizeSm },
  signOut: { marginTop: Spacing.sm },
});
