import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useGeneration } from "../context/GenerationContext";

/** Animated spinner + label in the nav header. Tap to open/close the progress overlay. */
export function HeaderSpinner() {
  const { busy, toggleProgress } = useGeneration();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevBusy = useRef(false);

  useEffect(() => {
    if (busy && !prevBusy.current) {
      // -- Entering busy: scale-bounce + fade in --
      enterAnim.setValue(0);
      Animated.spring(enterAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Start spinning
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Gentle pulse on the ring
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (!busy && prevBusy.current) {
      // -- Leaving busy: fade out --
      Animated.timing(enterAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      pulseAnim.setValue(1);
    }
    prevBusy.current = busy;
  }, [busy]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const scale = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const labelTranslateX = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <TouchableOpacity
      onPress={busy ? toggleProgress : undefined}
      activeOpacity={0.6}
      disabled={!busy}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          styles.wrap,
          {
            opacity: enterAnim,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Label */}
        <Animated.View
          style={{
            opacity: enterAnim,
            transform: [{ translateX: labelTranslateX }],
          }}
        >
          <Text style={styles.label}>Generating...</Text>
        </Animated.View>

        {/* Spinning ring */}
        <Animated.View style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]}>
            <View style={styles.arc} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    gap: 8,
  },
  label: {
    color: "#C67C4E",
    fontSize: 13,
    fontWeight: "600",
  },
  ringWrap: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#3D2E22",
  },
  arc: {
    position: "absolute",
    top: -2.5,
    left: -2.5,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "transparent",
    borderTopColor: "#C67C4E",
  },
});
