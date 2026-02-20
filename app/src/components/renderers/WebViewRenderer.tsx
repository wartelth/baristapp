import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { resolveTemplate } from "@swissknife/shared";
import type { RendererProps } from "../../types";
import { useTheme, themeToCssVars } from "../ThemeProvider";

/**
 * WebViewRenderer — Apple Guideline 4.7 compliant HTML5 mini-app renderer.
 *
 * Renders AI-generated HTML/CSS/JS in a sandboxed WKWebView (iOS) / WebView (Android).
 * Ships a built-in design system (CSS variables, utility classes, typography scale)
 * so LLM-generated HTML looks polished out of the box.
 */

function buildBridgeScript(stateKeys: string[], state: Record<string, unknown>): string {
  const injectedState: Record<string, unknown> = {};
  for (const key of stateKeys) {
    injectedState[key] = state[key];
  }

  return `
    (function() {
      var _state = ${JSON.stringify(injectedState)};
      var _listeners = [];
      var _ready = false;
      var _readyCallbacks = [];

      window.__SWISSKNIFE_STATE__ = _state;

      window.SwissKnife = {
        getState: function(key) {
          return key ? _state[key] : Object.assign({}, _state);
        },
        setState: function(key, value) {
          _state[key] = value;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'setState', key: key, value: value
          }));
        },
        dispatch: function(action) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'dispatch', action: action
          }));
        },
        sendMessage: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'message', data: data
          }));
        },
        onStateUpdate: function(callback) {
          _listeners.push(callback);
        },
        ready: function(callback) {
          if (_ready) { try { callback(); } catch(e) { console.error(e); } }
          else _readyCallbacks.push(callback);
        },
        _receiveState: function(newState) {
          _state = Object.assign(_state, newState);
          window.__SWISSKNIFE_STATE__ = _state;
          _listeners.forEach(function(cb) {
            try { cb(_state); } catch(e) { console.error('SwissKnife listener error:', e); }
          });
        }
      };

      _ready = true;
      _readyCallbacks.forEach(function(cb) { try { cb(); } catch(e) { console.error(e); } });
      _readyCallbacks = [];
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bridgeReady' }));
    })();
    true;
  `;
}

