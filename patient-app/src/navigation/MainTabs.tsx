import { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { AppHeader } from "../components/AppHeader";
import { NotificationsModal, SearchModal } from "../components/PortalModals";
import { navigateFromNotification, navigateFromSearch } from "./portalNavigate";
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

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{icon}</Text>
    </View>
  );
}

function usePortalHeader(title: string, crumb: string, onSignOut?: () => void) {
  const rootNav = useNavigation<NavigationProp<RootTabParamList>>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const header = (
    <AppHeader
      title={title}
      crumb={crumb}
      onSignOut={onSignOut}
      onSearch={() => setSearchOpen(true)}
      onNotifications={() => setNotifOpen(true)}
    />
  );

  const modals = (
    <>
      <SearchModal
        visible={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onSelect={(item) => {
          setSearchOpen(false);
          navigateFromSearch(rootNav, item);
        }}
      />
      <NotificationsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onSelect={(n) => {
          setNotifOpen(false);
          navigateFromNotification(rootNav, n);
        }}
      />
    </>
  );

  return { header, modals };
}

function HealthNavigator() {
  const { header, modals } = usePortalHeader("Health", "My Health");
  return (
    <>
      {modals}
      <HealthStack.Navigator
        screenOptions={{
          header: () => header,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <HealthStack.Screen name="HealthHub" component={HealthHubScreen} />
        <HealthStack.Screen name="Appointments" component={AppointmentsScreen} />
        <HealthStack.Screen name="Visits" component={VisitsScreen} />
        <HealthStack.Screen name="Results" component={ResultsScreen} />
        <HealthStack.Screen name="Medications" component={MedicationsScreen} />
        <HealthStack.Screen name="Vitals" component={VitalsScreen} />
        <HealthStack.Screen name="Messages" component={MessagesScreen} />
      </HealthStack.Navigator>
    </>
  );
}

function WalletNavigator() {
  const { header, modals } = usePortalHeader("Wallet", "Payments");
  return (
    <>
      {modals}
      <WalletStack.Navigator
        screenOptions={{
          header: () => header,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <WalletStack.Screen name="WalletHub" component={WalletHubScreen} />
        <WalletStack.Screen name="Coverage" component={CoverageScreen} />
        <WalletStack.Screen name="Contributions" component={ContributionsScreen} />
        <WalletStack.Screen name="Bills" component={BillsScreen} />
        <WalletStack.Screen name="Pay" component={PayScreen} />
      </WalletStack.Navigator>
    </>
  );
}

function MenuNavigator({ onSignOut }: { onSignOut: () => void }) {
  const { header, modals } = usePortalHeader("Menu", "Account", onSignOut);
  return (
    <>
      {modals}
      <MenuStack.Navigator
        screenOptions={{
          header: () => header,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <MenuStack.Screen name="MenuHub" component={MenuHubScreen} />
        <MenuStack.Screen name="Consent" component={ConsentScreen} />
        <MenuStack.Screen name="Profile">{() => <ProfileScreen onSignOut={onSignOut} />}</MenuStack.Screen>
        <MenuStack.Screen name="Records" component={RecordsScreen} />
        <MenuStack.Screen name="Documents" component={DocumentsScreen} />
      </MenuStack.Navigator>
    </>
  );
}

export function MainTabs({ onSignOut }: { onSignOut: () => void }) {
  const { header, modals } = usePortalHeader("My Dashboard", "Home", onSignOut);

  return (
    <>
      {modals}
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
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
            header: () => header,
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
            header: () => <AppHeader title="Messages" crumb="Inbox" onSignOut={onSignOut} />,
            tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} />,
          }}
        />
        <Tab.Screen name="Menu" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="☰" focused={focused} /> }}>
          {() => <MenuNavigator onSignOut={onSignOut} />}
        </Tab.Screen>
      </Tab.Navigator>
    </>
  );
}
