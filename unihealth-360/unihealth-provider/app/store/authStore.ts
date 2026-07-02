// Provider App — Auth Store (Zustand)
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  role: string;
  facilityId: string;
  facilityName: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,

  login: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    set({ token: null, user: null });
  },

  loadStoredToken: async () => {
    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userJson = await SecureStore.getItemAsync('auth_user');
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson) });
      }
    } catch {
      // Token load failure is non-fatal; user will see login screen
    } finally {
      set({ loading: false });
    }
  },
}));
