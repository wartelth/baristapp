import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { SpaceBackdrop } from "../components/SpaceBackdrop";

type Props = NativeStackScreenProps<AuthStackParamList, "AuthLanding">;

const PRODUCT_STEPS = [
  { icon: "document-text-outline" as const, title: "Describe your workflow", subtitle: "Tell SwissKnife what you need to build." },
  { icon: "options-outline" as const, title: "Refine requirements", subtitle: "Answer quick prompts to tailor the result." },
  { icon: "checkmark-done-outline" as const, title: "Deploy instantly", subtitle: "Use your mini-app and manage it from one place." },
];

export function AuthLandingScreen({ navigation }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const orbStyle = useMemo(
    () => ({
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.12],
          }),
        },
      ],
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
      }),
    }),
    [pulse]
  );

  return (
    <View style={styles.container}>
      <SpaceBackdrop />
      <Animated.View style={[styles.heroOrb, orbStyle]} />
      <Text style={styles.kicker}>AI App Studio</Text>
      <Text style={styles.title}>Welcome to SwissKnife</Text>
      <Text style={styles.subtitle}>
        Build practical mini-apps for work and life in minutes, with a clean and secure workflow.
      </Text>

      <View style={styles.stepsCard}>
        {PRODUCT_STEPS.map((step, idx) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepIconWrap}>
              <Ionicons name={step.icon} color="#9eb2ff" size={18} />
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>
                {idx + 1}. {step.title}
              </Text>
              <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Signup")}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Get started</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Login")}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryBtnText}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070f",
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 34,
  },
  heroOrb: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#5f76f7",
    top: 28,
    alignSelf: "center",
  },
  kicker: {
    color: "#b3c0f8",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 32,
    marginTop: 8,
  },
  subtitle: {
    color: "#b0bddf",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 26,
  },
  stepsCard: {
    backgroundColor: "rgba(14, 20, 39, 0.82)",
    borderWidth: 1,
    borderColor: "#243058",
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1b2850",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  stepSubtitle: {
    color: "#a1aed2",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  primaryBtn: {
    marginTop: "auto",
    backgroundColor: "#5f76f7",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#b3c0f8",
    fontSize: 15,
    fontWeight: "600",
  },
});
