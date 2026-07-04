import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UhicRole } from "../types/uhic";

const ROLE_KEY = "uhic.role";
const FACILITY_KEY = "uhic.facility_id";
const SIGNED_IN_KEY = "uhic.signed_in";
const DISPLAY_NAME_KEY = "uhic.display_name";

export async function getRole(): Promise<string> {
  return (await AsyncStorage.getItem(ROLE_KEY)) ?? "";
}

export async function setRole(role: UhicRole): Promise<void> {
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function getFacilityId(): Promise<string> {
  return (await AsyncStorage.getItem(FACILITY_KEY)) ?? "";
}

export async function setFacilityId(id: string): Promise<void> {
  await AsyncStorage.setItem(FACILITY_KEY, id.trim());
}

export async function getDisplayName(): Promise<string> {
  return (await AsyncStorage.getItem(DISPLAY_NAME_KEY)) ?? "UHIC Operator";
}

export async function setDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(DISPLAY_NAME_KEY, name.trim() || "UHIC Operator");
}

export async function isSignedIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(SIGNED_IN_KEY)) === "1";
}

export async function setSignedIn(value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(SIGNED_IN_KEY, "1");
  else await AsyncStorage.removeItem(SIGNED_IN_KEY);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SIGNED_IN_KEY]);
}
