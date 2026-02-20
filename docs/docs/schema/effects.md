---
sidebar_position: 3
title: Effects
---

# Effects System

Effects are lifecycle hooks that run actions automatically — on mount, on interval, or when state changes. They are defined per-screen in the `effects` property.

## Effect Types

```mermaid
flowchart LR
    subgraph Effects["Screen Effects"]
        Mount["onMount"]
        Interval["onInterval"]
        Change["onStateChange"]
    end

    Mount -->|"screen loads"| Action1["dispatch(action)"]
    Interval -->|"every N ms"| Action2["dispatch(action)"]
    Change -->|"stateKey changes"| Action3["dispatch(action)"]

    style Effects fill:#1e1b4b,color:#e0e7ff,stroke:#4f46e5
    style Action1 fill:#4f46e5,color:#fff,stroke:none
    style Action2 fill:#4f46e5,color:#fff,stroke:none
    style Action3 fill:#4f46e5,color:#fff,stroke:none
```

## `onMount`

Runs an action once when the screen first renders.

```json
{
  "effects": {
    "onMount": {
      "type": "http",
      "url": "https://api.example.com/init",
      "method": "GET",
      "resultKey": "initialData",
      "loadingKey": "loading"
    }
  }
}
```

**Common uses:**
- Fetch initial data from an API
- Set default state values
- Start a timer

## `onInterval`

Runs an action on a repeating interval.

```json
{
  "effects": {
    "onInterval": {
      "intervalMs": 1000,
      "action": {
        "type": "compute",
        "operation": "decrement",
        "target": "timeLeft",
        "by": 1
      }
    }
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `intervalMs` | number | Milliseconds between each tick |
| `action` | Action | Action to dispatch each interval |

**Common uses:**
- Countdown timers
- Polling for updates
- Auto-refresh data

:::tip Cleanup
The renderer automatically clears intervals when the screen unmounts or the component is destroyed. No manual cleanup needed.
:::

## `onStateChange`

Runs an action whenever a specific state key changes value.

```json
{
  "effects": {
    "onStateChange": {
      "stateKey": "selectedCategory",
      "action": {
        "type": "http",
        "url": "https://api.example.com/items?cat={{selectedCategory}}",
        "method": "GET",
        "resultKey": "items",
        "loadingKey": "loadingItems"
      }
    }
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `stateKey` | string | State key to watch |
| `action` | Action | Action to dispatch on change |

:::warning Loop Protection
The renderer tracks the last dispatched value to prevent infinite loops. If `onStateChange` triggers a `setState` on the same key, the effect won't re-fire.
:::

## Full Example

A screen that loads data on mount, refreshes every 30 seconds, and re-filters when a category changes:

```json
{
  "id": "dashboard",
  "title": "Dashboard",
  "components": [...],
  "effects": {
    "onMount": {
      "type": "http",
      "url": "https://api.example.com/stats",
      "method": "GET",
      "resultKey": "stats",
      "loadingKey": "loading"
    },
    "onInterval": {
      "intervalMs": 30000,
      "action": {
        "type": "http",
        "url": "https://api.example.com/stats",
        "method": "GET",
        "resultKey": "stats"
      }
    },
    "onStateChange": {
      "stateKey": "filter",
      "action": {
        "type": "http",
        "url": "https://api.example.com/stats?filter={{filter}}",
        "method": "GET",
        "resultKey": "stats",
        "loadingKey": "filtering"
      }
    }
  }
}
```

## Effects Lifecycle

```mermaid
sequenceDiagram
    participant Screen
    participant Renderer
    participant State

    Screen->>Renderer: Mount
    Renderer->>Renderer: Run onMount action
    Renderer->>Renderer: Start onInterval timer

    loop Every intervalMs
        Renderer->>Renderer: dispatch(onInterval.action)
    end

    State->>Renderer: stateKey changed
    Renderer->>Renderer: Check loop protection
    alt Value is new
        Renderer->>Renderer: dispatch(onStateChange.action)
    end

    Screen->>Renderer: Unmount
    Renderer->>Renderer: Clear interval timer
```
