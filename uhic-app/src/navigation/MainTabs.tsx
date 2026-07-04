import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { DashboardScreen } from "../screens/DashboardScreen";
import { MembersScreen } from "../screens/MembersScreen";
import { UnderwritingScreen } from "../screens/UnderwritingScreen";
import { PremiumsScreen } from "../screens/PremiumsScreen";
import { ClaimsScreen } from "../screens/ClaimsScreen";
import { ActuarialScreen } from "../screens/ActuarialScreen";
import { FraudScreen } from "../screens/FraudScreen";
import { MenuScreen } from "../screens/MenuScreen";
import { colors, gradients } from "../theme/colors";
import { fonts } from "../theme/typography";
import { shadows } from "../theme/shadows";
import type { OpsStackParamList, RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const OpsStack = createNativeStackNavigator<OpsStackParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
  );
}

function OpsNavigator() {
  return (
    <OpsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.violetDark,
        headerTitleStyle: { fontFamily: fonts.sansBold, fontSize: 15 },
      }}
    >
      <OpsStack.Screen name="Members" component={MembersScreen} options={{ title: "Members" }} />
      <OpsStack.Screen name="Underwriting" component={UnderwritingScreen} options={{ title: "Underwriting" }} />
    </OpsStack.Navigator>
  );
}

function TabHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.hero} style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.headerBadge}>UHIC</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

export function MainTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        lazy: false,
        tabBarActiveTintColor: colors.violet,
        tabBarInactiveTintColor: colors.t3,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.bdr,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          ...shadows.tabBar,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 9 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          header: () => <TabHeader title="Scheme Overview" subtitle="Actuarial KPIs" />,
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Operations"
        component={OpsNavigator}
        options={{
          headerShown: false,
          tabBarLabel: "Members",
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Claims"
        component={ClaimsScreen}
        options={{
          header: () => <TabHeader title="Claims" subtitle="Encounter-bound adjudication" />,
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Actuarial"
        component={ActuarialStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🔬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Risk"
        component={FraudScreen}
        options={{
          header: () => <TabHeader title="Fraud & Risk" subtitle="Provider scorecards" />,
          tabBarLabel: "Risk",
          tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        options={{
          header: () => <TabHeader title="Menu" />,
          tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} />,
        }}
      >
        {() => <MenuScreen onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ActuarialStack() {
  const Stack = createNativeStackNavigator();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.violetDark,
        headerTitleStyle: { fontFamily: fonts.sansBold, fontSize: 15 },
      }}
    >
      <Stack.Screen name="ActuarialMain" component={ActuarialScreen} options={{ title: "Actuarial Science" }} />
      <Stack.Screen name="Premiums" component={PremiumsScreen} options={{ title: "Premiums & SHIF" }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerBadge: {
    fontFamily: fonts.sansExtra,
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.w },
  headerSub: { fontFamily: fonts.sans, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  iconWrap: { padding: 4, borderRadius: 8 },
  iconWrapActive: { backgroundColor: colors.violetLight },
  icon: { fontSize: 20 },
});
