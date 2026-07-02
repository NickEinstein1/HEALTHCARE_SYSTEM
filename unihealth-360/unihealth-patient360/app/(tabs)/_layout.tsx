import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../unihealth-shared/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: Array<{ name: string; title: string; icon: IconName; iconFocused: IconName }> = [
  { name: 'index',     title: 'Home',      icon: 'home-outline',          iconFocused: 'home' },
  { name: 'coverage',  title: 'Coverage',  icon: 'shield-outline',        iconFocused: 'shield' },
  { name: 'claims',    title: 'Claims',    icon: 'document-text-outline', iconFocused: 'document-text' },
  { name: 'profile',   title: 'Profile',   icon: 'person-outline',        iconFocused: 'person' },
];

export default function PatientTabsLayout() {
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
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
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
