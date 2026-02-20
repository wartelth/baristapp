---
sidebar_position: 2
title: Actions
---

# Action Reference

Actions are declarative objects that describe what happens in response to user interactions. The renderer's `dispatch` function processes them. SwissKnife v2 supports **15 action types**.

## Action Flow

```mermaid
flowchart TD
    Trigger["User Interaction<br/>(button press, input change)"]
    Trigger --> Dispatch["dispatch(action)"]

    Dispatch --> Cat{"Category?"}

    Cat -->|State| State["setState / append / remove / compute / transform / setMultiple"]
    Cat -->|Async| Async["http / serverCall"]
    Cat -->|Navigation| Nav["navigate"]
    Cat -->|Side Effect| Side["haptic / copyToClipboard / timer"]
    Cat -->|Control Flow| Control["conditional / batch"]

    State --> Persist["Update state → persist"]
    Async --> Fetch["Fetch → setState on result"]
    Nav --> Screen["Change screen"]
    Side --> Native["Native API call"]
    Control --> Dispatch

    style Dispatch fill:#4f46e5,color:#fff,stroke:none
    style Persist fill:#16a34a,color:#fff,stroke:none
```

---

## State Actions

### `setState`

Set a single state key to a value.

```json
{
  "type": "setState",
  "key": "count",
  "value": 0
}
```

| Property | Type | Description |
|----------|------|-------------|
| `key` | string | State key to set |
| `value` | any | Value to assign (can use `"{{stateKey}}"` for dynamic values) |

### `append`

Add an item to an array in state.

```json
{
  "type": "append",
  "target": "todos",
  "value": { "text": "New item", "done": false }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | string | State key of the array |
| `value` | any | Item to append |

### `remove`

Remove an item from an array by index.

```json
{
  "type": "remove",
  "target": "todos",
  "index": 0
}
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | string | State key of the array |
| `index` | number | Index to remove (supports `"{{stateKey}}"`) |

### `compute`

Perform math/string/array operations on state. Supports **40+ operations** across multiple categories.

```json
{
  "type": "compute",
  "operation": "increment",
  "key": "count",
  "operands": [1]
}
```

**Operations:**

**Arithmetic:** `add`, `subtract`, `multiply`, `divide`, `modulo`, `increment`, `decrement`, `round`, `ceil`, `floor`, `abs`, `random`, `pow`, `sqrt`, `min`, `max`, `clamp`

**String:** `concat`, `toUpperCase`, `toLowerCase`, `trim`, `replace`, `split`, `join`, `padStart`, `padEnd`, `substring`, `capitalize`

**Array:** `length`, `push`, `pop`, `shift`, `unshift`, `reverse`, `sort`, `unique`, `flatten`, `sum`, `avg`, `pluck`

**Boolean:** `toggle`

**Date/Time:** `now`, `formatDate`, `dateDiff`

**Type Conversion:** `toNumber`, `toString`, `toBoolean`

**JSON:** `jsonParse`, `jsonStringify`

### `transform`

Evaluate an expression using the expression engine and store the result. Supports path access, array/string methods, math, comparisons, ternary operators, and pipes.

