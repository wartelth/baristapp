import AsyncStorage from "@react-native-async-storage/async-storage";

const DATA_CONSENT_KEY = "privacy:data-consent-v1";

export async function hasDataConsent(): Promise<boolean> {
  const value = await AsyncStorage.getItem(DATA_CONSENT_KEY);
  return value === "true";
}

export async function setDataConsent(consented: boolean): Promise<void> {
  await AsyncStorage.setItem(DATA_CONSENT_KEY, consented ? "true" : "false");
}
