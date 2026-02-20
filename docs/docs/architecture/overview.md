---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

Baristapp is a schema-first mini-app platform: the same contract drives generation, validation, storage, and rendering.

## System Architecture

```mermaid
graph TB
    subgraph Client["Mobile Client (React Native / Expo)"]
        UI["Screens + Navigation"]
        Renderer["MiniAppRenderer"]
        Actions["Action Dispatcher"]
        Local["Local state + storage"]
        Caps["Capability Manager"]
    end

    subgraph Server["Server (Express)"]
        API["REST API"]
        Clarify["Clarify Service"]
        Generate["Generate Service"]
        Modify["Modify Service"]
        Validate["Schema Validator"]
        Session["Session Store"]
        Runtime["Sandbox/Worker Runtime"]
    end

    subgraph Shared["Shared Contract"]
        Schema["Zod Schemas"]
        Types["TS Types"]
        Expr["Expression Engine helpers"]
    end

    subgraph External["External Services"]
        LLM["LLM Provider APIs"]
        DB["Supabase / persistence"]
        Third["Whitelisted third-party APIs"]
    end

    UI --> Renderer
    Renderer --> Actions
    Actions --> Local
    Actions --> Caps
    UI -->|HTTP| API

    API --> Clarify
    API --> Generate
    API --> Modify
    Generate --> Validate
    Modify --> Validate
    API --> Session
    API --> Runtime

    Clarify --> LLM
    Generate --> LLM
    Modify --> LLM
    API --> DB
    Runtime --> Third
    Local -->|cloud sync| API

    Validate --> Schema
    Generate --> Schema
    Renderer --> Schema
    Schema --> Types
    Schema --> Expr

    style Client fill:#1a1310,color:#ede5dc,stroke:#c67c4e
    style Server fill:#1a1310,color:#ede5dc,stroke:#c67c4e
    style Shared fill:#241c16,color:#ede5dc,stroke:#d4956a
    style External fill:#0f0b08,color:#ede5dc,stroke:#7b9a6d
```

## Request lifecycle

```mermaid
sequenceDiagram
    participant User
    participant App as Mobile App
    participant API as Server API
    participant LLM as LLM Provider
    participant Val as Schema Validator

    User->>App: Describe requested app
    App->>API: POST /clarify (optional)
    API->>LLM: Generate clarification prompts
    LLM-->>API: Clarifying questions
    API-->>App: Questions

    App->>API: POST /generate
    API->>LLM: Generate JSON spec
    LLM-->>API: Candidate spec
    API->>Val: Parse + validate
    Val-->>API: Valid MiniApp object
    API-->>App: MiniApp JSON
    App->>App: Render components + wire actions
```

## Package boundaries

| Package | Responsibility | Must not do |
|---|---|---|
| `shared` | Schema/types contract | Call network or platform APIs |
| `server` | Generate/modify/validate and persistence | Trust unvalidated model output |
| `app` | Render validated specs and dispatch actions | Execute arbitrary generated code |
| `docs` | Product and engineering documentation | Drift from actual implementation |
| `website` | Marketing site and entry points | Act as source of technical truth |

## Schema as Contract

The contract in `shared/src/schema.ts` is the primary interface between AI and runtime.

```mermaid
flowchart LR
    S["shared/src/schema.ts"]
    S -->|validates| Gen["Generation/Modify services"]
    S -->|types| Rend["Renderer components"]
    S -->|constrains| Prompt["Prompt contract"]
    S -->|documents| Docs["Docs + examples"]

    style S fill:#3d2e22,color:#ede5dc,stroke:#d4956a
```

## Extension model

When adding a new component or action:

1. Extend `shared` schema and TS types first.
2. Add renderer/dispatcher implementation in `app`.
3. Update generation prompts and validation expectations in `server`.
4. Add docs and examples for usage and safety implications.

This flow prevents partial rollouts and keeps the system deterministic.

## Production readiness notes

- Enforce strict schema validation for every generation and modification request.
- Keep endpoint and capability whitelists explicit and reviewed.
- Use environment-specific secrets and isolated Supabase projects.
- Maintain docs as release artifacts, not afterthoughts.
