---
sidebar_position: 3
title: Security Model
---

# Security Model

Baristapp is designed to reduce risk by construction: model output is treated as untrusted data and never executed as code.

## Threat model in one sentence

User prompts and LLM output may be malicious or malformed, so every step assumes adversarial input and enforces strict validation before runtime use.

## Core principle: declarative, not executable

```mermaid
flowchart LR
    Prompt["User prompt"] --> AI["LLM"]
    AI --> JSON["JSON spec"]
    JSON --> Val{"Schema validation"}
    Val -->|valid| Render["Renderer runtime"]
    Val -->|invalid| Reject["Reject"]

    Render -.-x Eval["eval / Function"]
    Render -.-x Scripts["Remote script injection"]
    Render -.-x Import["Dynamic code loading"]

    style Eval fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Scripts fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Import fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Render fill:#1f5134,color:#dff7e8,stroke:#7b9a6d
```

The runtime is a generic renderer that interprets JSON. It has no mechanism to execute arbitrary generated code:

- No `eval()` or `Function()` constructor
- No `<script>` tags or remote script loading
- No dynamic `import()` or `require()`
- No direct HTML injection in native UI rendering paths

## Security control layers

```mermaid
flowchart TD
    Input["Prompt + model output"] --> Layer1["1. Input constraints"]
    Layer1 --> Layer2["2. Schema validation"]
    Layer2 --> Layer3["3. Capability gating"]
    Layer3 --> Layer4["4. Endpoint/domain whitelists"]
    Layer4 --> Layer5["5. Auth + request scoping"]
    Layer5 --> Layer6["6. Client runtime guardrails"]
```

## Validation pipeline

Every generated or modified spec must parse cleanly against shared Zod schemas:

```mermaid
flowchart TD
    Raw["Raw model output"] --> Extract["Extract JSON payload"]
    Extract --> Parse["Zod parse + coercion rules"]
    Parse -->|"success"| Types["Typed MiniApp object"]
    Parse -->|"failure"| Error["Validation error"]
    Types --> Mount["Mount + Render"]
    Error --> Reject["Reject + return safe error"]

    style Parse fill:#3d2e22,color:#ede5dc,stroke:#d4956a
    style Error fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Types fill:#1f5134,color:#dff7e8,stroke:#7b9a6d
```

### What this blocks

- Unknown component/action types.
- Invalid prop shapes and malformed action payloads.
- Illegal enum/operator/capability values.
- Cross-version spec drift.

## Capability System

Capabilities are explicit and minimal. Apps request what they need, and user/device permissions are still enforced by native platforms.

| Capability | Permission Required | Auto-granted |
|-----------|-------------------|-------------|
| `localStorage` | No | Yes |
| `haptics` | No | Yes |
| `clipboard` | No | Yes |
| `camera` | Native dialog | No |
| `microphone` | Native dialog | No |
| `location` | Native dialog | No |
| `network` | No | Yes |
| `notifications` | Native dialog | No |
| `supabaseStorage` | No | Yes |

## Network and endpoint safety

Server-side proxying is restricted to approved domains. Endpoint execution is scoped and validated.

- Requests to non-whitelisted domains are denied.
- Per-app endpoints are namespaced to avoid cross-app access.
- Sensitive headers/secrets are not exposed to client-generated specs.

## Auth & Identity

```mermaid
flowchart TD
    Req["Incoming Request"] --> JWT{"Has Authorization<br/>Bearer token?"}
    JWT -->|Yes| Verify["Verify JWT<br/>(SUPABASE_JWT_SECRET)"]
    Verify -->|Valid| UserID["user_id = JWT sub"]
    Verify -->|Invalid| Reject["401 Unauthorized"]
    JWT -->|No| Device{"Has x-device-id<br/>header?"}
    Device -->|Yes| DeviceID["user_id = device:{id}"]
    Device -->|No| Reject2["401 Unauthorized"]

    style UserID fill:#1f5134,color:#dff7e8,stroke:#7b9a6d
    style DeviceID fill:#7a5d20,color:#fff7d6,stroke:#d4956a
    style Reject fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Reject2 fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
```

## Per-App Isolation

- Each mini-app has a unique `appId`
- Storage is namespaced: `app:{appId}:state`
- Server endpoints are scoped: `/api/apps/{appId}/endpoints/{endpointId}`
- Apps cannot access each other's state or endpoints

## WebView and embedded content

When WebView-style components are used, content must stay sandboxed with strict navigation and bridge validation.

### Sandbox controls

```mermaid
flowchart TD
    HTML["HTML Content"] --> WebView["Sandboxed WebView"]
    WebView --> Bridge{"Bridge Enabled?"}
    Bridge -->|Yes| Validate["Validate Message Type"]
    Bridge -->|No| Block["No Communication"]
    Validate -->|Valid| Process["Process Action"]
    Validate -->|Invalid| Reject["Reject Message"]
    
    WebView -.-x Nav["External Navigation"]
    WebView -.-x File["File System"]
    WebView -.-x Native["Native APIs"]
    
    style WebView fill:#3d2e22,color:#ede5dc,stroke:#d4956a
    style Block fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Reject fill:#6b1f1f,color:#fde8e8,stroke:#d4956a
    style Process fill:#1f5134,color:#dff7e8,stroke:#7b9a6d
```

**Navigation restrictions**
- All external URLs are blocked (`onShouldStartLoadWithRequest` returns `false`)
- Only inline HTML (`data:` URIs) and `about:blank` are allowed
- No redirects to external domains

**File access**
- `allowFileAccess={false}` — No local file system access
- `allowFileAccessFromFileURLs={false}` — No file:// URL access
- `allowUniversalAccessFromFileURLs={false}` — No cross-origin file access

**Bridge API**
- Only whitelisted message types: `setState`, `dispatch`, `message`, `bridgeReady`
- All bridge messages are validated before processing
- State updates are limited to declared `stateKeys` (if provided)
- Actions dispatched from WebView must match the schema (validated by renderer)

## Security operations checklist

- Enforce schema validation on all generation/modify endpoints.
- Keep capability and domain whitelists reviewed and versioned.
- Rotate secrets and isolate environments (dev/staging/prod).
- Log rejects/validation failures for anomaly detection.
- Run dependency and container/runtime scans before each release.
