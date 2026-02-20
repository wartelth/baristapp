import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../context/AppThemeContext";
import type { SocialScreenProps } from "../types/navigation";
import { getAvatarUrl } from "../utils/avatars";
import { importSharedAppByCode, listSharedWithMe } from "../api/client";
import { saveApp, saveAppMeta } from "../storage/storageLayer";
import {
  extractShareCodeFromText,
  isCompleteShareCode,
  normalizeShareCodeInput,
} from "../utils/shareCode";

let CameraViewNative: any = null;
let CameraNative: any = null;
try {
  const mod = require("expo-camera");
  CameraViewNative = mod.CameraView ?? mod.Camera;
  CameraNative = mod.Camera;
} catch {
  // expo-camera unavailable
}

type SharedItem = {
  installedAppId: string;
  title: string;
  icon: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerAvatarIndex: number;
};

export function SocialScreen({ navigation }: SocialScreenProps) {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<SharedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importCode, setImportCode] = useState("");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await listSharedWithMe();
      if (result.success && result.items) {
        setItems(result.items);
      } else {
        setItems([]);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleImportSubmit = async (codeOverride?: string) => {
    const code = (codeOverride ?? importCode).trim();
    if (!code) return;
    try {
      const result = await importSharedAppByCode(code);
      if (!result.success || !result.app) {
        Alert.alert("Import failed", result.error ?? "Share code not found.");
        return;
      }

      saveApp(result.app);
      if (result.owner) {
        saveAppMeta(result.app.appId, {
          ownerUserId: result.owner.userId,
          ownerDisplayName: result.owner.displayName,
          ownerAvatarIndex: result.owner.avatarIndex,
        });
      }

      setImportVisible(false);
      setImportCode("");
      await load();
      Alert.alert("Imported", "Mini-app imported from your friend.", [
        {
          text: "Open app",
          onPress: () => navigation.navigate("MiniApp", { appId: result.app!.appId }),
        },
        {
          text: "Go to My Apps",
          onPress: () => navigation.navigate("Apps"),
        },
        { text: "Done", style: "cancel" },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Import failed", message);
    }
  };

  const openScanner = async () => {
    if (!CameraNative || !CameraViewNative) {
      Alert.alert("Scanner unavailable", "Camera support is not available on this device.");
      return;
    }
    try {
      const { status } = await CameraNative.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera permission needed", "Allow camera access to scan share QR codes.");
        return;
      }
      setScanLocked(false);
      setScannerVisible(true);
    } catch {
      Alert.alert("Scanner unavailable", "Could not start camera scanner.");
    }
  };

  const handleBarcodeScanned = async (event: { data?: string }) => {
    if (scanLocked) return;
    setScanLocked(true);

    const extractedCode = extractShareCodeFromText(event.data ?? "");
    if (!extractedCode) {
      Alert.alert("Invalid QR code", "This QR code does not contain a valid share code.");
      setTimeout(() => setScanLocked(false), 1200);
      return;
    }

    setImportCode(extractedCode);
    setScannerVisible(false);
    await handleImportSubmit(extractedCode);
  };

  const friends = useMemo(() => {
    const map = new Map<string, { ownerDisplayName: string; ownerAvatarIndex: number }>();
    for (const item of items) {
      if (!map.has(item.ownerUserId)) {
        map.set(item.ownerUserId, {
          ownerDisplayName: item.ownerDisplayName,
          ownerAvatarIndex: item.ownerAvatarIndex,
        });
      }
    }
    return Array.from(map.entries()).map(([ownerUserId, v]) => ({
      ownerUserId,
      ...v,
    }));
  }, [items]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Friends</Text>
        <TouchableOpacity
          style={[styles.importBtn, { borderColor: colors.borderAlt, backgroundColor: colors.surfaceAlt }]}
          onPress={() => setImportVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.importBtnText, { color: colors.primary }]}>Import</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        horizontal
        keyExtractor={(item) => item.ownerUserId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.friendsList}
        renderItem={({ item }) => (
          <View style={styles.friendItem}>
            <Image source={{ uri: getAvatarUrl(item.ownerAvatarIndex) }} style={styles.friendAvatar} />
            <Text style={[styles.friendName, { color: colors.secondaryText }]} numberOfLines={1}>
              {item.ownerDisplayName}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              Import a shared app code and friends will appear here.
            </Text>
          </View>
        }
      />

      <Text style={[styles.heading, { color: colors.text, marginTop: 10 }]}>Shared with you</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.installedAppId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.sharedList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}
            onPress={() => navigation.navigate("MiniApp", { appId: item.installedAppId })}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardIcon}>{item.icon || "🔧"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]} numberOfLines={1}>
                  Shared by {item.ownerDisplayName}
                </Text>
              </View>
              <Image source={{ uri: getAvatarUrl(item.ownerAvatarIndex) }} style={styles.cardAvatar} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing shared yet</Text>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              Ask a friend for a share code, then import it here.
            </Text>
          </View>
        }
      />

      <Modal
        visible={importVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import from friend</Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              Paste the share code from your friend
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
              placeholder="e.g. ab12cd34ef"
              placeholderTextColor={colors.secondaryText}
              value={importCode}
              onChangeText={(value) => setImportCode(normalizeShareCodeInput(value))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.importHint, { color: colors.secondaryText }]}>
              Example: abc-def-ghi
            </Text>
            <TouchableOpacity
              style={[styles.scanBtn, { borderColor: colors.borderAlt, backgroundColor: colors.background }]}
              onPress={openScanner}
              activeOpacity={0.8}
            >
              <Text style={[styles.scanBtnText, { color: colors.primary }]}>Scan QR code</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.borderAlt }]}
                onPress={() => setImportVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  !isCompleteShareCode(importCode) && styles.submitBtnDisabled,
                ]}
                onPress={() => {
                  void handleImportSubmit();
                }}
                disabled={!isCompleteShareCode(importCode)}
              >
                <Text style={styles.submitBtnText}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={scannerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.scannerCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Scan share QR</Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              Position the QR code inside the frame.
            </Text>
            {CameraViewNative ? (
              <View style={styles.scannerViewport}>
                <CameraViewNative
                  style={styles.scannerCamera}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
                <View style={styles.scannerFrame} pointerEvents="none" />
              </View>
            ) : (
              <View style={[styles.scannerFallback, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.secondaryText }}>Scanner unavailable</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.borderAlt, marginTop: 12 }]}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>Close scanner</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headingRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  heading: { fontSize: 21, fontWeight: "700", marginBottom: 8 },
  importBtn: {
    marginLeft: "auto",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  friendsList: { paddingBottom: 8, gap: 12 },
  friendItem: { width: 72, alignItems: "center", marginRight: 8 },
  friendAvatar: { width: 54, height: 54, borderRadius: 27, marginBottom: 6 },
  friendName: { fontSize: 12, textAlign: "center" },
  sharedList: { paddingBottom: 26, gap: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  cardAvatar: { width: 26, height: 26, borderRadius: 13 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    alignItems: "flex-start",
  },
  emptyEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, lineHeight: 18 },
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
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 8,
  },
  importHint: {
    fontSize: 12,
    marginBottom: 14,
  },
  scanBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: "700",
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
  scannerCard: {
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 430,
    borderWidth: 1,
  },
  scannerViewport: {
    height: 320,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    position: "relative",
  },
  scannerCamera: {
    flex: 1,
  },
  scannerFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 190,
    height: 190,
    marginLeft: -95,
    marginTop: -95,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scannerFallback: {
    height: 320,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
