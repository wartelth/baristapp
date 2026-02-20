import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MiniAppCapability } from "@baristapp/shared";

// ---------------------------------------------------------------------------
// Permission state (in-memory cache + AsyncStorage)
// ---------------------------------------------------------------------------

type PermissionStatus = "granted" | "denied" | "pending";

const permCache = new Map<string, PermissionStatus>();

function permKey(appId: string, cap: MiniAppCapability): string {
  return `perm:${appId}:${cap}`;
}

function getPermission(appId: string, cap: MiniAppCapability): PermissionStatus {
  return permCache.get(permKey(appId, cap)) ?? "pending";
}

function setPermission(appId: string, cap: MiniAppCapability, status: PermissionStatus): void {
  const key = permKey(appId, cap);
  permCache.set(key, status);
  AsyncStorage.setItem(key, status).catch(console.warn);
}

// ---------------------------------------------------------------------------
// Capability descriptions for user prompts
// ---------------------------------------------------------------------------

const CAPABILITY_INFO: Record<MiniAppCapability, { title: string; description: string }> = {
  localStorage: {
    title: "Local Storage",
    description: "Store data locally on your device for this mini-app.",
  },
  camera: {
    title: "Camera",
    description: "Access your device camera to take photos or scan items.",
  },
  network: {
    title: "Network Access",
    description: "Make network requests through the Baristapp proxy.",
  },
  microphone: {
    title: "Microphone",
    description: "Record audio using your device microphone.",
  },
  location: {
    title: "Location",
    description: "Access your device location for this mini-app.",
  },
  haptics: {
    title: "Haptic Feedback",
    description: "Provide vibration feedback on interactions.",
  },
  clipboard: {
    title: "Clipboard",
    description: "Copy and paste text using the system clipboard.",
  },
  notifications: {
    title: "Notifications",
    description: "Send local notifications to your device.",
  },
  supabaseStorage: {
    title: "Cloud Storage",
    description: "Sync app data to the cloud for backup and cross-device access.",
  },
  skills: {
    title: "Live Data Feeds",
    description: "Access live data services (weather, news, crypto, etc.) through the Baristapp platform.",
  },
};

// ---------------------------------------------------------------------------
// Native permission wiring
// ---------------------------------------------------------------------------

async function requestNativePermission(capability: MiniAppCapability): Promise<boolean> {
  switch (capability) {
    case "camera": {
      try {
        const { Camera } = require("expo-camera");
        const { status } = await Camera.requestCameraPermissionsAsync();
        return status === "granted";
      } catch {
        return false;
      }
    }
    case "microphone": {
      try {
        const { Audio } = require("expo-av");
        const { status } = await Audio.requestPermissionsAsync();
        return status === "granted";
      } catch {
        return false;
      }
    }
    case "location": {
      try {
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === "granted";
      } catch {
        return false;
      }
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const AUTO_GRANTED: MiniAppCapability[] = [
  "localStorage",
  "haptics",
  "clipboard",
  "skills",
];

export function requestCapability(
  appId: string,
  capability: MiniAppCapability
): Promise<boolean> {
  if (AUTO_GRANTED.includes(capability)) {
    setPermission(appId, capability, "granted");
    return Promise.resolve(true);
  }

  const cached = getPermission(appId, capability);
  if (cached === "granted") return Promise.resolve(true);
  if (cached === "denied") return Promise.resolve(false);

  const info = CAPABILITY_INFO[capability];
  return new Promise((resolve) => {
    Alert.alert(
      `"${info.title}" Permission Requested`,
      info.description,
      [
        {
          text: "Deny",
          style: "cancel",
          onPress: () => {
            setPermission(appId, capability, "denied");
            resolve(false);
          },
        },
        {
          text: "Allow",
          onPress: async () => {
            const nativeGranted = await requestNativePermission(capability);
            if (nativeGranted) {
              setPermission(appId, capability, "granted");
              resolve(true);
            } else {
              setPermission(appId, capability, "denied");
              resolve(false);
            }
          },
        },
      ]
    );
  });
}

export function hasCapability(appId: string, capability: MiniAppCapability): boolean {
  if (AUTO_GRANTED.includes(capability)) return true;
  return getPermission(appId, capability) === "granted";
}

export async function requestAllCapabilities(
  appId: string,
  capabilities: MiniAppCapability[]
): Promise<MiniAppCapability[]> {
  const granted: MiniAppCapability[] = [];
  for (const cap of capabilities) {
    if (await requestCapability(appId, cap)) {
      granted.push(cap);
    }
  }
  return granted;
}

export function resetPermissions(appId: string): void {
  const allCaps: MiniAppCapability[] = [
    "localStorage", "camera", "network", "microphone",
    "location", "haptics", "clipboard", "notifications", "supabaseStorage", "skills",
  ];
  for (const cap of allCaps) {
    const key = permKey(appId, cap);
    permCache.delete(key);
    AsyncStorage.removeItem(key).catch(console.warn);
  }
}
