import React, { useState, useCallback, useEffect } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import type { MiniApp, MiniAppComponent, MiniAppAction } from "@swissknife/shared";
import type { RendererProps } from "../types";
import { getState, setFullState } from "../storage/storageLayer";

import { TextRenderer } from "./renderers/TextRenderer";
import { ButtonRenderer } from "./renderers/ButtonRenderer";
import { InputRenderer } from "./renderers/InputRenderer";
import { ListRenderer, setRenderComponent } from "./renderers/ListRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

const RENDERERS: Record<string, React.FC<RendererProps>> = {
  text: TextRenderer,
  button: ButtonRenderer,
  input: InputRenderer,
  list: ListRenderer,
  image: ImageRenderer,
};

function renderSingleComponent(
  component: MiniAppComponent,
  state: Record<string, unknown>,
  dispatch: (action: MiniAppAction) => void,
  onNavigate: (screenId: string) => void
): React.ReactNode {
  const Renderer = RENDERERS[component.type];
  if (!Renderer) {
    console.warn(`Unknown component type: ${component.type}`);
    return null;
  }
  return (
    <Renderer
      key={component.id}
      component={component}
      state={state}
      dispatch={dispatch}
      onNavigate={onNavigate}
    />
  );
}

// Inject into ListRenderer to avoid circular dependency
setRenderComponent(renderSingleComponent);

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface MiniAppRendererProps {
  spec: MiniApp;
  initialScreenId?: string;
}

export function MiniAppRenderer({ spec, initialScreenId }: MiniAppRendererProps) {
  const [screenId, setScreenId] = useState(initialScreenId ?? spec.screens[0]?.id ?? "");
  const [state, setStateLocal] = useState<Record<string, unknown>>(() => {
    // Load persisted state, fall back to initialState from spec
    const persisted = getState(spec.appId);
    if (Object.keys(persisted).length > 0) return persisted;
    return spec.initialState ?? {};
  });

  // Persist state to MMKV on every change
  useEffect(() => {
    setFullState(spec.appId, state);
  }, [state, spec.appId]);

  const dispatch = useCallback((action: MiniAppAction) => {
    setStateLocal((prev) => {
      const next = { ...prev };

      switch (action.type) {
        case "setState":
          next[action.key] = action.value;
          break;

        case "append": {
          const arr = Array.isArray(next[action.key]) ? [...(next[action.key] as unknown[])] : [];
          const value = action.fromKey ? next[action.fromKey] : action.value;
          if (value !== undefined && value !== "") {
            arr.push(value);
            next[action.key] = arr;
            // Clear the source input if fromKey was used
            if (action.fromKey) {
              next[action.fromKey] = "";
            }
          }
          break;
        }

        case "remove": {
          const arr = Array.isArray(next[action.key]) ? [...(next[action.key] as unknown[])] : [];
          if (action.index !== undefined && action.index >= 0 && action.index < arr.length) {
            arr.splice(action.index, 1);
            next[action.key] = arr;
          }
          break;
        }

        case "submit": {
          // Submit copies current input values into the target key
          // Useful for form-like patterns
          const current = next[action.targetKey];
          if (typeof current === "string" && current.trim()) {
            // Basic submit: just confirm the value is set
          }
          break;
        }

        case "navigate":
          // Handled by onNavigate, not state
          break;
      }

      return next;
    });
  }, []);

  const onNavigate = useCallback((targetScreenId: string) => {
    setScreenId(targetScreenId);
  }, []);

  const currentScreen = spec.screens.find((s) => s.id === screenId) ?? spec.screens[0];
  if (!currentScreen) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {currentScreen.components.map((component) => (
        <View key={component.id}>
          {renderSingleComponent(component, state, dispatch, onNavigate)}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
