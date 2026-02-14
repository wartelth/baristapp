import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

let Audio: any = null;
try {
  Audio = require("expo-av").Audio;
} catch {
  // expo-av not installed
}

export function AudioRecorderRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "audioRecorder") return null;
  const theme = useTheme();
  const { stateKey, maxDuration, onRecordComplete } = component.props;
  const recordingRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  if (!Audio) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.surfaceColor }]}>
        <Text style={{ color: theme.secondaryTextColor }}>Audio not available (expo-av not installed)</Text>
      </View>
    );
  }

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      if (maxDuration) {
        setTimeout(() => stopRecording(), maxDuration * 1000);
      }
    } catch (err) {
      console.warn("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      dispatch({ type: "setState", key: stateKey, value: uri });
      if (onRecordComplete) {
        setTimeout(() => dispatch(onRecordComplete), 50);
      }
    } catch (err) {
      console.warn("Failed to stop recording:", err);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
      <Text style={[styles.timer, { color: theme.textColor }]}>
        {isRecording ? formatTime(duration) : "Ready"}
      </Text>
      <TouchableOpacity
        style={[
          styles.recordBtn,
          { backgroundColor: isRecording ? theme.dangerColor : theme.primaryColor },
        ]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.btnText}>{isRecording ? "Stop" : "Record"}</Text>
      </TouchableOpacity>
      {!!state[stateKey] && !isRecording && (
        <Text style={[styles.saved, { color: theme.successColor }]}>Recording saved</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginVertical: 8,
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
  },
  timer: {
    fontSize: 32,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 12,
  },
  recordBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saved: {
    marginTop: 8,
    fontSize: 14,
  },
});
