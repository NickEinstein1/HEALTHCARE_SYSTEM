// Patient 360 — Profile Screen
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../../unihealth-shared/tokens';
import { SectionHeader, Divider, PrimaryButton } from '../../unihealth-shared/components';
import { usePatientAuthStore } from '../store/authStore';

const MENU_ITEMS = [
  { icon: 'people-outline' as const, label: 'Manage Dependants', route: '/dependants/manage', badge: '3' },
  { icon: 'document-outline' as const, label: 'My Documents', route: '/documents/upload', badge: null },
  { icon: 'notifications-outline' as const, label: 'Notifications', route: null, badge: '2' },
  { icon: 'lock-closed-outline' as const, label: 'Security & Biometrics', route: null, badge: null },
  { icon: 'help-circle-outline' as const, label: 'Help & FAQ', route: null, badge: null },
  { icon: 'information-circle-outline' as const, label: 'About UniHealth 360', route: null, badge: null },
];

export default function PatientProfileScreen() {
  const { user, logout } = usePatientAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? 'JW')[0]}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'Jane Wanjiku'}</Text>
            <Text style={styles.profileId}>SHIF-00291847</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'jane@example.ke'}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>5</Text>
            <Text style={styles.quickStatLabel}>Claims</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>3</Text>
            <Text style={styles.quickStatLabel}>Dependants</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>Active</Text>
            <Text style={styles.quickStatLabel}>Status</Text>
          </View>
        </View>

        <Divider />

        {/* Menu */}
        <SectionHeader title="Account" />
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => item.route && router.push(item.route as any)}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={20} color={Colors.accentInsurance} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
              {i < MENU_ITEMS.length - 1 && <Divider style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Consent Management */}
        <SectionHeader title="Data & Consent" subtitle="Manage how your health data is used" />
        <View style={styles.consentCard}>
          <View style={styles.consentRow}>
            <View>
              <Text style={styles.consentLabel}>Treatment data access</Text>
              <Text style={styles.consentDesc}>Clinical staff at your registered facility</Text>
            </View>
            <View style={styles.consentActive}><Text style={styles.consentActiveText}>Granted</Text></View>
          </View>
          <Divider />
          <View style={styles.consentRow}>
            <View>
              <Text style={styles.consentLabel}>Insurance claim processing</Text>
              <Text style={styles.consentDesc}>SHA, your registered insurer</Text>
            </View>
            <View style={styles.consentActive}><Text style={styles.consentActiveText}>Granted</Text></View>
          </View>
          <Divider />
          <View style={styles.consentRow}>
            <View>
              <Text style={styles.consentLabel}>Anonymized research</Text>
              <Text style={styles.consentDesc}>National health data bank (opt-in)</Text>
            </View>
            <View style={styles.consentInactive}><Text style={styles.consentInactiveText}>Not granted</Text></View>
          </View>
        </View>

        <PrimaryButton
          label="Sign Out"
          onPress={handleLogout}
          variant="secondary"
          style={styles.signOutBtn}
        />

        <Text style={styles.version}>UniHealth 360 Patient App v1.0.0</Text>
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, gap: Spacing.sm },

  profileHeader: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'center', marginBottom: Spacing.sm },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.accentInsurance + '33', borderWidth: 2, borderColor: Colors.accentInsurance,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.accentInsurance, fontSize: Typography.fontSize2xl, fontWeight: Typography.fontWeightBold },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  profileId: { color: Colors.accentInsurance, fontSize: Typography.fontSizeSm },
  profileEmail: { color: Colors.textMuted, fontSize: Typography.fontSizeSm },

  quickStats: {
    flexDirection: 'row', backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, alignItems: 'center',
  },
  quickStat: { flex: 1, alignItems: 'center', gap: 4 },
  quickStatValue: { color: Colors.textPrimary, fontSize: Typography.fontSizeXl, fontWeight: Typography.fontWeightBold },
  quickStatLabel: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },
  quickStatDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  menuCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  menuLabel: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSizeMd },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  menuBadge: {
    backgroundColor: Colors.accentInsurance, borderRadius: Radius.full,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  menuBadgeText: { color: Colors.white, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightBold },
  menuDivider: { marginVertical: 0 },

  consentCard: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.xs,
  },
  consentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  consentLabel: { color: Colors.textPrimary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
  consentDesc: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, marginTop: 2 },
  consentActive: {
    backgroundColor: Colors.statusSuccessBg, borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.statusSuccess, paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  consentActiveText: { color: Colors.statusSuccess, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },
  consentInactive: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  consentInactiveText: { color: Colors.textMuted, fontSize: Typography.fontSizeXs },

  signOutBtn: { marginTop: Spacing.md },
  version: { color: Colors.textMuted, fontSize: Typography.fontSizeXs, textAlign: 'center', marginTop: Spacing.xs },
  bottomPad: { height: Spacing.section },
});
