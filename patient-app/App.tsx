import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { enableFreeze } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Sora_400Regular,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { PatientProvider, usePatient } from "./src/context/PatientContext";
import { ToastBanner } from "./src/components/ToastBanner";
import { BrandSplash } from "./src/components/BrandSplash";
import { MainTabs } from "./src/navigation/MainTabs";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { isSignedIn } from "./src/lib/storage";
import { signOut } from "./src/lib/auth";
import { assertEnvLoaded } from "./src/lib/config";
import { colors } from "./src/theme/colors";

enableFreeze(true);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    border: colors.bdr,
    primary: colors.g,
    text: colors.t1,
  },
};

function AppInner() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { toastMsg } = usePatient();

  useEffect(() => {
    isSignedIn().then(setAuthed);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setAuthed(false);
  }, []);

  if (authed === null) {
    return <BrandSplash />;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {authed ? (
        <MainTabs onSignOut={handleSignOut} />
      ) : (
        <AuthNavigator onSignedIn={() => setAuthed(true)} />
      )}
      <ToastBanner message={toastMsg} />
    </View>
  );
}

export default function App() {
  assertEnvLoaded();

  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_700Bold,
    Sora_800ExtraBold,
    DMSerifDisplay_400Regular,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BrandSplash message="Preparing fonts…" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <PatientProvider>
            <AppInner />
          </PatientProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
