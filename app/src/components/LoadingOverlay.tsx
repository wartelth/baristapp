import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
} from "react-native";

// ---------------------------------------------------------------------------
// Generation phases — shown sequentially as time progresses
// ---------------------------------------------------------------------------

interface Phase {
  label: string;
  detail: string;
  minMs: number; // minimum time before moving to next phase
}

const PHASES: Phase[] = [
  { label: "Connecting", detail: "Reaching the SwissKnife server...", minMs: 2000 },
  { label: "Selecting model", detail: "Choosing the best model for your prompt...", minMs: 3000 },
  { label: "Generating", detail: "Claude is building your app...", minMs: 40000 },
  { label: "Assembling", detail: "Structuring components and actions...", minMs: 20000 },
  { label: "Validating", detail: "Checking schema compliance...", minMs: 5000 },
  { label: "Finalizing", detail: "Almost there...", minMs: 30000 },
];

interface Props {
  /** When the operation started (Date.now()). Used for accurate elapsed time. */
  startTime?: number;
  /** Called when the user dismisses the overlay. */
  onClose?: () => void;
}

export function LoadingOverlay({ startTime, onClose }: Props) {
  const effectiveStart = startTime ?? Date.now();
  const [phaseIndex, setPhaseIndex] = useState(() => {
    // Jump to the correct phase based on elapsed time
    const elapsed = Date.now() - effectiveStart;
    let cumulative = 0;
    for (let i = 0; i < PHASES.length - 1; i++) {
      cumulative += PHASES[i].minMs;
      if (elapsed < cumulative) return i;
    }
    return PHASES.length - 1;
  });
  const [elapsed, setElapsed] = useState(Date.now() - effectiveStart);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Elapsed timer — always relative to the real start time
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - effectiveStart), 100);
    return () => clearInterval(id);
  }, [effectiveStart]);

  // Phase progression — cumulative from start
  useEffect(() => {
    let cumulative = 0;
    for (let i = 0; i <= phaseIndex; i++) cumulative += PHASES[i].minMs;
    const remaining = cumulative - (Date.now() - effectiveStart);
    if (remaining <= 0 && phaseIndex < PHASES.length - 1) {
      setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
      return;
    }
    if (phaseIndex >= PHASES.length - 1) return;

    const timeout = setTimeout(() => {
      setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, Math.max(remaining, 0));
    return () => clearTimeout(timeout);
  }, [phaseIndex, effectiveStart]);

  // Spinner rotation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Dot pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Initial fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const secs = Math.floor(elapsed / 1000);
  const phase = PHASES[phaseIndex];

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
          <View style={styles.card}>
            {/* Close hint */}
            {onClose && (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>x</Text>
              </TouchableOpacity>
            )}

            {/* Spinner */}
            <Animated.View style={[styles.spinnerWrap, { transform: [{ rotate: spin }] }]}>
              <View style={styles.spinnerTrack}>
                <View style={styles.spinnerFill} />
              </View>
            </Animated.View>

            {/* Phase label */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.phaseLabel}>{phase.label}</Text>
              <Text style={styles.phaseDetail}>{phase.detail}</Text>
            </Animated.View>

            {/* Progress steps */}
            <View style={styles.steps}>
              {PHASES.map((p, i) => (
                <View key={i} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      i < phaseIndex && styles.stepDone,
                      i === phaseIndex && styles.stepActive,
                      i > phaseIndex && styles.stepPending,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      i <= phaseIndex ? styles.stepLabelActive : styles.stepLabelPending,
                    ]}
                  >
                    {p.label}
                  </Text>
                  {i < phaseIndex && <Text style={styles.checkmark}>done</Text>}
                </View>
              ))}
            </View>

            {/* Elapsed time */}
            <Animated.Text style={[styles.timer, { opacity: dotAnim }]}>
              {secs}s
            </Animated.Text>

            {/* Dismiss hint */}
            {onClose && (
              <Text style={styles.dismissHint}>Tap outside to dismiss</Text>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: 300,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },

  // Close
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 14,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2a2a3e",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "700",
  },

  // Spinner
  spinnerWrap: {
    width: 48,
    height: 48,
    marginBottom: 20,
  },
  spinnerTrack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#2a2a3e",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  spinnerFill: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: "#1e40af",
  },

  // Phase text
  phaseLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  phaseDetail: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },

  // Steps
  steps: {
    alignSelf: "stretch",
    gap: 8,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDone: {
    backgroundColor: "#22c55e",
  },
  stepActive: {
    backgroundColor: "#1e40af",
  },
  stepPending: {
    backgroundColor: "#333",
  },
  stepLabel: {
    fontSize: 13,
    flex: 1,
  },
  stepLabelActive: {
    color: "#ccc",
  },
  stepLabelPending: {
    color: "#555",
  },
  checkmark: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },

  // Timer
  timer: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },

  // Dismiss hint
  dismissHint: {
    color: "#444",
    fontSize: 11,
    marginTop: 12,
  },
});
