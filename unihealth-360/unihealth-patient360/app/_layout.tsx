import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { StyleSheet } from 'react-native';
import { Colors } from '../unihealth-shared/tokens';
import { usePatientAuthStore } from './store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60_000 } },
});

export default function RootLayout() {
  const { loadStoredToken } = usePatientAuthStore();

  useEffect(() => {
    loadStoredToken();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.bgPage} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.bgSurface },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colors.bgPage },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="claims/[id]" options={{ title: 'Claim Detail', headerBackTitle: 'Claims' }} />
            <Stack.Screen name="eob/[id]" options={{ title: 'Explanation of Benefits', headerBackTitle: 'Claims' }} />
            <Stack.Screen name="premium/pay" options={{ title: 'Pay Premium', headerBackTitle: 'Coverage' }} />
            <Stack.Screen name="dependants/manage" options={{ title: 'Manage Dependants', headerBackTitle: 'Profile' }} />
            <Stack.Screen name="documents/upload" options={{ title: 'Upload Document', headerBackTitle: 'Documents' }} />
          </Stack>
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.bgPage } });
