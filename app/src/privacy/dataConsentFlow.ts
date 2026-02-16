import { Alert, Linking } from "react-native";
import { hasDataConsent, setDataConsent } from "../storage/privacyConsent";
import { config } from "../config";

export async function ensureDataConsentInteractive(): Promise<boolean> {
  const alreadyConsented = await hasDataConsent();
  if (alreadyConsented) return true;

  return new Promise((resolve) => {
    Alert.alert(
      "Data processing consent",
      "SwissKnife sends your prompts to Anthropic Claude and stores generated mini-app specs/state in Supabase cloud storage. You can withdraw consent in Profile.",
      [
        {
          text: "Decline",
          style: "cancel",
          onPress: async () => {
            await setDataConsent(false);
            resolve(false);
          },
        },
        {
          text: "Privacy Policy",
          onPress: async () => {
            await setDataConsent(false);
            Linking.openURL(config.privacyPolicyUrl).catch(() => {});
            resolve(false);
          },
        },
        {
          text: "Accept",
          onPress: async () => {
            await setDataConsent(true);
            resolve(true);
          },
        },
      ]
    );
  });
}
