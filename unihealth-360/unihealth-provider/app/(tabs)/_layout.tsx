import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../unihealth-shared/tokens';
import { useAuthStore } from '../store/authStore';

// Role → visible tabs mapping
const ROLE_TABS: Record<string, string[]> = {
  doctor:              ['index', 'encounters', 'claims', 'compliance'],
  nurse:               ['index', 'encounters', 'claims'],
  claims_adjudicator:  ['index', 'claims', 'compliance', 'audit'],
  compliance_auditor:  ['index', 'compliance', 'audit'],
  underwriter:         ['index', 'underwriting', 'compliance'],
  scheme_finance:      ['index', 'finance', 'compliance'],
  admin:               ['index', 'encounters', 'claims', 'compliance', 'audit', 'settings'],
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_META: Record<string, { title: string; icon: IconName; iconFocused: IconName }> = {
  index:        { title: 'Dashboard',    icon: 'home-outline',          iconFocused: 'home' },
  encounters:   { title: 'Encounters',   icon: 'medkit-outline',        iconFocused: 'medkit' },
  claims:       { title: 'Claims',       icon: 'document-text-outline', iconFocused: 'document-text' },
  compliance:   { title: 'Compliance',   icon: 'shield-outline',        iconFocused: 'shield' },
  audit:        { title: 'Audit Queue',  icon: 'flag-outline',          iconFocused: 'flag' },
  underwriting: { title: 'Underwriting', icon: 'calculator-outline',    iconFocused: 'calculator' },
  finance:      { title: 'Finance',      icon: 'bar-chart-outline',     iconFocused: 'bar-chart' },
  settings:     { title: 'Settings',     icon: 'settings-outline',      iconFocused: 'settings' },
};

export default function TabsLayout() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'doctor';
  const allowed = ROLE_TABS[role] ?? ROLE_TABS.doctor;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.bgSurface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 60 : 80,
          paddingBottom: Platform.OS === 'android' ? 8 : 20,
        },
        tabBarActiveTintColor: Colors.accentInsurance,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: Colors.bgSurface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      {Object.entries(TAB_META).map(([name, meta]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: meta.title,
            href: allowed.includes(name) ? undefined : null,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? meta.iconFocused : meta.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
