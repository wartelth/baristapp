import React, { useEffect, useState, useCallback, useRef, Component, ErrorInfo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import type { MiniApp } from "@baristapp/shared";
import { getApp } from "../storage/storageLayer";
import { MiniAppRenderer } from "../components/MiniAppRenderer";
import { useGeneration } from "../context/GenerationContext";
import { HeaderSpinner } from "../components/HeaderSpinner";
import type { MiniAppScreenProps } from "../types/navigation";

type Props = MiniAppScreenProps;

// ---------------------------------------------------------------------------
// Error boundary — catches render crashes so the app never silently dies
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  error: string | null;
}

class MiniAppErrorBoundary extends Component<
  { children: React.ReactNode; appId: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[MiniApp:${this.props.appId}] Render crash:`, error.message);
    console.error(info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.error} contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>This mini-app crashed</Text>
          <Text style={styles.errorText}>{this.state.error}</Text>
          <Text style={styles.errorHint}>
            Try generating it again — sometimes Claude produces specs that
            reference missing state or unsupported patterns.
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function MiniAppScreen({ route, navigation }: Props) {
  const { appId } = route.params;
  const { busy, startModify, notification } = useGeneration();
  const [spec, setSpec] = useState<MiniApp | null>(null);

  // Modify modal
  const [showModify, setShowModify] = useState(false);
  const [modifyText, setModifyText] = useState("");

  // Load spec (and reload after a successful modify notification for this app)
  const loadSpec = useCallback(() => {
    const loaded = getApp(appId);
    setSpec(loaded);
    if (loaded) {
      navigation.setOptions({ title: loaded.title });
    }
  }, [appId, navigation]);

  useEffect(() => {
    loadSpec();
  }, [loadSpec]);

  // Reload spec when we get a success notification for this app (modify completed)
  useEffect(() => {
    if (notification?.success && notification.appId === appId) {
      loadSpec();
    }
  }, [notification, appId, loadSpec]);

  // Header modify button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity
            onPress={() => {
              if (busy) {
                Alert.alert("Please wait", "A generation is already in progress.");
                return;
              }
              setShowModify(true);
              setModifyText("");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>Edit</Text>
          </TouchableOpacity>
          <HeaderSpinner />
        </View>
      ),
    });
  }, [navigation, busy]);

  const handleModifySubmit = () => {
    if (!spec || !modifyText.trim()) return;
    startModify(spec, modifyText.trim());
    setShowModify(false);
    setModifyText("");
  };

  if (!spec) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Mini-app not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MiniAppErrorBoundary appId={appId}>
        <MiniAppRenderer spec={spec} />
      </MiniAppErrorBoundary>

      {/* Modify Modal */}
      <Modal
        visible={showModify}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModify(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Modify "{spec.title}"
            </Text>
            <Text style={styles.modalSubtitle}>
              What do you want to change?
            </Text>
            <TextInput
              style={styles.modifyInput}
              placeholder='e.g. "add a reset button"'
              placeholderTextColor="#7A6858"
              value={modifyText}
              onChangeText={setModifyText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModify(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0B08",
  },
  // Header button
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#241C16",
    marginRight: 4,
  },
  headerBtnText: {
    color: "#C67C4E",
    fontSize: 14,
    fontWeight: "600",
  },
  // Error
  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0B08",
    padding: 24,
  },
  errorContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    color: "#CC5A45",
    fontSize: 40,
    fontWeight: "800",
    marginBottom: 12,
  },
  errorTitle: {
    color: "#EDE5DC",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    color: "#9C8B7A",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  errorHint: {
    color: "#7A6858",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  // Modify modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,11,8,0.76)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1A1310",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#3D2E22",
  },
  modalTitle: {
    color: "#EDE5DC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#9C8B7A",
    fontSize: 14,
    marginBottom: 16,
  },
  modifyInput: {
    backgroundColor: "#0F0B08",
    color: "#EDE5DC",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#3D2E22",
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
    backgroundColor: "#241C16",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#9C8B7A",
    fontSize: 15,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#C67C4E",
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
});
