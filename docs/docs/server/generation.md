---
sidebar_position: 2
title: AI Generation
---

# AI Generation

The server uses three Claude-powered services for different stages of the pipeline.

## Service Overview

```mermaid
flowchart LR
    subgraph Clarify["Clarify Service"]
        H["Claude Haiku"]
    end

    subgraph Generate["Generation Service"]
        S["Claude Sonnet 4.5"]
        O["Claude Opus 4.6"]
    end

    subgraph Modify["Modify Service"]
        SM["Claude Sonnet 4.5"]
    end

    Prompt["User Prompt"] --> Clarify
    Clarify -->|"questions + answers"| Generate
    Generate -->|"JSON spec"| Validate["Zod Validation"]

    Spec["Existing Spec"] --> Modify
    Modify -->|"modified spec"| Validate

    style Clarify fill:#16a34a,color:#fff,stroke:none
    style Generate fill:#4f46e5,color:#fff,stroke:none
    style Modify fill:#7c3aed,color:#fff,stroke:none
```

## Clarify Service

**File:** `server/src/services/clarifyService.ts`

Uses Claude Haiku (fast, cheap) to generate 3 clarification questions before generation.

- **Model:** Claude Haiku
- **Output:** JSON with `summary` + `questions[]` (single/multiple/freeform)
- **Prompt:** Aware of SwissKnife capabilities, matches user's language

```json
{
  "summary": "A workout tracker with exercise logging",
  "questions": [
    {
      "type": "single",
      "question": "What kind of exercises?",
      "options": ["Weightlifting", "Cardio", "Both"]
    }
  ]
}
```

## Generation Service

**File:** `server/src/services/claudeService.ts`

The core generation engine. Uses Claude Agent SDK with structured JSON output.

### Model Selection

```mermaid
flowchart TD
    P["Incoming Prompt"] --> Analyze{"Complexity Analysis"}

    Analyze -->|"Keywords detected"| Complex["Complex"]
    Analyze -->|"Length > 500 chars"| Complex
    Analyze -->|"Otherwise"| Simple["Simple"]

    Complex --> Opus["Claude Opus 4.6<br/>Budget: $2.00<br/>Max turns: 6"]
    Simple --> Sonnet["Claude Sonnet 4.5<br/>Budget: $0.50<br/>Max turns: 3"]

    style Opus fill:#7c3aed,color:#fff,stroke:none
    style Sonnet fill:#4f46e5,color:#fff,stroke:none
```

**Complexity keywords:** camera, photo, ML, classify, chart, graph, map, location, audio, record, timer, interval, api, fetch, HuggingFace

### Generation Pipeline

```mermaid
sequenceDiagram
    participant Route as generate.ts
    participant Service as claudeService
    participant Agent as Claude Agent SDK
    participant Val as Validator
    participant Sub as SubserverManager
    participant Session as SessionStore

    Route->>Service: generateMiniApp(prompt, clarifications)
    Service->>Service: Analyze complexity → pick model
    Service->>Agent: Create agent (system prompt + JSON schema)

    loop Up to maxTurns
        Agent->>Agent: Generate response
    end

    Agent-->>Service: Raw output
    Service->>Val: validateMiniApp(output)

    alt Valid
        Val-->>Service: Typed MiniApp
        Service->>Sub: mountAppEndpoints(spec)
        Service->>Session: saveSession(appId, prompt, spec)
        Service-->>Route: { success: true, miniApp }
    else Invalid
        Val-->>Service: Validation errors
        Service-->>Route: { success: false, error }
    end
```

### System Prompt

**File:** `server/src/prompts/masterPrompt.ts` (570 lines)

The master prompt documents:
- All 21 component types with property details
- All 15 action types with usage patterns
- Theme system
- Effects system
- Server endpoints
- 4 complete example apps (counter, workout tracker, bird identifier, pomodoro)

Ends with the critical instruction: **"Output ONLY valid JSON. No markdown, no explanations."**

### Structured Output

The service uses Claude's JSON schema output mode:

```typescript
outputFormat: {
  type: "json_schema",
  schema: miniAppJsonSchema  // From validation/jsonSchema.ts
}
```

If structured output fails, the service falls back to `extractJSON()` which strips markdown fences and parses raw text.

## Modify Service

**File:** `server/src/services/modifyService.ts`

Modifies an existing spec based on a user prompt. The current spec is embedded in the system prompt.

- **Model:** Claude Sonnet 4.5
- **Budget:** $1.50, max 3 turns
- **Key behavior:** Preserves `appId` (forced back if Claude changes it)
- **Prompt:** Built dynamically from `modifyPrompt.ts` with the current spec JSON

## Validation

**File:** `server/src/validation/schemaValidator.ts`

Two-stage validation:

1. **`extractJSON(text)`** — Strip markdown fences, find JSON boundaries, parse
2. **`validateMiniApp(raw)`** — Parse with Zod `MiniAppSchema`, return typed result or detailed errors

The Zod schema catches:
- Unknown component types
- Missing required fields
- Invalid enum values
- Malformed action objects
- Incorrect nesting
