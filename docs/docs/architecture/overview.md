---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

SwissKnife is a three-package monorepo where a **shared schema** connects an **Express server** (AI generation) to a **React Native app** (rendering engine).

## System Architecture

```mermaid
graph TB
    subgraph Client["📱 App (React Native / Expo)"]
        UI["Screens & Navigation"]
        Renderer["MiniAppRenderer"]
        Storage["Storage Layer"]
        Caps["Capability Manager"]
    end

    subgraph Server["⚙️ Server (Express)"]
        API["REST API"]
        Gen["Claude Generation"]
        Mod["Modify Service"]
        Clar["Clarify Service"]
        Sub["Subserver Manager"]
        Val["Schema Validator"]
    end

    subgraph Shared["📦 Shared"]
        Schema["Zod Schemas"]
        Types["TypeScript Types"]
    end

    subgraph External["☁️ External Services"]
        Claude["Claude API"]
        Supa["Supabase"]
        HF["HuggingFace"]
    end

    UI --> Renderer
    Renderer --> Storage
    Renderer --> Caps
    UI -->|HTTP| API

    API --> Gen
    API --> Mod
    API --> Clar
    API --> Sub
    Gen --> Val
    Mod --> Val

    Gen --> Claude
    Mod --> Claude
    Clar --> Claude
    Sub --> HF
    API --> Supa
    Storage -->|Cloud Sync| API

    Val --> Schema
    Gen --> Schema
    Renderer --> Schema
    Schema --> Types

    style Client fill:#1e1b4b,color:#e0e7ff,stroke:#4f46e5
    style Server fill:#1e1b4b,color:#e0e7ff,stroke:#4f46e5
    style Shared fill:#312e81,color:#e0e7ff,stroke:#6366f1
    style External fill:#0f172a,color:#e0e7ff,stroke:#334155
```

## Package Dependencies

```mermaid
graph LR
    App["app/"] -->|imports| Shared["shared/"]
    Server["server/"] -->|imports| Shared
    App -->|HTTP calls| Server

    style App fill:#4f46e5,color:#fff,stroke:none
    style Server fill:#6366f1,color:#fff,stroke:none
    style Shared fill:#818cf8,color:#fff,stroke:none
```

- **shared** has zero internal dependencies — it's pure Zod schemas and types
- **server** imports shared for validation and type checking
- **app** imports shared for types; communicates with server via HTTP

## Schema as Contract

The core design principle: **the Zod schema is the single source of truth**.

```mermaid
flowchart LR
    S["shared/src/schema.ts"]
    S -->|validates output| Gen["Server Generation"]
    S -->|types props| Rend["App Renderers"]
    S -->|constrains| Prompt["System Prompt"]
    S -->|defines| API["API Contracts"]

    style S fill:#4f46e5,color:#fff,stroke:none
```

When Claude generates a mini-app spec, the server validates it against the Zod schema. The app renders only components and actions defined in that same schema. This means:

1. **Claude can't invent new component types** — they'd fail validation
2. **The app can't receive unknown shapes** — TypeScript enforces the schema
3. **Adding a new feature** requires updating the schema first, then server + app

## Schema Versions

| Version | Components | Actions | Features |
|---------|-----------|---------|----------|
| **v1** | 5 basic | 4 basic | Screens, simple state |
| **v2** | 20 total | 13 total | Theme, effects, server endpoints, capabilities |

The unified `MiniAppSchema` is a union of both versions for backward compatibility.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | React Native + Expo 54 | Cross-platform renderer |
| Navigation | React Navigation v7 | Screen routing |
| State | React useState + refs | Per-app state management |
| Local Storage | AsyncStorage | Persistent key-value store |
| Server | Express.js | REST API + middleware |
| AI | Claude API (Sonnet/Opus) | Spec generation & modification |
| Cloud | Supabase | Auth, database, storage |
| Schema | Zod | Runtime validation |
| Types | TypeScript | Static analysis |
