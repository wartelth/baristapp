import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { setOnboardingSeen } from "../storage/onboardingStorage";
import { useOnboardingComplete } from "../context/OnboardingContext";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const TILES = [
  {
    icon: "sparkles" as const,
    title: "AI-Powered",
    subtitle: "Describe what you need, get a mini-app in seconds",
    color: "#1e40af",
  },
  {
    icon: "grid" as const,
    title: "Your Library",
    subtitle: "All your tools in one place",
    color: "#7c3aed",
  },
  {
    icon: "cloud" as const,
    title: "Cloud Sync",
    subtitle: "Access your apps on any device",
    color: "#2563eb",
  },
  {
    icon: "shield-checkmark" as const,
    title: "Safe & Private",
    subtitle: "No code execution, declarative only",
    color: "#059669",
  },
];

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 48) / 2 - 8;

export function OnboardingScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [visibleTiles, setVisibleTiles] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const timers = TILES.map((_, i) =>
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setVisibleTiles((n) => Math.max(n, i + 1));
      }, 120 * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const onComplete = useOnboardingComplete();

  const handleGetStarted = async () => {
    await setOnboardingSeen();
    onComplete?.();
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title}>SwissKnife</Text>
        <Text style={styles.subtitle}>
          Your personal AI mini-app generator
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.tilesContainer}
        showsVerticalScrollIndicator={false}
      >
        {TILES.map((tile, index) => (
          <Animated.View
            key={tile.title}
            style={[
              styles.tileWrapper,
              {
                opacity: visibleTiles > index ? 1 : 0,
                transform: [
                  {
                    scale: visibleTiles > index ? 1 : 0.8,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.tile, { borderColor: tile.color + "40" }]}
              activeOpacity={0.9}
            >
              <View style={[styles.tileIcon, { backgroundColor: tile.color + "30" }]}>
                <Ionicons name={tile.icon} size={32} color={tile.color} />
              </View>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#888",
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  tilesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 24,
  },
  tileWrapper: {
    width: (width - 48) / 2 - 8,
  },
  tile: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 20,
    minHeight: TILE_SIZE,
    borderWidth: 1,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  tileTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  tileSubtitle: {
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 48,
  },
  button: {
    backgroundColor: "#1e40af",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
