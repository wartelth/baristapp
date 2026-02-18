import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { resolveTemplate } from "@swissknife/shared";
import type { RendererProps } from "../../types";

/**
 * WebViewRenderer — Apple Guideline 4.7 compliant HTML5 mini-app renderer.
 *
 * Renders AI-generated HTML/CSS/JS in a sandboxed WKWebView (iOS) / WebView (Android).
 * Communication with the native app happens through a controlled postMessage bridge.
 *
 * Security constraints:
 *   - HTML runs in WebKit sandbox (no native API access)
 *   - Bridge only exposes: state read, state write, dispatch action
 *   - No access to camera, location, filesystem, etc. from WebView JS
 *   - All bridge messages are validated before processing
 */

// The JS injected into every WebView to set up the bridge
function buildBridgeScript(stateKeys: string[], state: Record<string, unknown>): string {
  // Extract only the requested state keys
  const injectedState: Record<string, unknown> = {};
  for (const key of stateKeys) {
    injectedState[key] = state[key];
  }

  return `
    (function() {
      // --- SwissKnife Bridge API ---
      // Available to HTML mini-apps as window.SwissKnife

      var _state = ${JSON.stringify(injectedState)};
      var _listeners = [];

      window.__SWISSKNIFE_STATE__ = _state;

      window.SwissKnife = {
        // Read a state value
        getState: function(key) {
          return key ? _state[key] : Object.assign({}, _state);
        },

        // Request a state update (sends to native)
        setState: function(key, value) {
          _state[key] = value;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'setState',
            key: key,
            value: value
          }));
        },

        // Dispatch a declarative action (sends to native)
        dispatch: function(action) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'dispatch',
            action: action
          }));
        },

        // Send a custom message to native
        sendMessage: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'message',
            data: data
          }));
        },

        // Listen for state updates from native
        onStateUpdate: function(callback) {
          _listeners.push(callback);
        },

        // Internal: called by native to push state updates
        _receiveState: function(newState) {
          _state = Object.assign(_state, newState);
          window.__SWISSKNIFE_STATE__ = _state;
          _listeners.forEach(function(cb) {
            try { cb(_state); } catch(e) { console.error('SwissKnife listener error:', e); }
          });
        }
      };

      // Signal that bridge is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bridgeReady' }));
    })();
    true;
  `;
}

// Wrap raw HTML with proper document structure and bridge
function wrapHtml(html: string, bridgeScript: string): string {
  // If the HTML already has a <html> tag, inject the bridge script
  if (html.includes("<html") || html.includes("<!DOCTYPE")) {
    return html.replace(
      /<head[^>]*>/i,
      `$&<script>${bridgeScript}</script>`
    );
  }

  // Otherwise wrap in a full document
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script>${bridgeScript}</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111118;
      color: #ffffff;
      padding: 16px;
      -webkit-font-smoothing: antialiased;
    }
    a { color: #818cf8; }
    button {
      background: #1e40af;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    button:active { opacity: 0.8; }
    input, textarea, select {
      background: #1e1e2e;
      color: white;
      border: 1px solid #333;
      padding: 10px;
      border-radius: 8px;
      font-size: 16px;
      width: 100%;
    }
    canvas { display: block; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

// Allowed bridge message types
const ALLOWED_MESSAGE_TYPES = new Set(["setState", "dispatch", "message", "bridgeReady"]);

export function WebViewRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "webView") return null;

  const { html, htmlKey, height = 400, stateKeys = [], allowBridge = true, onMessage } = component.props;
  const webViewRef = useRef<WebView>(null);

  // Resolve the HTML content
  const rawHtml = htmlKey ? String(state[htmlKey] ?? "") : (html ?? "");
  const resolvedHtml = String(resolveTemplate(rawHtml, state) ?? rawHtml);

  // Build bridge script with current state
  const bridgeScript = useMemo(
    () => allowBridge ? buildBridgeScript(stateKeys, state) : "",
    // Only rebuild when stateKeys list changes, not on every state update
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowBridge, JSON.stringify(stateKeys)]
  );

  const fullHtml = useMemo(
    () => allowBridge ? wrapHtml(resolvedHtml, bridgeScript) : wrapHtml(resolvedHtml, ""),
    [resolvedHtml, bridgeScript, allowBridge]
  );

  // Push state updates to WebView when relevant state keys change
  useEffect(() => {
    if (!allowBridge || !webViewRef.current || stateKeys.length === 0) return;

    const stateUpdate: Record<string, unknown> = {};
    for (const key of stateKeys) {
      stateUpdate[key] = state[key];
    }

    webViewRef.current.injectJavaScript(`
      if (window.SwissKnife && window.SwissKnife._receiveState) {
        window.SwissKnife._receiveState(${JSON.stringify(stateUpdate)});
      }
      true;
    `);
  }, [allowBridge, state, stateKeys]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      // Validate message type
      if (!msg || !ALLOWED_MESSAGE_TYPES.has(msg.type)) {
        console.warn("[WebViewRenderer] Unknown message type:", msg?.type);
        return;
      }

      switch (msg.type) {
        case "setState":
          if (typeof msg.key === "string" && msg.key.length > 0 && msg.key.length < 200) {
            dispatch({ type: "setState", key: msg.key, value: msg.value } as any);
          }
          break;

        case "dispatch":
          if (msg.action && typeof msg.action === "object" && typeof msg.action.type === "string") {
            dispatch(msg.action);
          }
          break;

        case "message":
          if (onMessage) {
            // Store the message data in a special key, then dispatch the onMessage action
            dispatch({ type: "setState", key: "__webViewMessage", value: msg.data } as any);
            setTimeout(() => dispatch(onMessage), 0);
          }
          break;

        case "bridgeReady":
          // Bridge initialized successfully
          break;
      }
    } catch {
      console.warn("[WebViewRenderer] Failed to parse WebView message");
    }
  }, [dispatch, onMessage]);

  if (!resolvedHtml) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No content to display</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: fullHtml }}
        style={styles.webView}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={allowBridge ? handleMessage : undefined}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#818cf8" />
          </View>
        )}
        // Security: disable navigation away from the inline HTML
        onShouldStartLoadWithRequest={(request) => {
          // Allow the initial about:blank and data: URIs
          if (request.url === "about:blank" || request.url.startsWith("data:")) return true;
          // Block external navigation
          return false;
        }}
        // Disable file access
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        // Prevent zoom
        scalesPageToFit={false}
        scrollEnabled={true}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
    backgroundColor: "#111118",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111118",
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
});
