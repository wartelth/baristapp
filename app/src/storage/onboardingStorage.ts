import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_SEEN_KEY = "onboarding:seen";

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return v === "true";
}

export async function setOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}
