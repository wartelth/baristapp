import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { setOnboardingSeen } from "../storage/onboardingStorage";
import { useOnboardingComplete } from "../context/OnboardingContext";
import { SpaceBackdrop } from "../components/SpaceBackdrop";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const ONBOARDING_STEPS = [
  {
    icon: "document-text-outline" as const,
    title: "Share your objective",
    subtitle: "Describe the task or workflow you want to support.",
    color: "#2563eb",
  },
  {
    icon: "options-outline" as const,
    title: "Confirm preferences",
    subtitle: "Answer concise prompts so the app fits your context.",
    color: "#7c3aed",
  },
  {
    icon: "rocket-outline" as const,
    title: "Launch and iterate",
    subtitle: "Use, refine, and share mini-apps across devices.",
    color: "#0891b2",
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const orb = useRef(new Animated.Value(0)).current;

  const onComplete = useOnboardingComplete();

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(orb, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [orb]);

  const orbStyle = useMemo(
    () => ({
      opacity: orb.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] }),
      transform: [{ scale: orb.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
    }),
    [orb]
  );

  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const handleFinish = async () => {
    await setOnboardingSeen();
    onComplete?.();
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  const goNext = () => {
    if (isLast) {
      void handleFinish();
      return;
    }
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1));
  };

  return (
    <View style={styles.container}>
      <SpaceBackdrop />
      <Animated.View style={[styles.heroOrb, orbStyle]} />
      <Text style={styles.kicker}>Quick Setup</Text>
      <Text style={styles.title}>SwissKnife</Text>
      <Text style={styles.subtitle}>
        Get started in under a minute.
      </Text>

      <Animated.View style={[styles.card, { opacity: fade }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${current.color}22` }]}>
          <Ionicons name={current.icon} size={34} color={current.color} />
        </View>
        <Text style={styles.cardTitle}>{current.title}</Text>
        <Text style={styles.cardText}>{current.subtitle}</Text>
      </Animated.View>

      <View style={styles.dotRow}>
        {ONBOARDING_STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>{isLast ? "Continue" : "Next"}</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={() => void handleFinish()} activeOpacity={0.75}>
          <Text style={styles.skipBtnText}>Skip intro</Text>
        </TouchableOpacity>
      )}
      {isLast && (
        <Text style={styles.footerHint}>
          You can customize your profile and settings after signing in.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070f",
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  heroOrb: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#5f76f7",
    top: 40,
    alignSelf: "center",
  },
  kicker: {
    color: "#b3c0f8",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    color: "#b0bddf",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "rgba(14, 20, 39, 0.82)",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#243058",
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  cardText: {
    marginTop: 10,
    color: "#a5b1d6",
    textAlign: "center",
    lineHeight: 23,
    fontSize: 15,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38456c",
  },
  dotActive: {
    width: 20,
    borderRadius: 5,
    backgroundColor: "#91a7ff",
  },
  primaryBtn: {
    marginTop: "auto",
    backgroundColor: "#5f76f7",
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  skipBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  skipBtnText: {
    color: "#b3c0f8",
    fontWeight: "600",
    fontSize: 14,
  },
  footerHint: {
    marginTop: 14,
    color: "#8f9fc8",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
  },
});
