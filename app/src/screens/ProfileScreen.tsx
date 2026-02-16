import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { listApps } from "../storage/storageLayer";
import { useAuth } from "../context/AuthContext";
import type { ProfileScreenProps } from "../types/navigation";

export function ProfileScreen(_props: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const [appCount, setAppCount] = useState(0);

  useEffect(() => {
    setAppCount(listApps().length);
  }, []);

  const displayName = user?.email?.split("@")[0] ?? "User";
  const initials = (user?.email?.[0] ?? "S").toUpperCase() + (user?.email?.[1] ?? "K").toUpperCase();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.email ?? displayName}</Text>
        {user?.email && (
          <Text style={styles.deviceId}>{user.email}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{appCount}</Text>
          <Text style={styles.statLabel}>Mini-Apps</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>v0.1</Text>
          <Text style={styles.statLabel}>Version</Text>
        </View>
      </View>

      {/* Settings section */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.section}>
        <SettingsRow label="Dark Mode" value="Always" />
        <View style={styles.divider} />
        <SettingsRow label="Cloud Sync" value={user ? "On" : "Sign in to sync"} />
        <View style={styles.divider} />
        <SettingsRow label="Generation Model" value="Auto" />
        {user && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.signOutRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* About section */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.section}>
        <SettingsRow label="SwissKnife" value="AI Mini-App Generator" />
        <View style={styles.divider} />
        <SettingsRow label="Powered by" value="Claude" />
        <View style={styles.divider} />
        <SettingsRow label="Platform" value="React Native + Expo" />
      </View>
    </ScrollView>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  // Avatar section
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  userName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceId: {
    color: "#555",
    fontSize: 13,
    fontFamily: "monospace" as unknown as string,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    color: "#888",
    fontSize: 13,
  },
  // Sections
  sectionTitle: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a3e",
    marginBottom: 24,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsLabel: {
    color: "#fff",
    fontSize: 15,
  },
  settingsValue: {
    color: "#888",
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a3e",
    marginLeft: 16,
  },
  signOutRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  signOutText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
  },
});
