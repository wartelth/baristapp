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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { saveProfile } from "../storage/storageLayer";
import { generateRandomName } from "../utils/randomName";
import { AVATAR_COUNT, getAvatarUrl } from "../utils/avatars";
import { saveMySocialProfile } from "../api/client";
import { SpaceBackdrop } from "../components/SpaceBackdrop";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(() => Math.floor(Math.random() * AVATAR_COUNT));
  const pulse = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const orbStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.52] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }],
    }),
    [pulse]
  );

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      // Auto-generate profile with random name + avatar
      const profile = {
        displayName: generateRandomName(),
        avatarIndex: previewAvatar,
      };
      saveProfile(profile);
      saveMySocialProfile(profile.displayName, profile.avatarIndex).catch(() => {});
      Alert.alert(
        "Check your email",
        "We've sent you a confirmation link. Verify your email to sign in."
      );
      navigation.navigate("Login");
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
        <Text style={styles.kicker}>Create Account</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Set up your workspace to build and manage mini-apps across devices.</Text>

        <View style={styles.avatarPreviewCard}>
          <Image source={{ uri: getAvatarUrl(previewAvatar) }} style={styles.avatarPreview} />
          <View style={styles.avatarTextCol}>
            <Text style={styles.avatarTitle}>Starter avatar ready</Text>
            <TouchableOpacity onPress={() => setPreviewAvatar(Math.floor(Math.random() * AVATAR_COUNT))}>
              <Text style={styles.avatarAction}>Change avatar</Text>
            </TouchableOpacity>
          </View>
        </View>

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
            <Ionicons name="shield-checkmark-outline" size={18} color="#8090bd" />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#6f7aa1"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Create account</Text>
              <Ionicons name="rocket-outline" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkTextBold}>Sign in</Text>
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#5f76f7",
    top: 0,
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
    marginBottom: 16,
  },
  avatarPreviewCard: {
    backgroundColor: "rgba(14, 20, 39, 0.82)",
    borderWidth: 1,
    borderColor: "#243058",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#182446",
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  avatarAction: {
    marginTop: 4,
    color: "#b3c0f8",
    fontWeight: "600",
    fontSize: 13,
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
