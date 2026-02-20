import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthLandingScreen } from "../screens/AuthLandingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { SignupScreen } from "../screens/SignupScreen";
import type { AuthStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="AuthLanding"
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: "#0F0B08" },
        headerTintColor: "#EDE5DC",
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: "#0F0B08" },
      }}
    >
      <Stack.Screen
        name="AuthLanding"
        component={AuthLandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign in" }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: "Create account" }}
      />
    </Stack.Navigator>
  );
}
