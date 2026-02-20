---
sidebar_position: 4
title: Capabilities
---

# Capabilities

Capabilities are the permission model for mini-apps. Each app declares what native features it needs, and the system requests appropriate permissions from the user.

## Available Capabilities

```mermaid
flowchart TD
    subgraph Auto["Auto-granted (no prompt)"]
        LS["localStorage"]
        HP["haptics"]
        CB["clipboard"]
        NW["network"]
        SS["supabaseStorage"]
    end

    subgraph Permission["Requires Native Permission"]
        CAM["camera"]
        MIC["microphone"]
        LOC["location"]
        NOT["notifications"]
    end

    style Auto fill:#16a34a,color:#fff,stroke:none
    style Permission fill:#eab308,color:#000,stroke:none
```

| Capability | Auto-granted | Native Dialog | Used By |
|-----------|-------------|---------------|---------|
| `localStorage` | Yes | No | State persistence |
| `haptics` | Yes | No | Vibration feedback |
| `clipboard` | Yes | No | Copy/paste |
| `network` | Yes | No | HTTP requests |
| `supabaseStorage` | Yes | No | Cloud sync |
| `camera` | No | Yes | `cameraView` component |
| `microphone` | No | Yes | `audioRecorder` component |
| `location` | No | Yes | `mapView` component |
| `notifications` | No | Yes | Push notifications |

## How It Works

### Declaration

Capabilities are declared in the mini-app spec:

```json
{
  "appId": "bird-classifier",
  "name": "Bird Classifier",
  "capabilities": ["camera", "localStorage", "network"],
  "screens": [...]
}
```

### Request Flow

```mermaid
sequenceDiagram
    participant Gen as GenerationContext
    participant Cap as CapabilityManager
    participant OS as Native OS

    Gen->>Cap: requestAllCapabilities(appId, caps)

    loop For each capability
        Cap->>Cap: Check if auto-granted
        alt Auto-granted
            Cap->>Cap: Grant immediately
        else Requires permission
            Cap->>OS: Show native dialog
            OS-->>Cap: User response
            Cap->>Cap: Cache result
        end
    end
```

### Persistence

Permission results are cached per-app in AsyncStorage:

```
Key: perm:{appId}:{capability}
Value: "granted" | "denied"
```

The in-memory cache provides synchronous access after initial load.

## Usage in Components

Components that require capabilities:

| Component | Required Capability |
|-----------|-------------------|
| `cameraView` | `camera` |
| `audioRecorder` | `microphone` |
| `mapView` (user location) | `location` |

Actions that require capabilities:

| Action | Required Capability |
|--------|-------------------|
| `http` | `network` |
| `serverCall` | `network` |
| `haptic` | `haptics` |
| `copyToClipboard` | `clipboard` |
