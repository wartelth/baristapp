import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { getProfile, saveProfile } from "../storage/storageLayer";
import { generateRandomName } from "../utils/randomName";
import { AVATAR_COUNT } from "../utils/avatars";
import { saveMySocialProfile } from "../api/client";
import { SpaceBackdrop } from "../components/SpaceBackdrop";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const orbStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) }],
    }),
    [pulse]
  );

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      const existing = getProfile();
      if (!existing) {
        // Backfill profile for existing users who signed up before this feature
        const profile = {
          displayName: generateRandomName(),
          avatarIndex: Math.floor(Math.random() * AVATAR_COUNT),
        };
        saveProfile(profile);
        saveMySocialProfile(profile.displayName, profile.avatarIndex).catch(() => {});
      } else {
        saveMySocialProfile(existing.displayName, existing.avatarIndex).catch(() => {});
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SpaceBackdrop />
      <Animated.View style={[styles.heroOrb, orbStyle]} />
      <View style={styles.content}>
        <Text style={styles.kicker}>Secure Access</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to access your workspace and synced mini-apps.</Text>

        <View style={styles.formCard}>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color="#8090bd" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6f7aa1"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#8090bd" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#6f7aa1"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Sign in</Text>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("Signup")}
        >
          <Text style={styles.linkText}>
            New here? <Text style={styles.linkTextBold}>Create account</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate("AuthLanding")}>
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070f",
    justifyContent: "center",
    padding: 24,
  },
  heroOrb: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#5f76f7",
    top: 20,
    alignSelf: "center",
  },
  content: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  kicker: {
    color: "#b3c0f8",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#b0bddf",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: "rgba(14, 20, 39, 0.82)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#243058",
    overflow: "hidden",
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputDivider: {
    height: 1,
    backgroundColor: "#243058",
  },
  input: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
    paddingVertical: 2,
  },
  button: {
    backgroundColor: "#5f76f7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  link: {
    marginTop: 22,
    alignItems: "center",
  },
  linkText: {
    color: "#a5b1d6",
    fontSize: 15,
  },
  linkTextBold: {
    color: "#b3c0f8",
    fontWeight: "700",
  },
  backLink: {
    alignItems: "center",
    marginTop: 10,
  },
  backLinkText: {
    color: "#8a97bd",
    fontSize: 13,
    fontWeight: "600",
  },
});
