import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CreateScreen } from "./src/screens/CreateScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { MiniAppScreen } from "./src/screens/MiniAppScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { AuthStack } from "./src/navigation/AuthStack";
import { initStorage } from "./src/storage/storageLayer";
import { initDeviceId } from "./src/api/supabaseClient";
import { hasSeenOnboarding } from "./src/storage/onboardingStorage";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { GenerationProvider, useGeneration } from "./src/context/GenerationContext";
import { AppThemeProvider, useAppTheme } from "./src/context/AppThemeContext";
import { HeaderSpinner } from "./src/components/HeaderSpinner";
import { NotificationToast } from "./src/components/NotificationToast";
import { LoadingOverlay } from "./src/components/LoadingOverlay";
import type { RootStackParamList, TabParamList } from "./src/types/navigation";

// Re-export for any legacy imports
export type { RootStackParamList } from "./src/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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

// ---------------------------------------------------------------------------
// Custom center tab button for Create
// ---------------------------------------------------------------------------

function CreateTabButton({ onPress }: { onPress?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={tabStyles.createButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[tabStyles.createButtonInner, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Bottom tabs
// ---------------------------------------------------------------------------

function MainTabs() {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" as const },
        headerRight: () => <HeaderSpinner />,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.surface,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: tabStyles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Library"
        component={HomeScreen}
        options={{
          title: "Library",
          headerTitle: "",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        options={{
          title: "New App",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <CreateTabButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerTitle: "",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root stack: onboarding, auth, tabs, mini-app
// ---------------------------------------------------------------------------

function AppNavigator() {
  const navRef =
    React.useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { session, loading: authLoading } = useAuth();
  const { mode, colors } = useAppTheme();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  const headerOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: "600" as const },
    contentStyle: { backgroundColor: colors.background },
    headerRight: () => <HeaderSpinner />,
  };

  useEffect(() => {
    hasSeenOnboarding().then(setOnboardingSeen);
  }, []);

  const handleTapApp = (appId: string) => {
    navRef.current?.navigate("MiniApp", { appId });
  };

  const handleOnboardingComplete = () => {
    setOnboardingSeen(true);
  };

  // Navigate when auth state changes
  useEffect(() => {
    if (!navRef.current || onboardingSeen === null) return;
    if (session && onboardingSeen) {
      navRef.current.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } else if (!session && onboardingSeen) {
      navRef.current.reset({ index: 0, routes: [{ name: "Auth" }] });
    }
  }, [session, onboardingSeen]);

  if (onboardingSeen === null || authLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initialRoute = !onboardingSeen
    ? "Onboarding"
    : session
      ? "MainTabs"
      : "Auth";

  return (
    <NavigationContainer ref={navRef}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={headerOptions}
        initialRouteName={initialRoute}
      >
        <Stack.Screen
          name="Onboarding"
          options={{ headerShown: false }}
        >
          {(props) => (
            <OnboardingProvider onComplete={handleOnboardingComplete}>
              <OnboardingScreen {...props} />
            </OnboardingProvider>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
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

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([initStorage(), initDeviceId()]).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <GenerationProvider>
          <AppNavigator />
        </GenerationProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111118",
  },
});

const tabStyles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  createButton: {
    top: -16,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