const DESIGN_SYSTEM_CSS = `
:root {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,.5);
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  --ease: cubic-bezier(.4,0,.2,1);
  --ease-bounce: cubic-bezier(.34,1.56,.64,1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
  min-height: 100%;
}

body { padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); }

/* --- Typography --- */
h1 { font-size: 28px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px; }
h2 { font-size: 22px; font-weight: 700; line-height: 1.25; letter-spacing: -0.3px; }
h3 { font-size: 18px; font-weight: 600; line-height: 1.3; }
h4 { font-size: 16px; font-weight: 600; line-height: 1.35; }
p, li { font-size: 15px; line-height: 1.5; color: var(--text2); }
small, .caption { font-size: 13px; color: var(--text2); }
code, pre { font-family: var(--font-mono); font-size: 13px; }
pre { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; overflow-x: auto; }
a { color: var(--primary); text-decoration: none; }

/* --- Card --- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 12px;
  transition: transform .15s var(--ease), box-shadow .15s var(--ease);
}
.card:active { transform: scale(.98); box-shadow: var(--shadow-sm); }
.card-lg { padding: 20px; border-radius: var(--radius-lg); }

/* --- Button --- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 24px;
  border: none; border-radius: var(--radius-md);
  font-size: 16px; font-weight: 600; font-family: var(--font);
  color: #fff; background: var(--primary);
  cursor: pointer; user-select: none;
  transition: transform .1s var(--ease), opacity .1s var(--ease);
  -webkit-appearance: none;
}
.btn:active { transform: scale(.96); opacity: .85; }
.btn-secondary { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
.btn-danger { background: var(--danger); }
.btn-success { background: var(--success); }
.btn-ghost { background: transparent; color: var(--primary); }
.btn-sm { padding: 8px 16px; font-size: 14px; border-radius: var(--radius-sm); }
.btn-lg { padding: 16px 32px; font-size: 18px; }
.btn-full { width: 100%; }
.btn-pill { border-radius: var(--radius-full); }

/* --- Input --- */
input, textarea, select {
  width: 100%;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-size: 16px; font-family: var(--font);
  outline: none;
  transition: border-color .15s var(--ease);
}
input:focus, textarea:focus, select:focus { border-color: var(--primary); }
input::placeholder, textarea::placeholder { color: var(--text2); opacity: .6; }

/* --- Badge / Chip --- */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px; font-weight: 600;
  background: var(--primary); color: #fff;
}
.badge-outline { background: transparent; border: 1px solid var(--border); color: var(--text2); }
.badge-success { background: var(--success); }
.badge-danger { background: var(--danger); }

/* --- Progress --- */
.progress-track {
  width: 100%; height: 8px;
  background: var(--border); border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: var(--radius-full);
  background: var(--primary);
  transition: width .4s var(--ease);
}

/* --- Layout utilities --- */
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.flex-row { display: flex; flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* --- Spacing (4px scale) --- */
.gap-1 { gap: 4px; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .gap-4 { gap: 16px; } .gap-5 { gap: 20px; } .gap-6 { gap: 24px; }
.p-1 { padding: 4px; } .p-2 { padding: 8px; } .p-3 { padding: 12px; } .p-4 { padding: 16px; } .p-5 { padding: 20px; }
.px-2 { padding-left: 8px; padding-right: 8px; } .px-3 { padding-left: 12px; padding-right: 12px; } .px-4 { padding-left: 16px; padding-right: 16px; }
.py-2 { padding-top: 8px; padding-bottom: 8px; } .py-3 { padding-top: 12px; padding-bottom: 12px; } .py-4 { padding-top: 16px; padding-bottom: 16px; }
.m-0 { margin: 0; } .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
.mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; } .mt-4 { margin-top: 16px; }

/* --- Borders & Radius --- */
.rounded { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-full { border-radius: var(--radius-full); }
.border { border: 1px solid var(--border); }

/* --- Colors --- */
.text-primary { color: var(--primary); }
.text-muted { color: var(--text2); }
.text-danger { color: var(--danger); }
.text-success { color: var(--success); }
.text-white { color: #fff; }
.bg-surface { background: var(--surface); }
.bg-primary { background: var(--primary); }

/* --- Animations --- */
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.animate-fade { animation: fadeIn .3s var(--ease) both; }
.animate-slide { animation: slideUp .4s var(--ease-bounce) both; }
.animate-pulse { animation: pulse 2s var(--ease) infinite; }

/* Stagger children animations */
.stagger > * { animation: fadeIn .3s var(--ease) both; }
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: .05s; }
.stagger > *:nth-child(3) { animation-delay: .1s; }
.stagger > *:nth-child(4) { animation-delay: .15s; }
.stagger > *:nth-child(5) { animation-delay: .2s; }
.stagger > *:nth-child(6) { animation-delay: .25s; }
.stagger > *:nth-child(7) { animation-delay: .3s; }
.stagger > *:nth-child(8) { animation-delay: .35s; }

/* --- Misc --- */
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
img, svg { max-width: 100%; display: block; }
canvas { display: block; }
.divider { height: 1px; background: var(--border); margin: 16px 0; }
.avatar { width: 40px; height: 40px; border-radius: var(--radius-full); object-fit: cover; }
.icon { width: 24px; height: 24px; display: inline-block; vertical-align: middle; }
`;

function wrapHtml(html: string, bridgeScript: string, cssVars: string): string {
  const themeStyle = `:root{${cssVars}}`;

  if (html.includes("<html") || html.includes("<!DOCTYPE")) {
    return html.replace(
      /<head[^>]*>/i,
      `$&<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${themeStyle}${DESIGN_SYSTEM_CSS}</style>${bridgeScript ? `<script>${bridgeScript}</script>` : ""}`
    );
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>${themeStyle}${DESIGN_SYSTEM_CSS}</style>
  ${bridgeScript ? `<script>${bridgeScript}</script>` : ""}
</head>
<body>
${html}
</body>
</html>`;
}

const ALLOWED_MESSAGE_TYPES = new Set(["setState", "dispatch", "message", "bridgeReady"]);

export function WebViewRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "webView") return null;

  const theme = useTheme();
  const { html, htmlKey, height = 400, stateKeys = [], allowBridge = true, onMessage } = component.props;
  const webViewRef = useRef<WebView>(null);

  const rawHtml = htmlKey ? String(state[htmlKey] ?? "") : (html ?? "");
  const resolvedHtml = String(resolveTemplate(rawHtml, state) ?? rawHtml);

  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  const bridgeScript = useMemo(
    () => allowBridge ? buildBridgeScript(stateKeys, state) : "",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowBridge, JSON.stringify(stateKeys)]
  );

  const fullHtml = useMemo(
    () => wrapHtml(resolvedHtml, bridgeScript, cssVars),
    [resolvedHtml, bridgeScript, cssVars]
  );

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

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

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
            dispatch({ type: "setState", key: "__webViewMessage", value: msg.data } as any);
            setTimeout(() => dispatch(onMessage), 0);
          }
          break;

        case "bridgeReady":
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
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === "about:blank" || request.url.startsWith("data:")) return true;
          return false;
        }}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
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
