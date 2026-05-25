import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { PortalChrome, usePortalChrome } from "./PortalChrome";
import { PortalStackHeader, portalHeader } from "./PortalStackHeader";
import { fastStackScreenOptions } from "./navigationConfig";
import { HomeScreen } from "../screens/HomeScreen";
import { HealthHubScreen } from "../screens/hubs/HealthHubScreen";
import { WalletHubScreen } from "../screens/hubs/WalletHubScreen";
import { MenuHubScreen } from "../screens/hubs/MenuHubScreen";
import { AppointmentsScreen } from "../screens/AppointmentsScreen";
import { MedicationsScreen } from "../screens/MedicationsScreen";
import { VitalsScreen } from "../screens/VitalsScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { VisitsScreen } from "../screens/VisitsScreen";
import { CoverageScreen } from "../screens/CoverageScreen";
import { ContributionsScreen } from "../screens/ContributionsScreen";
import { BillsScreen } from "../screens/BillsScreen";
import { PayScreen } from "../screens/PayScreen";
import { ConsentScreen } from "../screens/ConsentScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecordsScreen } from "../screens/RecordsScreen";
import { DocumentsScreen } from "../screens/DocumentsScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import type {
  HealthStackParamList,
  MenuStackParamList,
  RootTabParamList,
  WalletStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const HealthStack = createNativeStackNavigator<HealthStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const MenuStack = createNativeStackNavigator<MenuStackParamList>();

const stackOptions = {
  ...fastStackScreenOptions,
  header: PortalStackHeader,
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{icon}</Text>
    </View>
  );
}

function HealthNavigator() {
  return (
    <HealthStack.Navigator screenOptions={stackOptions}>
      <HealthStack.Screen
        name="HealthHub"
        component={HealthHubScreen}
        options={portalHeader({ title: "Health", crumb: "My Health" })}
      />
      <HealthStack.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={portalHeader({ title: "Appointments", crumb: "Health" })}
      />
      <HealthStack.Screen
        name="Visits"
        component={VisitsScreen}
        options={portalHeader({ title: "Visit History", crumb: "Health" })}
      />
      <HealthStack.Screen
        name="Results"
        component={ResultsScreen}
        options={portalHeader({ title: "Test Results", crumb: "Health" })}
      />
      <HealthStack.Screen
        name="Medications"
        component={MedicationsScreen}
        options={portalHeader({ title: "Medications", crumb: "Health" })}
      />
      <HealthStack.Screen
        name="Vitals"
        component={VitalsScreen}
        options={portalHeader({ title: "Vitals & Trends", crumb: "Health" })}
      />
      <HealthStack.Screen
        name="Messages"
        component={MessagesScreen}
        options={portalHeader({ title: "Messages", crumb: "Health" })}
      />
    </HealthStack.Navigator>
  );
}

function WalletNavigator() {
  return (
    <WalletStack.Navigator screenOptions={stackOptions}>
      <WalletStack.Screen
        name="WalletHub"
        component={WalletHubScreen}
        options={portalHeader({ title: "Wallet & Cover", crumb: "Payments" })}
      />
      <WalletStack.Screen
        name="Coverage"
        component={CoverageScreen}
        options={portalHeader({ title: "My Cover", crumb: "Payments" })}
      />
      <WalletStack.Screen
        name="Contributions"
        component={ContributionsScreen}
        options={portalHeader({ title: "Contributions", crumb: "Payments" })}
      />
      <WalletStack.Screen
        name="Bills"
        component={BillsScreen}
        options={portalHeader({ title: "Bills & Invoices", crumb: "Payments" })}
      />
      <WalletStack.Screen
        name="Pay"
        component={PayScreen}
        options={portalHeader({ title: "Make a Payment", crumb: "Payments" })}
      />
    </WalletStack.Navigator>
  );
}

function MenuNavigator({ onSignOut }: { onSignOut: () => void }) {
  return (
    <MenuStack.Navigator screenOptions={stackOptions}>
      <MenuStack.Screen
        name="MenuHub"
        component={MenuHubScreen}
        options={portalHeader({ title: "Menu", crumb: "Account" })}
      />
      <MenuStack.Screen
        name="Consent"
        component={ConsentScreen}
        options={portalHeader({ title: "Privacy & Consent", crumb: "Account" })}
      />
      <MenuStack.Screen name="Profile" options={portalHeader({ title: "My Profile", crumb: "Account", showSignOut: true })}>
        {() => <ProfileScreen onSignOut={onSignOut} />}
      </MenuStack.Screen>
      <MenuStack.Screen
        name="Records"
        component={RecordsScreen}
        options={portalHeader({ title: "Health Records", crumb: "Account" })}
      />
      <MenuStack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={portalHeader({ title: "Documents", crumb: "Account" })}
      />
    </MenuStack.Navigator>
  );
}

export function MainTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <PortalChrome onSignOut={onSignOut}>
      <MainTabsInner onSignOut={onSignOut} />
    </PortalChrome>
  );
}

function MainTabsInner({ onSignOut }: { onSignOut: () => void }) {
  const { renderHeader } = usePortalChrome();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.gd,
        tabBarInactiveTintColor: colors.t3,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.bdr,
          borderTopWidth: 1.5,
          height: 58,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 9 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: true,
          header: () => <>{renderHeader("My Dashboard", "Home", true)}</>,
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Health"
        component={HealthNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💗" focused={focused} /> }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💳" focused={focused} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          headerShown: true,
          header: () => <>{renderHeader("Messages", "Inbox")}</>,
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} />,
        }}
      />
      <Tab.Screen name="Menu" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} /> }}>
        {() => <MenuNavigator onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
