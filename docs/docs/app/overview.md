---
sidebar_position: 1
title: App Overview
---

# App Package

**Location:** `app/src/`
**Stack:** React Native, Expo 54, React Navigation v7, TypeScript

The app is a generic mini-app player. It loads JSON specs from storage, renders interactive UIs, manages per-app state, and syncs to the cloud.

## Product Screens

- `HomeScreen` (My Apps)
- `SocialScreen`
- `CreateScreen`
- `DeveloperLibraryScreen` (Official)
- `ProfileScreen`
- `LegalScreen`
- `MiniAppScreen`
- plus onboarding/auth screens

## Directory Structure

```mermaid
graph TD
    App["app/src/"]
    App --> API["api/<br/>HTTP client, Supabase proxy"]
    App --> Auth["auth/<br/>Supabase auth client"]
    App --> Caps["capabilities/<br/>Permission manager"]
    App --> Comp["components/<br/>Renderers + UI"]
    App --> Config["config.ts<br/>App configuration"]
    App --> Ctx["context/<br/>Auth, Generation, Onboarding"]
    App --> Hooks["hooks/<br/>useConditional"]
    App --> Nav["navigation/<br/>Auth stack"]
    App --> Screens["screens/<br/>core product screens"]
    App --> Storage["storage/<br/>AsyncStorage layer"]
    App --> Types["types/<br/>Navigation types"]

    Comp --> MR["MiniAppRenderer.tsx<br/>(core engine)"]
    Comp --> Rend["renderers/<br/>20 component files"]

    style App fill:#4f46e5,color:#fff,stroke:none
    style MR fill:#dc2626,color:#fff,stroke:none
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root: providers, navigation container, initialization |
| `config.ts` | Reads from `swissknife.config.js` via Expo extras |
| `components/MiniAppRenderer.tsx` | Core rendering engine (584 lines) |
| `storage/storageLayer.ts` | AsyncStorage + in-memory cache |
| `capabilities/capabilityManager.ts` | Native permission system |
| `context/GenerationContext.tsx` | Generation/modification orchestration |
| `context/AuthContext.tsx` | Supabase session management |
| `api/client.ts` | HTTP calls to server |
| `api/supabaseClient.ts` | Cloud storage proxy |

## Boot Sequence

```mermaid
sequenceDiagram
    participant App as App.tsx
    participant Store as Storage
    participant Device as DeviceId
    participant Auth as AuthContext
    participant Nav as Navigation

    App->>Store: initStorage()
    App->>Device: initDeviceId()
    App->>Auth: Check session
    Auth-->>Nav: Route decision

    alt First launch
        Nav->>Nav: OnboardingScreen
    else Not logged in
        Nav->>Nav: AuthStack (Login/Signup)
    else Logged in
        Nav->>Nav: MainTabs
    end
```

## Contexts

### AuthContext
- Wraps the entire app
- Provides: `session`, `signIn()`, `signUp()`, `signOut()`
- Uses Supabase Auth (email + password)

### GenerationContext
- Available within MainTabs
- Provides: `startGenerate()`, `startModify()`, `busy`, `notification`
- Orchestrates the full generate/modify lifecycle:
  1. Call server API
  2. Request capabilities
  3. Save to storage
  4. Show notification toast

### OnboardingContext
- One-time onboarding flow
- Tracks `hasSeenOnboarding` in AsyncStorage

## Configuration

```typescript
// app/src/config.ts
{
  apiBaseUrl: "http://192.168.x.x:3001",  // Server URL (LAN IP for devices)
  supabaseUrl: "https://xxx.supabase.co",
  supabaseAnonKey: "eyJ...",
  debug: true
}
```

Read from `swissknife.config.js` → `app.config.js` → Expo `extra` → `config.ts`.