```json
{
  "type": "transform",
  "expression": "items.filter('done').length",
  "resultKey": "completedCount"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `expression` | string | Expression to evaluate (supports `{{path}}` syntax) |
| `resultKey` | string | State key to store the result |

**Expression Features:**
- Path access: `{{user.profile.name}}`, `{{items[0].title}}`
- Array methods: `.filter()`, `.map()`, `.sort()`, `.reduce()`, `.find()`, `.some()`, `.every()`, `.count()`
- String methods: `.toUpperCase()`, `.toLowerCase()`, `.trim()`, `.slice()`, `.includes()`, `.replace()`, `.split()`
- Math: `+`, `-`, `*`, `/`, `%`, comparisons, ternary
- Pipes: `| toFixed(2)`, `| uppercase`, `| date`, `| timeAgo`, `| sum("key")`, etc.
- Safe built-ins: Math, JSON, Date, Array, String, Number, Object (whitelisted methods only)

### `setMultiple`

Set multiple state keys at once. Useful for initializing multiple values or updating related state.

```json
{
  "type": "setMultiple",
  "values": {
    "name": "{{firstName}} {{lastName}}",
    "count": 0,
    "isActive": true
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `values` | object | Map of state keys to values (supports `{{expression}}` syntax) |

---

## Async Actions

### `http`

Make an HTTP request and store the result.

```json
{
  "type": "http",
  "url": "https://api.example.com/data",
  "method": "GET",
  "resultKey": "apiData",
  "loadingKey": "isLoading",
  "errorKey": "apiError"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Request URL |
| `method` | `"GET"` \| `"POST"` \| `"PUT"` \| `"DELETE"` | HTTP method |
| `body` | object | Request body (POST/PUT) |
| `headers` | object | Request headers |
| `resultKey` | string | State key for response data |
| `loadingKey` | string | State key for loading boolean |
| `errorKey` | string | State key for error message |

### `serverCall`

Call an app-specific server endpoint.

```json
{
  "type": "serverCall",
  "endpointId": "classify-image",
  "body": { "image": "{{photo}}" },
  "resultKey": "classification",
  "loadingKey": "classifying",
  "errorKey": "classifyError"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `endpointId` | string | ID matching a `serverEndpoints` entry |
| `body` | object | Data to send |
| `resultKey` | string | State key for result |
| `loadingKey` | string | Loading indicator key |
| `errorKey` | string | Error message key |

---

## Navigation

### `navigate`

Switch to a different screen.

```json
{
  "type": "navigate",
  "screen": "details"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `screen` | string | Target screen ID |

---

## Side Effects

### `haptic`

Trigger device vibration feedback.

```json
{ "type": "haptic", "style": "medium" }
```

| Property | Type | Description |
|----------|------|-------------|
| `style` | `"light"` \| `"medium"` \| `"heavy"` | Vibration intensity |

### `copyToClipboard`

Copy text to the device clipboard.

```json
{
  "type": "copyToClipboard",
  "text": "{{shareUrl}}"
}
```

| Property | Type | Description |
|----------|------|-------------|
| `text` | string | Text to copy (supports `"{{stateKey}}"`) |

### `timer`

Start, stop, or reset an interval timer.

```json
{
  "type": "timer",
  "timerId": "pomodoro",
  "command": "start",
  "intervalMs": 1000,
  "tickAction": {
    "type": "compute",
    "operation": "decrement",
    "target": "secondsLeft",
    "by": 1
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `timerId` | string | Unique timer identifier |
| `command` | `"start"` \| `"stop"` \| `"reset"` | Timer control |
| `intervalMs` | number | Tick interval in ms |
| `tickAction` | Action | Action to dispatch each tick |

---

## Control Flow

### `conditional`

Branch on state value — dispatch different actions.

```json
{
  "type": "conditional",
  "stateKey": "isRunning",
  "operator": "eq",
  "value": true,
  "then": { "type": "timer", "timerId": "t1", "command": "stop" },
  "else": { "type": "timer", "timerId": "t1", "command": "start", "intervalMs": 1000 }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `stateKey` | string | State key to evaluate |
| `operator` | `"eq"` \| `"neq"` \| `"gt"` \| `"lt"` \| `"truthy"` \| `"falsy"` | Comparison |
| `value` | any | Value to compare against |
| `then` | Action | Action if condition is true |
| `else` | Action | Action if condition is false |

### `batch`

Execute multiple actions. Sync actions are merged into a single state update.

```json
{
  "type": "batch",
  "actions": [
    { "type": "setState", "key": "submitted", "value": true },
    { "type": "append", "target": "history", "value": "entry" },
    { "type": "haptic", "style": "light" },
    { "type": "navigate", "screen": "results" }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `actions` | Action[] | List of actions to execute |

:::warning Batch Optimization
The renderer collects all sync actions (`setState`, `append`, `remove`, `compute`) and applies them in **one `setState` call** to prevent race conditions. Async and side-effect actions are dispatched after with `setTimeout(0)`.
:::

### `submit`

Submit form data to a target key (collects multiple input values).

```json
{
  "type": "submit",
  "target": "formData",
  "fields": ["name", "email", "message"]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `target` | string | State key to store collected form data |
| `fields` | string[] | State keys to collect |
