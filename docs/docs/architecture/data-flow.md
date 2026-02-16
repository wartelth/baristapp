---
sidebar_position: 2
title: Data Flow
---

# Data Flow

This page documents the complete data flow for every major operation in SwissKnife.

## Create Flow

The journey from user prompt to rendered mini-app:

```mermaid
sequenceDiagram
    actor User
    participant Create as CreateScreen
    participant Gen as GenerationContext
    participant API as Server API
    participant Claude as Claude AI
    participant Val as Validator
    participant Store as Storage

    User->>Create: Enter prompt
    Create->>API: POST /api/clarify
    API->>Claude: Haiku — generate questions
    Claude-->>API: 3 questions + summary
    API-->>Create: ClarifyResponse
    Create->>User: Show questions
    User->>Create: Answer questions

    Create->>Gen: startGenerate(prompt, answers)
    Gen->>API: POST /api/generate
    API->>Claude: Agent SDK — Sonnet/Opus
    Claude-->>API: JSON spec
    API->>Val: validateMiniApp(spec)
    Val-->>API: Validated MiniApp

    API->>API: Mount server endpoints
    API-->>Gen: GenerateResponse

    Gen->>Store: saveApp(spec)
    Gen->>Gen: requestAllCapabilities()
    Gen->>User: Show notification
    User->>User: Tap → Navigate to MiniApp
```

### Model Selection

The server picks the Claude model based on prompt complexity:

```mermaid
flowchart TD
    P["Incoming prompt"] --> Check{"Contains keywords?<br/>camera, chart, ML, timer...<br/>OR length > 500 chars"}
    Check -->|Yes| Opus["Claude Opus 4.6<br/>$2.00 budget, 6 turns"]
    Check -->|No| Sonnet["Claude Sonnet 4.5<br/>$0.50 budget, 3 turns"]

    style Opus fill:#7c3aed,color:#fff,stroke:none
    style Sonnet fill:#4f46e5,color:#fff,stroke:none
```

## Modify Flow

Editing an existing mini-app:

```mermaid
sequenceDiagram
    actor User
    participant Home as HomeScreen
    participant Gen as GenerationContext
    participant API as Server API
    participant Claude as Claude AI
    participant Store as Storage

    User->>Home: Tap "Edit" on app
    Home->>User: Show modify modal
    User->>Home: Enter modification prompt

    Home->>Gen: startModify(currentSpec, prompt)
    Gen->>API: POST /api/modify
    Note over API: System prompt includes<br/>current spec JSON
    API->>Claude: Agent SDK — Sonnet 4.5
    Claude-->>API: Modified JSON spec
    API->>API: Validate + preserve appId
    API->>API: Re-mount endpoints
    API-->>Gen: ModifyResponse

    Gen->>Store: clearState(appId)
    Gen->>Store: saveApp(newSpec)
    Gen->>User: Show notification
```

## Runtime Flow

How a mini-app executes after loading:

```mermaid
flowchart TD
    Load["Load spec from storage"] --> Init["Initialize state<br/>(local → cloud fallback)"]
    Init --> Render["Render current screen"]
    Render --> Vis{"visibleWhen<br/>check"}
    Vis -->|visible| Comp["Render component"]
    Vis -->|hidden| Skip["Skip"]
    Comp --> Interact{"User<br/>interaction?"}
    Interact -->|Yes| Dispatch["dispatch(action)"]

    Dispatch --> Type{"Action type?"}
    Type -->|setState / append / remove / compute| Sync["Update state (sync)"]
    Type -->|http / serverCall| Async["Fetch → setState"]
    Type -->|navigate| Nav["Set screen ID"]
    Type -->|timer| Timer["Start/stop interval"]
    Type -->|conditional| Cond["Evaluate → dispatch branch"]
    Type -->|batch| Batch["Collect sync → apply once<br/>Then dispatch async"]

    Sync --> Persist["Persist locally + cloud sync"]
    Async --> Persist
    Persist --> Render

    style Load fill:#4f46e5,color:#fff,stroke:none
    style Dispatch fill:#6366f1,color:#fff,stroke:none
    style Persist fill:#818cf8,color:#fff,stroke:none
```

