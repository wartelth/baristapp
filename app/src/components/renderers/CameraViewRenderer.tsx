import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

let CameraViewNative: any = null;
try {
  const mod = require("expo-camera");
  CameraViewNative = mod.CameraView ?? mod.Camera;
} catch {
  // expo-camera not installed
}

export function CameraViewRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "cameraView") return null;
  const theme = useTheme();
  const { stateKey, facing = "back", height = 300, onCapture } = component.props;
  const cameraRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  if (!CameraViewNative) {
    return (
      <View style={[styles.placeholder, { height, backgroundColor: theme.surfaceColor }]}>
        <Text style={{ color: theme.secondaryTextColor }}>Camera not available (expo-camera not installed)</Text>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      dispatch({ type: "setState", key: stateKey, value: photo.uri });
      if (onCapture) {
        setTimeout(() => dispatch(onCapture), 50);
      }
    } catch (err) {
      console.warn("Camera capture failed:", err);
    }
  };

  return (
    <View style={[styles.wrapper, { height: height + 60 }]}>
      <CameraViewNative
        ref={cameraRef}
        style={[styles.camera, { height }]}
        facing={facing}
        onCameraReady={() => setReady(true)}
      />
      <TouchableOpacity
        style={[styles.captureBtn, { backgroundColor: theme.primaryColor }]}
        onPress={handleCapture}
        disabled={!ready}
      >
        <Text style={styles.captureBtnText}>Capture</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 8, borderRadius: 12, overflow: "hidden" },
  camera: { width: "100%", borderRadius: 12 },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 8,
  },
  captureBtn: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  captureBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
