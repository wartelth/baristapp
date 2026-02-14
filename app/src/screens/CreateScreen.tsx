import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { generateMiniApp } from "../api/client";
import { saveApp } from "../storage/storageLayer";
import { requestAllCapabilities } from "../capabilities/capabilityManager";
import { LoadingOverlay } from "../components/LoadingOverlay";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Create">;

const EXAMPLES = [
  "A simple grocery list where I can add and remove items",
  "A workout rep counter for push-ups, squats, and planks",
  "A movie watchlist where I can add titles and mark them as watched",
  "A daily journal with date and mood tracking",
];

export function CreateScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Enter a description", "Describe the mini-app you want to create.");
      return;
    }

    setLoading(true);
    try {
      const result = await generateMiniApp(prompt.trim());

      if (!result.success) {
        Alert.alert("Generation failed", result.error);
        return;
      }

      // Request capabilities
      await requestAllCapabilities(result.miniApp.appId, result.miniApp.capabilities);

      // Save the app
      saveApp(result.miniApp);

      // Navigate to the new mini-app
      navigation.replace("MiniApp", { appId: result.miniApp.appId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Error", `Could not connect to server: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>What do you need?</Text>
        <Text style={styles.subheading}>
          Describe the tool you want and we'll build it in seconds.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. A simple grocery list with categories..."
          placeholderTextColor="#555"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />

        <Text style={styles.charCount}>{prompt.length}/2000</Text>

        <TouchableOpacity
          style={[styles.button, !prompt.trim() && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={loading || !prompt.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Generate Mini-App</Text>
        </TouchableOpacity>

        <View style={styles.examples}>
          <Text style={styles.examplesTitle}>Try an example:</Text>
          {EXAMPLES.map((ex) => (
            <TouchableOpacity
              key={ex}
              style={styles.exampleChip}
              onPress={() => setPrompt(ex)}
            >
              <Text style={styles.exampleText}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading && <LoadingOverlay />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  scroll: {
    padding: 20,
    paddingTop: 16,
  },
  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  subheading: {
    color: "#888",
    fontSize: 15,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1e1e2e",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    color: "#555",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  examples: {
    gap: 10,
  },
  examplesTitle: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exampleChip: {
    backgroundColor: "#1a1a2e",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  exampleText: {
    color: "#aaa",
    fontSize: 14,
  },
});
