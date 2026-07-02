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
import { useAuthStore } from './store/authStore';
import { toastConfig } from './components/toastConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const { loadStoredToken } = useAuthStore();

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
            <Stack.Screen
              name="claims/[id]"
              options={{ title: 'Claim Detail', headerBackTitle: 'Claims' }}
            />
            <Stack.Screen
              name="encounters/[id]"
              options={{ title: 'Encounter Detail', headerBackTitle: 'Encounters' }}
            />
            <Stack.Screen
              name="preauth/[id]"
              options={{ title: 'Pre-Authorization', headerBackTitle: 'Pre-Auth' }}
            />
            <Stack.Screen
              name="audit/review/[id]"
              options={{ title: 'Claim Review', headerBackTitle: 'Audit Queue' }}
            />
          </Stack>
          <Toast config={toastConfig} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgPage },
});
