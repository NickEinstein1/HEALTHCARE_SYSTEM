import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "unihealth.access_token";
const PATIENT_ID_KEY = "unihealth.patient_id";
const SIGNED_IN_KEY = "unihealth.patient.signed_in";

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getPatientId(): Promise<string> {
  return (await AsyncStorage.getItem(PATIENT_ID_KEY)) ?? "";
}

export async function setPatientId(id: string): Promise<void> {
  await AsyncStorage.setItem(PATIENT_ID_KEY, id.trim());
}

export async function isSignedIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(SIGNED_IN_KEY)) === "1";
}

export async function setSignedIn(value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(SIGNED_IN_KEY, "1");
  else await AsyncStorage.removeItem(SIGNED_IN_KEY);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, SIGNED_IN_KEY]);
}
