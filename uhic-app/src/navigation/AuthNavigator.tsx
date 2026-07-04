import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SignInScreen } from "../screens/auth/SignInScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator({ onSignedIn }: { onSignedIn: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn">{() => <SignInScreen onSignedIn={onSignedIn} />}</Stack.Screen>
    </Stack.Navigator>
  );
}
