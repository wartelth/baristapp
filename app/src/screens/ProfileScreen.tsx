import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { clearAllApps, listApps, getProfile, saveProfile } from "../storage/storageLayer";
import type { UserProfile } from "../storage/storageLayer";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/AppThemeContext";
import type { ProfileScreenProps } from "../types/navigation";
import { config } from "../config";
import {
  deleteMyCloudData,
  getMySocialProfile,
  listMyBadges,
  saveMySocialProfile,
  syncRevenueCatBilling,
} from "../api/client";
import { hasDataConsent, setDataConsent } from "../storage/privacyConsent";
import { getAvatarUrl, AVATAR_COUNT } from "../utils/avatars";
import { generateRandomName } from "../utils/randomName";
import {
  isRevenueCatEnabled,
  purchaseProFromRevenueCat,
  restoreRevenueCatPurchases,
} from "../billing/revenueCat";

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const { mode, colors, toggleTheme } = useAppTheme();
  const [appCount, setAppCount] = useState(0);
  const [dataConsent, setDataConsentState] = useState(false);
  const [billing, setBilling] = useState<{
    planKey: "free" | "pro";
    plan: {
      key: "free" | "pro";
      label: string;
      monthlyPriceUsd: number;
      appLimitPerPeriod: number;
      periodDays: number;
      libraryAccess: boolean;
    };
    usage: {
      generatedInCurrentPeriod: number;
      remainingInCurrentPeriod: number;
      periodDays: number;
      periodStartedAt: string;
      periodEndsAt: string;
    };
    costs: {
      totalModelCostUsd: number;
      totalGenerations: number;
      totalModifications: number;
    };
    libraryAccess: boolean;
  } | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badges, setBadges] = useState<Array<{ id: string; title: string; description: string; icon: string }>>([]);
  const [badgeProgress, setBadgeProgress] = useState<{
    appsCreated: number;
    appsShared: number;
    appsImported: number;
    profileCustomized: boolean;
  } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>(() => {
    return getProfile() ?? { displayName: "user", avatarIndex: 0 };
  });
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [editingName, setEditingName] = useState("");

  const refreshBilling = async () => {
    const response = await getMySocialProfile();
    if (response.success && response.billing) {
      setBilling(response.billing);
    }
  };

  useEffect(() => {
    setAppCount(listApps().length);
    hasDataConsent().then(setDataConsentState).catch(() => setDataConsentState(false));
    refreshBilling().catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setBadgesLoading(true);
      try {
        const response = await listMyBadges();
        if (!active || !response.success) return;
        setBadges(response.badges ?? []);
        setBadgeProgress(response.progress ?? null);
      } catch {
        // best effort
      } finally {
        if (active) setBadgesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile.displayName, profile.avatarIndex, appCount]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates };
    setProfile(next);
    saveProfile(next);
    saveMySocialProfile(next.displayName, next.avatarIndex).catch(() => {});
  };

  const displayName = profile.displayName;
  const freePlan = config.billing.plans.free;
  const proPlan = config.billing.plans.pro;

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const openMail = async () => {
    const mailto = `mailto:${config.supportEmail}`;
    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      await Linking.openURL(mailto);
      return;
    }
    Alert.alert("Contact", config.supportEmail);
  };

  const handleDeleteMyData = () => {
    Alert.alert(
      "Delete all my data",
      "This will delete all your local mini-apps and request deletion of your cloud data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteMyCloudData();
              if (!result.success) {
                Alert.alert("Delete failed", result.error ?? "Unable to delete cloud data.");
                return;
              }
              clearAllApps();
              setAppCount(0);
              await setDataConsent(false);
              setDataConsentState(false);
              Alert.alert("Deleted", "Your local and cloud mini-app data has been deleted.");
            } catch (err) {
              const message = err instanceof Error ? err.message : "Unknown error";
              Alert.alert("Delete failed", message);
            }
          },
        },
      ]
    );
  };

  const handleWithdrawConsent = () => {
    Alert.alert(
      "Withdraw consent",
      "You can still browse existing mini-apps, but generation and modification will be blocked until you accept again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            await setDataConsent(false);
            setDataConsentState(false);
          },
        },
      ]
    );
  };

  const handleUpgradeToPro = async () => {
    if (!isRevenueCatEnabled()) {
      Alert.alert("Billing not configured", "RevenueCat API key is missing for this platform.");
      return;
    }

    try {
      await purchaseProFromRevenueCat();
      const sync = await syncRevenueCatBilling();
      if (sync.success && sync.billing) {
        setBilling(sync.billing);
      } else {
        await refreshBilling();
      }
      Alert.alert("Success", "Your Pro plan is now active.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown purchase error";
      Alert.alert("Upgrade failed", message);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isRevenueCatEnabled()) {
      Alert.alert("Billing not configured", "RevenueCat API key is missing for this platform.");
      return;
    }

    try {
      await restoreRevenueCatPurchases();
      const sync = await syncRevenueCatBilling();
      if (sync.success && sync.billing) {
        setBilling(sync.billing);
      } else {
        await refreshBilling();
      }
      Alert.alert("Restored", "Purchases restored and billing refreshed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown restore error";
      Alert.alert("Restore failed", message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={() => setAvatarPickerVisible(true)} activeOpacity={0.7}>
          <Image
            source={{ uri: getAvatarUrl(profile.avatarIndex) }}
            style={[styles.avatar, { backgroundColor: colors.surface }]}
          />
          <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setEditingName(displayName);
            setNameModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
        </TouchableOpacity>
        {user?.email && (
          <Text style={[styles.deviceId, { color: colors.tabInactive }]}>{user.email}</Text>
        )}
        <Text style={[styles.profileHint, { color: colors.secondaryText }]}>
          Tap avatar or name to edit your profile
        </Text>
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

      {/* Plan + limits */}
      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Plan & Limits</Text>
      <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
        <SettingsRow
          label="Current Plan"
          value={
            billing
              ? `${billing.plan.label}${billing.plan.monthlyPriceUsd > 0 ? ` ($${billing.plan.monthlyPriceUsd}/mo)` : ""}`
              : `${config.billing.plans.free.label} ($0/mo)`
          }
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow
          label="App Generations"
          value={
            billing
              ? `${billing.usage.generatedInCurrentPeriod}/${billing.plan.appLimitPerPeriod} in ${billing.usage.periodDays}d`
              : `${config.billing.plans.free.appLimitPerPeriod} in ${config.billing.plans.free.periodDays}d (free)`
          }
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow
          label="Remaining This Period"
          value={billing ? String(billing.usage.remainingInCurrentPeriod) : String(freePlan.appLimitPerPeriod)}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow
          label="Library Access"
          value={billing?.libraryAccess ? "Included" : "Included on free + pro"}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow
          label="Model Spend"
          value={billing ? `$${billing.costs.totalModelCostUsd.toFixed(4)} total` : "Loading..."}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <Text style={[styles.planHint, { color: colors.secondaryText }]}>
          {`Free: ${freePlan.appLimitPerPeriod} generated app every ${freePlan.periodDays} days. ${proPlan.label}: $${proPlan.monthlyPriceUsd}/month for ${proPlan.appLimitPerPeriod} generated apps every ${proPlan.periodDays} days.`}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        {billing?.planKey !== "pro" && (
          <>
            <TouchableOpacity
              style={[styles.upgradeRow, { backgroundColor: colors.primary }]}
              onPress={handleUpgradeToPro}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeText}>
                Upgrade to {proPlan.label} (${proPlan.monthlyPriceUsd}/month)
              </Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
          </>
        )}
        <TouchableOpacity style={styles.settingsRow} onPress={handleRestorePurchases} activeOpacity={0.7}>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Restore Purchases</Text>
          <Text style={[styles.settingsValue, { color: colors.primary }]}>Run</Text>
        </TouchableOpacity>
      </View>

      {/* Badge section */}
      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Badges</Text>
      <View style={[styles.section, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
        {badgesLoading ? (
          <View style={styles.badgesLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : badges.length === 0 ? (
          <View style={styles.emptyBadgeState}>
            <Text style={[styles.emptyBadgeTitle, { color: colors.text }]}>No badges yet</Text>
            <Text style={[styles.emptyBadgeSubtitle, { color: colors.secondaryText }]}>
              Build your first mini-app to unlock your first badge.
            </Text>
          </View>
        ) : (
          <View style={styles.badgesList}>
            {badges.map((badge, index) => (
              <View key={badge.id}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: colors.background }]}>
                    <Text style={styles.badgeIcon}>{getBadgeEmoji(badge.icon)}</Text>
                  </View>
                  <View style={styles.badgeTextCol}>
                    <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
                    <Text style={[styles.badgeDescription, { color: colors.secondaryText }]}>
                      {badge.description}
                    </Text>
                  </View>
                </View>
                {index < badges.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
                )}
              </View>
            ))}
          </View>
        )}
        {badgeProgress && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
            <View style={styles.badgeProgressRow}>
              <Text style={[styles.badgeProgressText, { color: colors.secondaryText }]}>
                Created {badgeProgress.appsCreated}
              </Text>
              <Text style={[styles.badgeProgressText, { color: colors.secondaryText }]}>
                Shared {badgeProgress.appsShared}
              </Text>
              <Text style={[styles.badgeProgressText, { color: colors.secondaryText }]}>
                Imported {badgeProgress.appsImported}
              </Text>
            </View>
          </>
        )}
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
        <SettingsRow label="Data Consent" value={dataConsent ? "Accepted" : "Not accepted"} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <TouchableOpacity style={styles.settingsRow} onPress={handleWithdrawConsent} activeOpacity={0.7}>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Withdraw Consent</Text>
          <Text style={[styles.settingsValue, { color: colors.primary }]}>Manage</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <SettingsRow label="Generation Model" value="Auto" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <TouchableOpacity style={styles.signOutRow} onPress={handleDeleteMyData} activeOpacity={0.7}>
          <Text style={[styles.signOutText, { color: colors.danger }]}>Delete my data</Text>
        </TouchableOpacity>
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
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate("Legal", { section: "privacy" })}
          activeOpacity={0.7}
        >
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.settingsValue, { color: colors.primary }]}>Open</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate("Legal", { section: "support" })}
          activeOpacity={0.7}
        >
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Support</Text>
          <Text style={[styles.settingsValue, { color: colors.primary }]}>Open</Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
        <TouchableOpacity style={styles.settingsRow} onPress={openMail} activeOpacity={0.7}>
          <Text style={[styles.settingsLabel, { color: colors.text }]}>Contact</Text>
          <Text style={[styles.settingsValue, { color: colors.primary }]}>Email</Text>
        </TouchableOpacity>
      </View>

      {/* ---- Avatar Picker Modal ---- */}
      <Modal visible={avatarPickerVisible} transparent animationType="fade" onRequestClose={() => setAvatarPickerVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {Array.from({ length: AVATAR_COUNT }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    updateProfile({ avatarIndex: i });
                    setAvatarPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getAvatarUrl(i) }}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: colors.surface },
                      i === profile.avatarIndex && { borderColor: colors.primary, borderWidth: 3 },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalCancel, { backgroundColor: colors.borderAlt }]}
              onPress={() => setAvatarPickerVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.secondaryText }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- Name Edit Modal ---- */}
      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change display name</Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              maxLength={30}
              placeholder="Enter a name..."
              placeholderTextColor={colors.tabInactive}
            />
            <TouchableOpacity
              style={[styles.randomBtn, { borderColor: colors.borderAlt }]}
              onPress={() => setEditingName(generateRandomName())}
              activeOpacity={0.7}
            >
              <Text style={[styles.randomBtnText, { color: colors.primary }]}>Randomize</Text>
            </TouchableOpacity>
            <View style={styles.nameModalButtons}>
              <TouchableOpacity
                style={[styles.nameCancelBtn, { backgroundColor: colors.borderAlt }]}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nameSaveBtn, { backgroundColor: colors.primary }, !editingName.trim() && { opacity: 0.4 }]}
                onPress={() => {
                  if (editingName.trim()) {
                    updateProfile({ displayName: editingName.trim() });
                    setNameModalVisible(false);
                  }
                }}
                disabled={!editingName.trim()}
              >
                <Text style={styles.nameSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

function getBadgeEmoji(icon: string): string {
  const map: Record<string, string> = {
    "sparkles-outline": "✨",
    "build-outline": "🛠️",
    "flame-outline": "🔥",
    "share-social-outline": "📣",
    "people-outline": "🤝",
    "color-wand-outline": "🎨",
  };
  return map[icon] ?? "🏅";
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
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 13,
    fontFamily: "monospace" as unknown as string,
  },
  profileHint: {
    fontSize: 12,
    marginTop: 6,
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
  upgradeRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  upgradeText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  planHint: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  badgesLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyBadgeState: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyBadgeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyBadgeSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  badgesList: {
    paddingVertical: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badgeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeTextCol: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  badgeDescription: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
  },
  badgeProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badgeProgressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Modals (shared)
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  modalCancel: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Avatar picker
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "transparent",
  },
  // Name edit
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  randomBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  randomBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  nameModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  nameCancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  nameSaveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  nameSaveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
