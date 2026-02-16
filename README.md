# SwissKnife — Project Architecture & Source Code Guide

> **Purpose:** This document provides a comprehensive introduction to the SwissKnife codebase for AI models and developers. It explains the structure of both the **app** (React Native/Expo) and the **server** (Express/Node.js), the shared schema, and how components interact.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Shared Package (`@swissknife/shared`)](#3-shared-package-swissknifeshared)
4. [App Package (`@swissknife/app`)](#4-app-package-swissknifeapp)
5. [Server Package (`@swissknife/server`)](#5-server-package-swissknifeserver)
6. [Data Flow & API Contract](#6-data-flow--api-contract)
7. [Key Concepts for AI Assistants](#7-key-concepts-for-ai-assistants)

---

## 1. Project Overview

**SwissKnife** is an AI-powered mini-app generator. Users describe a tool they need in natural language; the system:

1. **Clarifies** — Asks follow-up questions to refine the request (Claude Haiku)
2. **Generates** — Produces a declarative JSON spec for a mini-app (Claude Agent SDK)
3. **Renders** — The app interprets the spec and renders a fully interactive React Native UI
4. **Modifies** — Users can request changes via natural language (Claude Agent SDK)

The output is a **declarative schema** (screens, components, actions, state) — not executable code. The app is a **generic renderer** that interprets this schema. This design ensures security (no `eval`, no remote scripts) and portability.

---

## 2. Monorepo Structure

```
SwissKnife/
├── app/          # React Native (Expo) mobile app — the "player"
├── server/       # Express API — generation, modification, storage, per-app endpoints
├── shared/       # Zod schemas + TypeScript types — single source of truth
├── src/          # This README + project docs
└── package.json  # Workspaces: shared, server, app
```

**Workspace scripts:**
- `npm run server` — Start the backend (tsx watch)
- `npm run app` — Start Expo dev server
- `npm run typecheck` — Type-check shared + server

---

## 3. Shared Package (`@swissknife/shared`)

**Location:** `shared/src/`  
**Purpose:** Single source of truth for the MiniApp schema and API types. Used by both app and server.

### 3.1 Files

| File | Purpose |
|------|---------|
| `schema.ts` | Zod schemas for all components, actions, screens, theme, effects, server endpoints |
| `types.ts` | TypeScript types inferred from schemas + API request/response types |
| `index.ts` | Re-exports schema + types |

### 3.2 Schema Versions

- **v1** (`MiniAppSchemaV1`): Basic screens, 5 components, simple actions
- **v2** (`MiniAppSchemaV2`): 20 components, 13 action types, theme, `serverEndpoints`, `effects`
- **Unified** (`MiniAppSchema`): Union of v1 and v2 for backward compatibility

### 3.3 Component Types (20 total)

| Category | Components |
|----------|------------|
| **Display** | `text`, `image` |
| **Input** | `input`, `slider`, `toggle`, `select`, `datePicker` |
| **Layout** | `container`, `card`, `tabs`, `modal`, `divider`, `spacer` |
| **Lists** | `list` (with `renderItem.components`) |
| **Media** | `cameraView`, `audioRecorder` |
| **Data viz** | `chart`, `progress`, `mapView` |
| **Actions** | `button` (wraps any action) |

All components support optional `visibleWhen` for conditional rendering.

### 3.4 Action Types (13 total)

| Type | Purpose |
|------|---------|
| `navigate` | Switch screen |
| `setState` | Set a state key |
| `append` | Append to array (e.g. list item) |
| `remove` | Remove from array |
| `submit` | Submit form to target key |
| `http` | Fetch URL, store in `resultKey` |
| `compute` | Math/string ops: add, concat, increment, now, etc. |
| `serverCall` | Call app-specific server endpoint |
| `haptic` | Vibration feedback |
| `copyToClipboard` | Copy text |
| `timer` | Start/stop/reset interval, optional `tickAction` |
| `conditional` | Branch on state (then/else actions) |
| `batch` | Run multiple actions (sync + async) |

### 3.5 Capabilities

Declared per-app; the app requests native permissions when needed:

- `localStorage`, `camera`, `microphone`, `location`, `network`, `haptics`, `clipboard`, `notifications`, `supabaseStorage`

### 3.6 Server Endpoints (v2)

Each endpoint has:
- `id`: Endpoint identifier
- `method`: GET/POST/PUT/DELETE
- `processing`: One of `huggingface`, `transform`, `proxy` — see [5.4](#54-subservers-per-app-endpoints)

### 3.7 Effects (v2)

- `onMount`: Run action when screen loads
- `onInterval`: Run action every `intervalMs`
- `onStateChange`: Run action when `stateKey` changes

### 3.8 API Types

- **Clarify:** `ClarifyRequest`, `ClarifyResponse`, `ClarificationQuestion`
- **Generate:** `GenerateRequest`, `GenerateResponse`, `GenerateResult`
- **Modify:** `ModifyRequest`, `ModifyResponse`, `ModifyResult`

---

## 4. App Package (`@swissknife/app`)

**Location:** `app/src/`  
**Stack:** React Native, Expo, React Navigation  
**Role:** Generic mini-app player — loads specs from local storage, renders them, manages state, syncs to cloud.

### 4.1 Entry & Navigation

| File | Purpose |
|------|---------|
| `App.tsx` | Root: `GenerationProvider`, `NavigationContainer`, `Stack.Navigator` |
| `index.ts` | Expo entry point |

**Screens:**
- `Home` — Grid of saved mini-apps, search, add, delete, modify
- `Create` — Prompt input → clarify → questions → generate (background)
- `MiniApp` — Renders a single mini-app via `MiniAppRenderer`

### 4.2 App Structure

```
app/src/
├── api/              # HTTP client + Supabase proxy
│   ├── client.ts     # clarify, generate, modify, callServerEndpoint
│   └── supabaseClient.ts  # Cloud spec/state sync via server proxy
├── capabilities/     # Permission requests
│   └── capabilityManager.ts
├── components/       # UI components
│   ├── MiniAppRenderer.tsx   # Core: interprets spec, dispatches actions
│   ├── ThemeProvider.tsx
│   ├── MiniAppCard.tsx
│   ├── HeaderSpinner.tsx
│   ├── NotificationToast.tsx
│   ├── LoadingOverlay.tsx
│   └── renderers/    # One per component type (20 files)
├── context/
│   └── GenerationContext.tsx  # busy, startGenerate, startModify, notification
├── hooks/
│   └── useConditional.ts     # evaluateVisibility for visibleWhen
├── screens/
│   ├── HomeScreen.tsx
│   ├── CreateScreen.tsx
│   └── MiniAppScreen.tsx
├── storage/
│   └── storageLayer.ts       # AsyncStorage + in-memory cache
└── types/
    └── index.ts              # RendererProps, re-exports from shared
```

### 4.3 MiniAppRenderer — Core Engine

**File:** `app/src/components/MiniAppRenderer.tsx`

Responsibilities:
1. **State:** `useState` for screen + app state; initialized from `getState(appId)` or `spec.initialState`
2. **Persistence:** On every state change → `setFullState(appId, state)` + debounced `saveCloudState`
3. **Cloud bootstrap:** On mount, if local state is empty/default → `loadCloudState`
4. **Component registry:** `RENDERERS` map from `component.type` to React component
5. **Dispatch:** Handles all action types — sync (setState, append, remove, compute), async (http, serverCall), side effects (navigate, haptic, timer, conditional, batch)
6. **Effects:** Runs `onMount`, `onInterval`, `onStateChange` from `spec.effects`
7. **Visibility:** Uses `evaluateVisibility(visibleWhen, state)` before rendering each component

**Important:** `dispatch` is stable (`useCallback` with `[spec.appId]`). It reads state via `stateRef.current` to avoid stale closures.

### 4.4 Renderers

Each renderer receives `RendererProps`:
- `component`, `state`, `dispatch`, `onNavigate`, `renderChild` (for containers)

Examples:
- `ButtonRenderer` — Renders button, on press dispatches `action` (or navigates)
- `ListRenderer` — Maps `dataKey` array, renders `renderItem.components` per item via `renderChild`
- `ContainerRenderer`, `CardRenderer`, `TabsRenderer`, `ModalRenderer` — Layout; render `children` via `renderChild`

### 4.5 Storage Layer

**File:** `app/src/storage/storageLayer.ts`

- **In-memory cache** + AsyncStorage write-through
- Keys: `app:{appId}:spec`, `app:{appId}:state`, `apps:index`
- `initStorage()` — Load all keys into cache at boot (must be awaited)
- `saveApp`, `getApp`, `listApps`, `deleteApp`
- `getState`, `setState`, `setFullState`, `clearState`

### 4.6 GenerationContext

**File:** `app/src/context/GenerationContext.tsx`

- `startGenerate(prompt, clarifications?)` — Calls `generateMiniApp`, requests capabilities, saves app, shows notification
- `startModify(spec, prompt)` — Calls `modifyMiniApp`, clears state, saves new spec, shows notification
- `busy`, `busyLabel`, `busySince`, `progressVisible`, `toggleProgress`
- `notification`, `dismissNotification`

### 4.7 Capability Manager

**File:** `app/src/capabilities/capabilityManager.ts`

- `requestCapability(appId, capability)` — Shows native permission dialogs for camera, microphone, location
- `requestAllCapabilities(appId, caps)` — Requests all caps for a newly generated app
- Auto-granted: `localStorage`, `haptics`, `clipboard`

### 4.8 API Client

**File:** `app/src/api/client.ts`

- `BASE_URL`: Dev = `http://192.168.2.223:3001`, Prod = `https://api.swissknife.app`
- `clarifyPrompt`, `generateMiniApp`, `modifyMiniApp`, `callServerEndpoint`

### 4.9 Supabase Client (App-Side)

**File:** `app/src/api/supabaseClient.ts`

- Uses server as proxy (no Supabase SDK in app)
- `initDeviceId()` — Generates/stores device UUID for user identification
- `loadCloudState`, `saveCloudState`, `saveCloudSpec` — All via server REST API

---

## 5. Server Package (`@swissknife/server`)

**Location:** `server/src/`  
**Stack:** Express, Claude API (Anthropic), Supabase  
**Role:** Generation, modification, clarification, storage, per-app ML/transform/proxy endpoints.

### 5.1 Entry Point

**File:** `server/src/index.ts`

- Express app, CORS, JSON body (10mb limit)
- Request/response logging middleware
- Routes:
  - `GET /health` — Health check
  - `POST /api/clarify` — Clarification
  - `POST /api/generate` — Generation
  - `POST /api/modify` — Modification
  - `ALL /api/apps/:appId/endpoints/:endpointId` — Per-app endpoints
  - `GET/PUT /api/storage/apps/:appId/spec` — App spec
  - `GET/PUT /api/storage/apps/:appId/state` — App state
  - `GET /api/sessions` — Debug: list saved sessions

### 5.2 Routes

| Route | Handler | Purpose |
|-------|---------|---------|
| `clarify.ts` | `clarifyPrompt` | Get clarification questions |
| `generate.ts` | `generateMiniApp` | Generate mini-app spec, mount endpoints |
| `modify.ts` | `modifyMiniApp` | Modify existing spec |
| `apps.ts` | Dynamic | Dispatch to per-app router |
| `storage.ts` | Supabase | Load/save spec and state |

### 5.3 Services

| Service | Purpose |
|---------|---------|
| `claudeService.ts` | `generateMiniApp` — Claude Agent SDK, model selection (Sonnet/Opus), JSON schema output, validation |
| `clarifyService.ts` | `clarifyPrompt` — Claude Messages API (Haiku), returns questions + summary |
| `modifyService.ts` | `modifyMiniApp` — Claude Agent SDK, preserves appId |
| `subServerManager.ts` | `mountAppEndpoints`, `unmountAppEndpoints`, `getAppRouter` — In-memory router registry |
| `sessionStore.ts` | `saveSession`, `listSessions` — Save to `server/tmp/` for debugging |
| `supabaseClient.ts` | `saveAppSpec`, `loadAppSpec`, `saveAppState`, `loadAppState` — Cloud persistence |

### 5.4 Subservers (Per-App Endpoints)

When a v2 app has `serverEndpoints`, they are mounted at `/api/apps/:appId/endpoints/:endpointId`.

| Handler | Type | Purpose |
|---------|------|---------|
| `huggingfaceHandler.ts` | `huggingface` | Forward to HuggingFace Inference API (image/text) |
| `transformHandler.ts` | `transform` | JSON template with `{{key}}` interpolation |
| `proxyHandler.ts` | `proxy` | Proxy to whitelisted external APIs |

### 5.5 Prompts

| File | Purpose |
|------|---------|
| `masterPrompt.ts` | System prompt for generation — documents all 20 components, 13 actions, theme, effects, endpoints |
| `clarifyPrompt.ts` | System prompt for clarification — returns JSON with summary + questions |
| `modifyPrompt.ts` | Builds system prompt with current spec JSON for modification |

### 5.6 Validation

| File | Purpose |
|------|---------|
| `jsonSchema.ts` | JSON Schema for Claude structured output |
| `schemaValidator.ts` | `validateMiniApp(raw)` — Zod parse, `extractJSON(text)` — Strip markdown, parse |

### 5.7 Claude Service Details

- **Model selection:** Simple prompts → Sonnet 4.5; complex (keywords like camera, chart, api, etc. or length > 500) → Opus 4.6
- **Output:** Structured JSON via `outputFormat: { type: "json_schema", schema }` or fallback `extractJSON`
- **Tools:** Disabled (no Bash, Edit, etc.)
- **Session saving:** After successful validation → `saveSession(appId, prompt, miniApp)`

---

## 6. Data Flow & API Contract

### 6.1 Create Flow

```
User enters prompt
    → CreateScreen: clarifyPrompt(prompt)
    → Server: POST /api/clarify → clarifyService → Claude Haiku
    → User answers questions (or skips)
    → CreateScreen: startGenerate(prompt, clarifications)
    → GenerationContext: generateMiniApp(prompt, clarifications)
    → Server: POST /api/generate → claudeService → Claude Agent
    → Server: validateMiniApp, mountAppEndpoints, saveSession
    → App: saveApp, requestAllCapabilities, showNotification
    → User taps notification → navigate to MiniApp
```

### 6.2 Modify Flow

```
User taps "Edit" on Home or MiniApp screen
    → Modal: modify prompt
    → startModify(spec, prompt)
    → Server: POST /api/modify → modifyService → Claude Agent
    → Server: validateMiniApp (preserve appId), re-mount endpoints
    → App: clearState, saveApp, showNotification
    → MiniAppScreen: loadSpec (on notification)
```

### 6.3 Runtime (MiniApp)

```
MiniAppRenderer loads spec from getState(spec.appId)
    → Renders current screen's components
    → User interaction → dispatch(action)
    → Sync: setState/append/remove/compute → persist + cloud sync
    → Async: http/serverCall → fetch → setState on result
    → Navigate: setScreenId
    → Effects: onMount, onInterval, onStateChange
```

### 6.4 Storage Flow

- **Local:** AsyncStorage (`app:${appId}:spec`, `app:${appId}:state`)
- **Cloud:** Server → Supabase (user = `x-device-id` header)
- **Sync:** App writes locally immediately; cloud sync is debounced (2s) and best-effort

---

## 7. Key Concepts for AI Assistants

### 7.1 Schema-First Design

- All component and action shapes are defined in `shared/src/schema.ts`
- Adding a new component type requires: (1) Zod schema in shared, (2) renderer in app, (3) documentation in masterPrompt

### 7.2 Security Constraints

- No `eval`, no executable code, no remote scripts
- All interactivity is declarative actions
- Proxy handler whitelists domains
- Server endpoints are app-scoped

### 7.3 State Model

- Flat key-value store per app
- Keys are strings; values are JSON-serializable
- `stateKey` in components binds to state
- `dataKey` in list/chart binds to array
- `resultKey`, `loadingKey`, `errorKey` for async actions

### 7.4 Adding a New Component

1. Add Zod schema in `shared/src/schema.ts` (and to `Component` union)
2. Add renderer in `app/src/components/renderers/`
3. Register in `MiniAppRenderer.tsx` RENDERERS map
4. Document in `server/src/prompts/masterPrompt.ts`

### 7.5 Adding a New Action

1. Add Zod schema in `shared/src/schema.ts` (and to `Action` union)
2. Handle in `MiniAppRenderer.tsx` dispatch
3. Document in masterPrompt

### 7.6 Environment Variables

**Server:**
- `ANTHROPIC_API_KEY` — Required for Claude
- `HUGGINGFACE_API_KEY` — For HuggingFace endpoints
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — For cloud storage
- `PORT` — Default 3001

**App:**
- Uses `__DEV__` to switch BASE_URL (dev vs prod)

### 7.7 File Naming Conventions

- Components: PascalCase (`MiniAppRenderer.tsx`)
- Renderers: `{Type}Renderer.tsx` (e.g. `ButtonRenderer.tsx`)
- Services: camelCase (`claudeService.ts`)
- Routes: lowercase (`generate.ts`, `clarify.ts`)

---

## Quick Reference: Important Paths

| What | Path |
|------|------|
| MiniApp schema | `shared/src/schema.ts` |
| API types | `shared/src/types.ts` |
| Renderer engine | `app/src/components/MiniAppRenderer.tsx` |
| Generation logic | `server/src/services/claudeService.ts` |
| Master prompt | `server/src/prompts/masterPrompt.ts` |
| Validation | `server/src/validation/schemaValidator.ts` |
| Storage (app) | `app/src/storage/storageLayer.ts` |
| Storage (server) | `server/src/services/supabaseClient.ts` |
| Per-app endpoints | `server/src/services/subServerManager.ts` |

---

*Last updated: February 2026*
