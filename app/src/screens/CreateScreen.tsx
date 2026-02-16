import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import type { ClarificationQuestion } from "@swissknife/shared";
import { clarifyPrompt } from "../api/client";
import { useGeneration } from "../context/GenerationContext";
import type { CreateScreenProps } from "../types/navigation";

type Props = CreateScreenProps;

type Step = "prompt" | "clarifying" | "questions";

const EXAMPLES = [
  "A simple grocery list where I can add and remove items",
  "A workout rep counter for push-ups, squats, and planks",
  "A movie watchlist where I can add titles and mark them as watched",
  "A daily journal with date and mood tracking",
];

export function CreateScreen({ navigation }: Props) {
  const { busy, startGenerate } = useGeneration();
  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");

  // Clarification state
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeformAnswers, setFreeformAnswers] = useState<Record<string, string>>({});

  const scrollRef = useRef<ScrollView>(null);

  // -------------------------------------------------------------------------
  // Step 1 → 2: Send prompt for clarification
  // -------------------------------------------------------------------------
  const handleClarify = async () => {
    if (!prompt.trim()) {
      Alert.alert("Enter a description", "Describe the mini-app you want to create.");
      return;
    }
    Keyboard.dismiss();
    setStep("clarifying");

    try {
      const result = await clarifyPrompt(prompt.trim());

      if (!result.success) {
        Alert.alert("Clarification failed", result.error);
        setStep("prompt");
        return;
      }

      setSummary(result.summary);
      setQuestions(result.questions);
      // Pre-fill empty answers
      const initial: Record<string, string[]> = {};
      for (const q of result.questions) {
        initial[q.id] = [];
      }
      setAnswers(initial);
      setFreeformAnswers({});
      setStep("questions");

      // Scroll to top for the questions view
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Error", `Could not connect to server: ${message}`);
      setStep("prompt");
    }
  };

  // -------------------------------------------------------------------------
  // Step 3: Generate with enriched context (background via context)
  // -------------------------------------------------------------------------
  const handleGenerate = () => {
    Keyboard.dismiss();

    const clarifications = questions.map((q) => {
      if (q.type === "freeform") {
        return { questionId: q.id, answer: `${q.question} → ${freeformAnswers[q.id] || "(no answer)"}` };
      }
      const selected = answers[q.id] ?? [];
      return { questionId: q.id, answer: `${q.question} → ${selected.join(", ") || "(no answer)"}` };
    });

    // Fire-and-forget — context handles the API call, notification, and saving
    startGenerate(prompt.trim(), clarifications);
    navigation.navigate("Library");
  };

  // -------------------------------------------------------------------------
  // Skip clarification → generate directly (background via context)
  // -------------------------------------------------------------------------
  const handleSkip = () => {
    Keyboard.dismiss();
    startGenerate(prompt.trim());
    navigation.navigate("Library");
  };

  // -------------------------------------------------------------------------
  // Answer helpers
  // -------------------------------------------------------------------------
  const toggleOption = (questionId: string, option: string, type: "single" | "multiple") => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (type === "single") {
        return { ...prev, [questionId]: [option] };
      }
      // multiple
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      }
      return { ...prev, [questionId]: [...current, option] };
    });
  };

  // -------------------------------------------------------------------------
  // Render: Prompt step
  // -------------------------------------------------------------------------
  if (step === "prompt") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>What do you need?</Text>
          <Text style={styles.subheading}>
            Describe the tool you want and we'll ask a few questions before building it.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. An app to track my hiking GPX files on a map..."
            placeholderTextColor="#555"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <Text style={styles.charCount}>{prompt.length}/2000</Text>

          <TouchableOpacity
            style={[styles.button, (!prompt.trim() || busy) && styles.buttonDisabled]}
            onPress={handleClarify}
            disabled={!prompt.trim() || busy}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {busy ? "Generation in progress..." : "Continue"}
            </Text>
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
      </KeyboardAvoidingView>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Clarifying (loading)
  // -------------------------------------------------------------------------
  if (step === "clarifying") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.clarifyingText}>Understanding your request...</Text>
        <Text style={styles.clarifyingSubtext}>Preparing questions</Text>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Questions step
  // -------------------------------------------------------------------------
  if (step === "questions") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Here's what I understood</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>

          {/* Questions */}
          <Text style={styles.questionsHeading}>A few questions to get it right:</Text>

          {questions.map((q, qi) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionNumber}>{qi + 1}/{questions.length}</Text>
              <Text style={styles.questionText}>{q.question}</Text>

              {q.type === "freeform" ? (
                <TextInput
                  style={styles.freeformInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="#555"
                  value={freeformAnswers[q.id] ?? ""}
                  onChangeText={(text) =>
                    setFreeformAnswers((prev) => ({ ...prev, [q.id]: text }))
                  }
                  multiline
                />
              ) : (
                <View style={styles.optionsContainer}>
                  {q.options?.map((option) => {
                    const selected = (answers[q.id] ?? []).includes(option);
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.optionChip, selected && styles.optionChipSelected]}
                        onPress={() => toggleOption(q.id, option, q.type as "single" | "multiple")}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.optionDot, selected && styles.optionDotSelected]}>
                          {selected && <View style={styles.optionDotInner} />}
                        </View>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}

          {/* Actions */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleGenerate}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Build My App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip & generate without answers</Text>
          </TouchableOpacity>

          {/* Back */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep("prompt")}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Edit prompt</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Generation now happens in background via context — no generating step needed
  return null;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#111118",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  scroll: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Prompt step
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
    marginBottom: 12,
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
    marginTop: 12,
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

  // Clarifying step
  clarifyingText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  clarifyingSubtext: {
    color: "#888",
    fontSize: 14,
  },

  // Questions step
  summaryCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#4f46e5",
    borderLeftWidth: 4,
  },
  summaryLabel: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 22,
  },

  questionsHeading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  questionCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  questionNumber: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  questionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    lineHeight: 22,
  },

  optionsContainer: {
    gap: 8,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111118",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#333",
    gap: 12,
  },
  optionChipSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#1a1a3e",
  },
  optionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  optionDotSelected: {
    borderColor: "#4f46e5",
  },
  optionDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f46e5",
  },
  optionText: {
    color: "#aaa",
    fontSize: 15,
    flex: 1,
  },
  optionTextSelected: {
    color: "#fff",
  },

  freeformInput: {
    backgroundColor: "#111118",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },

  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 14,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#4f46e5",
    fontSize: 14,
    fontWeight: "500",
  },
});
