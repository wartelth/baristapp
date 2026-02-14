import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CreateScreen } from "./src/screens/CreateScreen";
import { MiniAppScreen } from "./src/screens/MiniAppScreen";
import { initStorage } from "./src/storage/storageLayer";

export type RootStackParamList = {
  Home: undefined;
  Create: undefined;
  MiniApp: { appId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: "#111118" },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "600" as const },
  contentStyle: { backgroundColor: "#111118" },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "SwissKnife" }}
        />
        <Stack.Screen
          name="Create"
          component={CreateScreen}
          options={{ title: "New Mini-App" }}
        />
        <Stack.Screen
          name="MiniApp"
          component={MiniAppScreen}
          options={{ title: "Loading..." }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111118",
  },
});
