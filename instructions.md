## **Giga-MVP Builder Prompt**

### ROLE

You are a senior mobile architect and security engineer.

Design and implement a **minimal, App Store–compliant React Native application** that allows a user to:

1. Enter a natural language request for a “mini-app”.
2. Send the request to Claude (server-side).
3. Receive a strictly validated JSON UI specification.
4. Render that UI inside the host app using predefined components.
5. Persist mini-app state locally in a unified storage layer.

This is **not** an app marketplace.
This is **not** dynamic native code execution.
This is **not** a JavaScript bundle downloader.

The system must avoid executing arbitrary generated code.

---

### HARD CONSTRAINTS

- No dynamic JS bundle loading.
- No eval().
- No runtime npm installs.
- No native module loading.
- No user-supplied executable code.
- UI must be rendered from a declarative JSON schema.
- All device capabilities must be explicitly whitelisted.

Generated output must be:

- JSON only.
- Conforming to a strict schema.
- No functions.
- No inline scripts.
- No remote script URLs.

---

### ARCHITECTURE REQUIREMENTS

Build a React Native app (Expo-managed workflow allowed) with:

#### 1. Host Shell

- Landing screen
- “Create Mini App” button
- List of previously generated mini-apps
- Navigation to individual mini-app runtime

#### 2. Claude Integration

- Backend endpoint (Node or similar) that:
  - Sends user prompt to Claude
  - Enforces system prompt instructing Claude to output ONLY valid JSON schema
  - Validates JSON against schema
  - Rejects invalid structures

Do NOT call Claude directly from the device.

#### 3. Mini-App Schema

Define a strict JSON schema like:

```
{
  "appId": "string",
  "title": "string",
  "version": 1,
  "screens": [
    {
      "id": "string",
      "components": [
        {
          "type": "text" | "button" | "input" | "image" | "list",
          "props": { ... }
        }
      ]
    }
  ],
  "dataModel": {
    "entities": [...]
  }
}
```

No executable fields.
No arbitrary expressions.
No inline logic.

#### 4. Renderer

Create a MiniAppRenderer component that:

- Switches over component.type
- Maps to predefined React Native components
- Ignores unknown types
- Sandboxes state inside scoped storage
- Blocks any network calls unless explicitly routed through host API

#### 5. Unified Storage Layer

- Single SQLite or MMKV store
- Namespace per mini-app
- Data stored as JSON blobs
- Host controls read/write access

Mini-app cannot define custom queries.

---

### SECURITY MODEL

- Capability-based API
- Mini-app declares required capabilities:
  - "camera"
  - "localStorage"
  - "network"

- Host prompts user for approval
- Host mediates access

No direct device API exposure.

---

### MVP SCOPE

Supported components only:

- Text
- Button
- TextInput
- FlatList
- Image (remote URL allowed only via host proxy)
- Simple form submission
- Local persistence

No:

- Background tasks
- Push notifications
- Arbitrary timers
- External SDKs
- Third-party scripts

---

### USER FLOW

1. User types:
   “Create a bird classifier using camera input and local history.”

2. Backend sends structured system prompt:
   - You are generating a UI schema.
   - Output JSON only.
   - Must conform to provided schema.
   - No functions.
   - No executable code.
   - No network endpoints unless declared in capability.

3. Validate JSON.

4. Save mini-app spec.

5. Render via MiniAppRenderer.

---

### DELIVERABLES

Claude must generate:

1. React Native host app structure
2. JSON schema definition
3. MiniAppRenderer implementation
4. Example Claude system prompt
5. Backend validation logic (AJV or Zod)
6. Storage abstraction layer
7. Capability permission middleware

All code must be production-structured and modular.

---

### SUCCESS CRITERIA

The resulting app must:

- Pass static inspection (no dynamic execution)
- Be conceptually compliant with App Store 4.2
- Demonstrate generation → validation → rendering pipeline
- Never execute model-generated JavaScript

---

### CORE PRINCIPLE

Generated content is **data**, not code.

If any part of the system evaluates model output as executable logic, the design is invalid.

---

This is the smallest viable version of:

A secure, declarative, AI-generated micro-app container.

Nothing more.
