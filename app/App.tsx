import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CreateScreen } from "./src/screens/CreateScreen";
import { MiniAppScreen } from "./src/screens/MiniAppScreen";
import { initStorage } from "./src/storage/storageLayer";
import { initDeviceId } from "./src/api/supabaseClient";
import { GenerationProvider, useGeneration } from "./src/context/GenerationContext";
import { HeaderSpinner } from "./src/components/HeaderSpinner";
import { NotificationToast } from "./src/components/NotificationToast";
import { LoadingOverlay } from "./src/components/LoadingOverlay";

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
  headerRight: () => <HeaderSpinner />,
};

/** Dismissable progress overlay — shown when the user taps the header spinner. */
function ProgressModal() {
  const { busy, progressVisible, toggleProgress, busySince } = useGeneration();

  if (!busy || !progressVisible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={toggleProgress}>
      <LoadingOverlay startTime={busySince} onClose={toggleProgress} />
    </Modal>
  );
}

function AppNavigator() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const handleTapApp = (appId: string) => {
    navRef.current?.navigate("MiniApp", { appId });
  };

  return (
    <NavigationContainer ref={navRef}>
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
      <NotificationToast onTapAppId={handleTapApp} />
      <ProgressModal />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([initStorage(), initDeviceId()]).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <GenerationProvider>
      <AppNavigator />
    </GenerationProvider>
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