### Batch Action Strategy

The renderer has a critical optimization for `batch` actions to prevent state race conditions:

```mermaid
flowchart LR
    Batch["batch action"] --> Collect["1. Collect all sync actions"]
    Collect --> Apply["2. Apply in ONE setState"]
    Apply --> Defer["3. Dispatch async with setTimeout(0)"]

    style Batch fill:#4f46e5,color:#fff,stroke:none
    style Apply fill:#dc2626,color:#fff,stroke:none
```

## Storage Flow

Dual-layer persistence strategy:

```mermaid
flowchart TB
    subgraph App["App Layer"]
        State["React State"]
        Cache["In-Memory Cache"]
        AS["AsyncStorage"]
    end

    subgraph Cloud["Cloud Layer"]
        Proxy["Server Proxy"]
        Supa["Supabase DB"]
    end

    State -->|"every change"| Cache
    Cache -->|"write-through"| AS
    Cache -->|"debounced (2s)"| Proxy
    Proxy -->|"save"| Supa

    Supa -->|"bootstrap on mount"| Proxy
    Proxy -->|"if local empty"| Cache

    style App fill:#1e1b4b,color:#e0e7ff,stroke:#4f46e5
    style Cloud fill:#0f172a,color:#e0e7ff,stroke:#334155
```

**Storage keys:**
- `app:{appId}:spec` — The mini-app JSON spec
- `app:{appId}:state` — Current app state
- `apps:index` — List of all saved app IDs

## Auth Flow

```mermaid
stateDiagram-v2
    [*] --> Onboarding: First launch
    Onboarding --> Auth: "Get started"
    Auth --> Login
    Auth --> Signup
    Login --> MainTabs: Success
    Signup --> MainTabs: Success
    MainTabs --> Auth: Sign out

    state MainTabs {
        [*] --> Apps
        Apps --> Social
        Social --> Create
        Create --> Library
        Library --> Profile
        Apps --> MiniApp: Tap app
        Social --> MiniApp: Open imported app
        Library --> MiniApp: Open official template
    }
```

**Identity resolution:**
- Logged in → JWT `sub` claim (verified with `SUPABASE_JWT_SECRET`)
- Anonymous → `x-device-id` header (UUID stored on device)

## Share & Import Flow

```mermaid
sequenceDiagram
    actor Owner as Owner User
    participant Apps as My Apps Screen
    participant API as Server API
    participant Social as Social Screen
    actor Friend as Friend User

    Owner->>Apps: Tap Share on app card
    Apps->>API: POST /api/social/share/:appId
    API-->>Apps: short code (abc-def-ghi)
    Apps->>Owner: Show QR + code + native share sheet

    Friend->>Social: Open Import modal
    Friend->>Social: Type code OR scan QR
    Social->>API: POST /api/social/import/:shareCode
    API-->>Social: Imported app spec + owner metadata
    Social->>Social: saveApp + saveAppMeta
    Social->>Friend: Open imported app or go to My Apps
```

## Server Endpoints Flow

Per-app server endpoints for ML, transforms, and proxied APIs:

```mermaid
flowchart LR
    App["App"] -->|"serverCall action"| Route["/api/apps/:appId/endpoints/:endpointId"]

    Route --> Type{"processing type"}
    Type -->|huggingface| HF["HuggingFace<br/>Inference API"]
    Type -->|transform| TF["JSON Template<br/>Interpolation"]
    Type -->|proxy| PX["Whitelisted<br/>External API"]

    HF --> Res["Response → resultKey"]
    TF --> Res
    PX --> Res

    style Route fill:#4f46e5,color:#fff,stroke:none
```

**Whitelisted proxy domains:** HuggingFace, OpenWeatherMap, JSONPlaceholder, PokeAPI, GitHub API.
