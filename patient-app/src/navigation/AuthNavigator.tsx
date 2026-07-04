import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { authStackScreenOptions } from "./navigationConfig";
import { LandingScreen } from "../screens/landing/LandingScreen";
import { PatientSignInScreen } from "../screens/auth/PatientSignInScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { MfaScreen } from "../screens/auth/MfaScreen";
import { AuthSuccessScreen } from "../screens/auth/AuthSuccessScreen";

export type AuthStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  Register: undefined;
  Mfa: {
    phone: string;
    flow: "signIn" | "register";
    displayName?: string;
    patientId?: string;
    pin?: string;
  };
  AuthSuccess: {
    flow: "signIn" | "register";
    displayName?: string;
    patientId?: string;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = { onSignedIn: () => void };

export function AuthNavigator({ onSignedIn }: Props) {
  return (
    <Stack.Navigator screenOptions={authStackScreenOptions} initialRouteName="Landing">
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="SignIn" component={PatientSignInScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Mfa" component={MfaScreen} />
      <Stack.Screen name="AuthSuccess">
        {(props) => <AuthSuccessScreen {...props} onSignedIn={onSignedIn} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
