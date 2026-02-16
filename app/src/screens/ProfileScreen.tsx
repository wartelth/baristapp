import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { listApps } from "../storage/storageLayer";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/AppThemeContext";
import type { ProfileScreenProps } from "../types/navigation";

export function ProfileScreen(_props: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const { mode, colors, toggleTheme } = useAppTheme();
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{user?.email ?? displayName}</Text>
        {user?.email && (
          <Text style={[styles.deviceId, { color: colors.tabInactive }]}>{user.email}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{appCount}</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Mini-Apps</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>v0.1</Text>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Version</Text>
        </View>
      </View>

      {/* Settings section */}
      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Settings</Text>
      <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
        <View style={styles.settingsRow}>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={mode === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow label="Cloud Sync" value={user ? "On" : "Sign in to sync"} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow label="Generation Model" value="Auto" colors={colors} />
        {user && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
            <TouchableOpacity
              style={styles.signOutRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* About section */}
      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>About</Text>
      <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
        <SettingsRow label="SwissKnife" value="AI Mini-App Generator" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow label="Powered by" value="Claude" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow label="Platform" value="React Native + Expo" colors={colors} />
      </View>
    </ScrollView>
  );
}

function SettingsRow({ label, value, colors }: { label: string; value: string; colors: { text: string; secondaryText: string } }) {
  return (
    <View style={styles.settingsRow}>
      <Text style={[styles.settingsLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.settingsValue, { color: colors.secondaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceId: {
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
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
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
    fontSize: 15,
  },
  settingsValue: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  signOutRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
