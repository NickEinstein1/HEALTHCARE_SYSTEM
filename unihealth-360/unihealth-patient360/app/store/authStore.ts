// Patient 360 — Auth Store
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface PatientUser {
  id: string;
  name: string;
  email: string;
  memberId: string;
  patientId: string;
}

interface PatientAuthState {
  token: string | null;
  user: PatientUser | null;
  loading: boolean;
  login: (token: string, user: PatientUser) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredToken: () => Promise<void>;
}

export const usePatientAuthStore = create<PatientAuthState>((set) => ({
  token: null,
  user: null,
  loading: false,

  login: async (token, user) => {
    await SecureStore.setItemAsync('patient_auth_token', token);
    await SecureStore.setItemAsync('patient_auth_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('patient_auth_token');
    await SecureStore.deleteItemAsync('patient_auth_user');
    set({ token: null, user: null });
  },

  loadStoredToken: async () => {
    set({ loading: true });
    try {
      const token = await SecureStore.getItemAsync('patient_auth_token');
      const userJson = await SecureStore.getItemAsync('patient_auth_user');
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson) });
      }
    } catch {
      // Non-fatal
    } finally {
      set({ loading: false });
    }
  },
}));
