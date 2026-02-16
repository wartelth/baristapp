import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Share,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { MiniApp } from "@swissknife/shared";
import { listApps, deleteApp, clearState, getAppMeta, saveAppMeta } from "../storage/storageLayer";
import { MiniAppCard } from "../components/MiniAppCard";
import { useGeneration } from "../context/GenerationContext";
import { useAppTheme } from "../context/AppThemeContext";
import type { AppsScreenProps } from "../types/navigation";
import {
  createShareCode,
  listInstalledSharedApps,
  reportMiniApp,
} from "../api/client";
import { getAvatarUrl } from "../utils/avatars";
import QRCode from "react-native-qrcode-svg";
import { formatShareCode } from "../utils/shareCode";

type Props = AppsScreenProps;

const CARD_GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const { busy, busyLabel, startModify } = useGeneration();
  const { colors } = useAppTheme();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState("");

  // Banner animation
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (busy) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [busy]);

  // Modify modal state
  const [modifyTarget, setModifyTarget] = useState<MiniApp | null>(null);
  const [modifyText, setModifyText] = useState("");
  const modifyInputRef = useRef<TextInput>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [sharePayload, setSharePayload] = useState<{ appTitle: string; shareCode: string } | null>(null);

  const loadApps = useCallback(async () => {
    try {
      const social = await listInstalledSharedApps();
      if (social.success && social.installed) {
        for (const item of social.installed) {
          saveAppMeta(item.installedAppId, {
            ownerUserId: item.ownerUserId,
            ownerDisplayName: item.ownerDisplayName,
            ownerAvatarIndex: item.ownerAvatarIndex,
          });
        }
      }
    } catch {
      // best effort
    }
    setApps(listApps());
  }, []);

  // Reload on every focus (e.g. after creating a new app)
  useFocusEffect(
    useCallback(() => {
      void loadApps();
    }, [loadApps])
  );

  const handleDelete = (appId: string) => {
    deleteApp(appId);
    clearState(appId);
    loadApps();
  };

  const handleModifyOpen = (app: MiniApp) => {
    if (busy) {
      Alert.alert("Please wait", "A generation is already in progress.");
      return;
    }
    setModifyTarget(app);
    setModifyText("");
  };

  const handleReport = (app: MiniApp) => {
    const submitReason = async (reason: string) => {
      try {
        const result = await reportMiniApp(app.appId, reason);
        if (!result.success) {
          Alert.alert("Report failed", result.error ?? "Could not submit report.");
          return;
        }
        Alert.alert("Thanks", "Report submitted. We will review it shortly.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        Alert.alert("Report failed", message);
      }
    };

    Alert.alert("Report mini-app", "What is the issue?", [
      { text: "Offensive content", onPress: () => void submitReason("offensive_content") },
      { text: "Unsafe instructions", onPress: () => void submitReason("unsafe_instructions") },
      { text: "Other", onPress: () => void submitReason("other") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleModifyClose = () => {
    setModifyTarget(null);
    setModifyText("");
  };

  const handleShare = async (app: MiniApp) => {
    try {
      const result = await createShareCode(app.appId);
      if (!result.success || !result.shareCode) {
        Alert.alert("Share failed", result.error ?? "Could not create share code.");
        return;
      }
      setSharePayload({
        appTitle: app.title,
        shareCode: formatShareCode(result.shareCode),
      });
      setShareVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Share failed", message);
    }
  };

  const handleShareNative = async () => {
    if (!sharePayload) return;
    const qrValue = `swissknife://import?code=${sharePayload.shareCode}`;
    try {
      await Share.share({
        title: `Share ${sharePayload.appTitle}`,
        message: `Import this mini-app in SwissKnife.\nCode: ${sharePayload.shareCode}\n${qrValue}`,
      });
    } catch {
      // best effort
    }
  };

  const handleModifySubmit = () => {
    if (!modifyTarget || !modifyText.trim()) return;

    // Fire-and-forget — context handles the API call + notification
    startModify(modifyTarget, modifyText.trim());
    setModifyTarget(null);
    setModifyText("");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.appId.toLowerCase().includes(q)
    );
  }, [apps, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Apps</Text>
        {apps.length > 0 && (
          <Text style={[styles.headerCount, { color: colors.secondaryText }]}>{apps.length}</Text>
        )}
      </View>
      <Text style={[styles.subHeader, { color: colors.secondaryText }]}>
        Your personal apps. Import from Social or browse templates in Official.
      </Text>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderAlt }]}
          placeholder="Search apps..."
          placeholderTextColor={colors.searchPlaceholder}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Generating banner */}
      {busy && <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.borderAlt,
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
              {
                scale: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bannerDot,
            {
              backgroundColor: colors.primary,
              transform: [
                {
                  scale: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.4, 1],
                  }),
                },
              ],
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.4, 1],
              }),
            },
          ]}
        />
        <View style={styles.bannerTextCol}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            {busyLabel || "Generating app..."}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.secondaryText }]}>
            This may take a moment
          </Text>
        </View>
      </Animated.View>}

      {apps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No mini-apps yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
            Tap the + tab to create your first one
          </Text>
        </View>
      ) : (
        <FlatList<MiniApp>
          data={filtered}
          keyExtractor={(item) => item.appId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            (() => {
              const meta = getAppMeta(item.appId);
              const friendAvatarUrl = meta ? getAvatarUrl(meta.ownerAvatarIndex) : undefined;
              return (
            <MiniAppCard
              app={item}
              onPress={() =>
                navigation.navigate("MiniApp", { appId: item.appId })
              }
              onDelete={() => handleDelete(item.appId)}
              onModify={() => handleModifyOpen(item)}
              onReport={() => handleReport(item)}
              onShare={() => handleShare(item)}
              friendAvatarUrl={friendAvatarUrl}
              friendName={meta?.ownerDisplayName}
            />
              );
            })()
          )}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={loadApps}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Modify Modal */}
      <Modal
        visible={modifyTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={handleModifyClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Modify "{modifyTarget?.title}"
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              What do you want to change?
            </Text>
            <TextInput
              ref={modifyInputRef}
              style={[styles.modifyInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
              placeholder='e.g. "add a dark mode toggle"'
              placeholderTextColor={colors.searchPlaceholder}
              value={modifyText}
              onChangeText={setModifyText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.borderAlt }]}
                onPress={handleModifyClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  !modifyText.trim() && styles.submitBtnDisabled,
                ]}
                onPress={handleModifySubmit}
                disabled={!modifyText.trim()}
              >
                <Text style={styles.submitBtnText}>Modify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share "{sharePayload?.appTitle}"</Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              Your friend can scan this QR or type the code in Social.
            </Text>

            {!!sharePayload && (
              <View style={[styles.qrCard, { backgroundColor: colors.background, borderColor: colors.borderAlt }]}>
                <QRCode
                  value={`swissknife://import?code=${sharePayload.shareCode}`}
                  size={160}
                  color="#111111"
                  backgroundColor="#ffffff"
                />
              </View>
            )}

            <Text style={[styles.shareCodeLabel, { color: colors.secondaryText }]}>Share code</Text>
            <Text style={[styles.shareCodeValue, { color: colors.text }]}>
              {sharePayload?.shareCode ?? ""}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.borderAlt }]}
                onPress={() => setShareVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleShareNative}
              >
                <Text style={styles.submitBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerCount: {
    fontSize: 16,
    fontWeight: "500",
  },
  subHeader: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  // Generating banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  // Modify modal
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
    maxWidth: 400,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modifyInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  qrCard: {
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  shareCodeLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  shareCodeValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1.6,
    textAlign: "center",
    marginBottom: 14,
  },
});
