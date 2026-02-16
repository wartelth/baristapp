# Service Integrations Research — SwissKnife

> Research date: 2026-02-16
> Question: Should SwissKnife mini-apps be able to link with external services (Strava, WhatsApp, Spotify, etc.)?

---

## 0. What We Already Have (Codebase Audit)

Before looking outward, here's what already exists in our codebase:

| Feature | File | What it does |
|---------|------|-------------|
| **`HttpAction`** | `shared/src/schema.ts` | Declarative HTTP calls with `{{stateKey}}` URL interpolation, custom headers, result/loading/error keys |
| **`ServerCallAction`** | `shared/src/schema.ts` | Calls server-side endpoints (appId-scoped) |
| **`ServerEndpoint`** | `shared/src/schema.ts` | Server-side processing with types `huggingface`, `transform`, `proxy` |
| **Proxy handler** | `server/src/subservers/proxyHandler.ts` | Domain-whitelisted outbound proxy. Currently allows: `api-inference.huggingface.co`, `api.openweathermap.org`, `jsonplaceholder.typicode.com`, `pokeapi.co`, `api.github.com` |
| **Effects** | `shared/src/schema.ts` | `onMount`, `onInterval`, `onStateChange` triggers |
| **Capabilities** | `app/src/capabilities/capabilityManager.ts` | Permission model (camera, network, localStorage, etc.) — 9 capabilities |
| **SubServerManager** | `server/src/services/subServerManager.ts` | Dynamically mounts Express sub-routers per app |

**Key insight**: The `HttpAction` + `ServerEndpoint` proxy pattern is already 70% of what we need for service integrations. The missing pieces are OAuth token management and a connector abstraction.

---

## 1. OpenClaw — What It Is & What We Can Learn

[OpenClaw](https://openclaw.ai/) (formerly Moltbot/Clawdbot) is an **open-source AI agent gateway** (MIT license, Node.js/TypeScript) created by Peter Steinberger. It connects LLMs to 50+ services across messaging, productivity, smart home, and more.

### Architecture
- Runs locally on your machine (local-first, SQLite storage)
- WebSocket-based Gateway on `localhost:18789`
- Supports **Anthropic Claude, OpenAI, Google Gemini, and local LLMs** as backends

### Integration Model — Three Extension Types
| Type | What it does | How it works |
|------|-------------|--------------|
| **Skills** | Natural-language API integrations | `SKILL.md` files with YAML frontmatter — the agent reads the instructions and calls the API. Stored in `~/.openclaw/workspace/skills/<name>/SKILL.md` |
| **Plugins** | Deep runtime extensions | TypeScript/JS modules that run inside the Gateway process with access to internal APIs |
| **Webhooks** | Inbound HTTP triggers | External services POST JSON payloads to wake the agent or trigger actions |

### Supported Services (highlights)
- **Chat**: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, Matrix (14 platforms)
- **Productivity**: Notion, Obsidian, GitHub, Trello, Apple Notes/Reminders, Things 3
- **Music**: Spotify, Sonos, Shazam
- **Smart Home**: Philips Hue, Home Assistant, 8Sleep
- **Tools**: Gmail, Browser control, 1Password, Weather, Cron

### Relevance to SwissKnife
OpenClaw's **Skills** concept — a markdown file that declaratively describes how to call an API — is remarkably close to what we'd need. The key difference: OpenClaw's agent autonomously decides when to call a skill. SwissKnife would need a **declarative trigger** in the JSON spec (e.g. `onMount: fetchStravaActivities`).

**ClawHub** (their skill registry) is also interesting — a curated marketplace of community-built integrations. We could adopt a similar model for SwissKnife connectors.

Sources:
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Integrations](https://openclaw.ai/integrations)
- [DigitalOcean — What is OpenClaw?](https://www.digitalocean.com/resources/articles/what-is-openclaw)
- [Milvus — Complete Guide to OpenClaw](https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md)

---

## 2. Other Platforms — How They Handle Service Linking

### Automation Platforms

| Platform | Open Source? | Integration Count | Key Pattern |
|----------|-------------|-------------------|-------------|
| [Zapier](https://zapier.com) | No | 6,000+ | Trigger → Action "Zaps". Each app = auth + triggers + actions. |
| [Make](https://www.make.com) | No | 1,500+ | Visual "Scenarios" with branching/looping. Modules = auth + API calls. |
| [n8n](https://github.com/n8n-io/n8n) | Yes (fair-code) | 400+ | TypeScript nodes implementing `INodeType`. Self-hostable. 40k+ GitHub stars. |
| [Pipedream](https://github.com/PipedreamHQ/pipedream) | Yes (components) | 2,000+ | Real Node.js/Python code per step. Manages OAuth for you. |
| [Activepieces](https://github.com/activepieces/activepieces) | Yes (MIT) | 200+ | Visual builder, pieces = TypeScript. Growing fast. |

### Low-Code App Builders

| Platform | Open Source? | Data Source Pattern |
|----------|-------------|---------------------|
| [Retool](https://retool.com) | No | **Resources** (connection config) + **Queries** (API calls referencing a resource). OAuth2 handled by platform. |
| [Appsmith](https://github.com/appsmithorg/appsmith) | Yes | **Datasources** (URL + auth) + **Queries** (REST/GraphQL calls). UI widgets bind to query results. 30k+ stars. |

### Key Architectural Pattern (universal across all platforms)
```
1. Service Definition  → name, baseURL, auth type
2. Auth Abstraction    → platform handles OAuth flows + token storage + refresh
3. Action Declaration  → structured inputs, API call template, structured outputs
4. Declarative Config  → JSON/YAML defines WHAT to call; platform executes it
```

This maps directly to our Zod schema approach.

---

## 3. OAuth / API Specifics for Key Services

### Strava API
- **Auth**: OAuth 2.0 Authorization Code flow — **NO PKCE support** (client_secret required)
- **Scopes**: `activity:read`, `activity:read_all`, `activity:write`, `profile:read_all`
- **Tokens**: Access tokens expire every 6 hours, refresh tokens are long-lived
- **Rate limits**: 200 requests/15 min, 2,000/day (per application, all users combined)
- **Gotcha 1**: New apps start in "Single Player Mode" (1 athlete). Need to submit a Developer Program form to expand.
- **Gotcha 2**: No PKCE means **token exchange MUST happen server-side** (client secret can never be on the device). This reinforces the server-proxy architecture.
- **Expo support**: `expo-auth-session` handles the authorization redirect, but the code→token exchange must go through our Express server.
- **Webhook subscriptions**: Strava supports webhooks for activity create/update/delete — useful for real-time updates without polling.
- Sources: [Strava Auth Docs](https://developers.strava.com/docs/authentication/), [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/)

### Spotify API
- **Auth**: OAuth 2.0 with PKCE (recommended for mobile — no client secret needed)
- **Scopes**: Granular (`user-read-playback-state`, `playlist-modify-public`, etc.)
- **Tokens**: Access tokens expire in 1 hour
- **Expo support**: `expo-auth-session` works with Spotify, though there have been [PKCE-related issues](https://community.spotify.com/t5/Spotify-for-Developers/Problem-with-Spotify-OAuth-2-0-PKCE-in-React-Native-Expo-INVALID/td-p/6855696). Also [`@wwdrew/expo-spotify-sdk`](https://www.npmjs.com/package/@wwdrew/expo-spotify-sdk) exists.
- Sources: [Expo Auth Guide](https://docs.expo.dev/guides/authentication/), [Spotify PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)

### WhatsApp
- **No personal API exists.** The Cloud API is business-only (requires Meta Business verification).
- **What IS possible**: Deep-link sharing via `whatsapp://send?text=...` or `https://wa.me/<number>?text=...` — this works for share-to-WhatsApp.
- **Rate limits** (business): 80 msgs/sec, 1 msg per 6 sec per user, 1,000 free conversations/month.
- **Bottom line**: Full WhatsApp integration is not viable for a consumer app. Simple sharing via deep links is easy.
- Sources: [WhatsApp Cloud API Guide](https://www.unipile.com/whatsapp-api-a-complete-guide-to-integration/), [WhatsApp Rate Limits](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-rate-limits/)

### Google APIs (Calendar, Fitness, Drive)
- **Auth**: OAuth 2.0 via Google Identity Services. Native SDKs for mobile.
- **Expo support**: `@react-native-google-signin/google-signin` (Expo config plugin). Also `expo-auth-session` works.
- Scopes are per-API (e.g. `calendar.readonly`, `fitness.activity.read`).

---

## 4. Feasibility Assessment for SwissKnife

### The Core Challenge

SwissKnife is **declarative JSON → rendered UI**. There is no code execution. So how do you express "fetch my Strava activities" in a JSON spec?

### Proposed Architecture: Connector System

```
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Mini-App (JSON)    │     │   Express Server     │     │  External   │
│                      │     │   (proxy layer)      │     │  Service    │
│ dataSources: [{      │────▶│                      │────▶│             │
│   id: "strava",      │     │ /api/proxy/:service  │     │ Strava API  │
│   connector: "strava"│     │ - looks up user token│     │ Spotify API │
│   action: "activities│     │ - makes authed call  │     │ Google API  │
│   params: {limit: 10}│     │ - returns data       │     │ etc.        │
│ }]                   │     │                      │     │             │
│                      │     │ /api/auth/:service   │     │             │
│ layout: [{           │     │ - handles OAuth flow │     │             │
│   type: "list",      │     │ - stores tokens      │     │             │
│   dataSource: "strava│     │                      │     │             │
│ }]                   │     │                      │     │             │
└──────────────────────┘     └──────────────────────┘     └─────────────┘
```

#### Schema Extension (Zod)
Add to the MiniApp schema:
```typescript
const DataSource = z.object({
  id: z.string(),
  connector: z.enum(["strava", "spotify", "google_calendar", ...]),
  action: z.string(),       // e.g. "getActivities", "getPlaylists"
  params: z.record(z.unknown()).optional(),
  refreshInterval: z.number().optional(), // auto-refresh in seconds
});

// MiniApp gets a new optional field:
dataSources: z.array(DataSource).optional()
```

#### Server-Side Components
1. **Connector Registry** — JSON config per service: auth type, base URL, available actions, parameter schemas
2. **Token Store** — Encrypted OAuth tokens per user per service (in Supabase or a new DB table)
3. **Proxy Endpoint** — `POST /api/proxy` receives `{ connector, action, params }`, attaches the user's token, calls the API, returns data
4. **Auth Endpoints** — `GET /api/auth/:service/start` (initiates OAuth), `GET /api/auth/:service/callback` (handles redirect, stores token)

#### App-Side Components
1. **Auth Flow** — Use `expo-auth-session` to open browser for OAuth, redirect back to app
2. **Data Fetching** — `MiniAppRenderer` resolves `dataSources` before rendering, making data available to components via state
3. **Connected Services UI** — New section in Profile showing which services are linked, with connect/disconnect buttons

### Option B: Use Nango as Auth Middleware

Instead of building OAuth per service, use [Nango](https://nango.dev/) ([GitHub](https://github.com/NangoHQ/nango)):
- Manages OAuth flows for 400+ APIs
- Handles token refresh automatically
- Provides a proxy endpoint that attaches tokens
- Open-source (Elastic license), self-hostable
- Your server calls Nango's proxy; Nango handles auth headers

**Trade-off**: Adds a dependency but saves weeks of OAuth plumbing. Elastic license is more restrictive than MIT.

Alternatives: [Composio](https://composio.dev/blog/nango-alternatives-ai-agents), [Paragon](https://www.useparagon.com), [Supabase Auth](https://supabase.com/docs/guides/auth) (we already use Supabase).

### Option C: Simple Sharing Only (Low Effort)

Skip full API integration. Just add deep-link sharing:
- WhatsApp: `whatsapp://send?text=...`
- Twitter/X: `https://twitter.com/intent/tweet?text=...`
- Email: `mailto:?subject=...&body=...`
- Generic: `expo-sharing` native share sheet

This can be added as a `ShareAction` component type in the schema. Claude can generate mini-apps that include share buttons. **Zero OAuth complexity.**

---

## 5. Verdict: Is It Worth It?

### Scoring Matrix

| Approach | Effort | User Value | Complexity | Recommendation |
|----------|--------|-----------|------------|----------------|
| **C. Share Actions only** | 1-2 days | Medium | Low | **Do this first** — quick win, no auth headache |
| **B. Nango-powered connectors** | 2-3 weeks | Very High | Medium | **Best mid-term play** — leverage existing infra, get Strava/Spotify/Google fast |
| **A. Custom connector system** | 4-6 weeks | Very High | High | Only if we outgrow Nango or need full control |

### Recommended Path — 4 Tiers

**Tier 1 — Webhook URLs (already works, 0 effort)**
The existing `HttpAction` can call n8n/Pipedream/Zapier webhook URLs today. A user sets up a workflow in n8n, gets a URL, and a mini-app can POST to it. All auth complexity lives in the external tool.

**Tier 2 — `openUrl` action (1-2 hours)**
Add a new action type that calls `Linking.openURL()` instead of `fetch()`. This enables:
- WhatsApp sharing: `whatsapp://send?text={{shareText}}`
- Email: `mailto:?subject={{title}}&body={{body}}`
- SMS: `sms:?body={{message}}`
- Twitter: `https://twitter.com/intent/tweet?text={{text}}`
- Any deep link to any installed app

Schema addition:
```typescript
const OpenUrlAction = z.object({
  type: z.literal("openUrl"),
  url: z.string(), // supports {{stateKey}} interpolation
});
```

**Tier 3 — Expand proxy whitelist + API key storage (1-2 days)**
Extend `ALLOWED_DOMAINS` in `proxyHandler.ts` to include `www.strava.com`, `api.spotify.com`, `www.googleapis.com`. Add an encrypted credential store (Supabase table) for user-provided API keys. Server injects keys into proxy requests.

**Tier 4 — Full OAuth connector system (1-2 weeks)**
Build `Connector` + `DataSource` schema extensions, OAuth routes, token manager, and "Connected Services" UI. Use [Nango](https://nango.dev/) or build directly with `expo-auth-session`. Start with 3 pilot services: **Strava**, **Spotify**, **Google Calendar**.

### What to Avoid
- **WhatsApp Business API** — Requires Meta business verification, not viable for a consumer app. Stick to deep-link sharing.
- **Building OAuth from scratch per service** — Use Nango or similar. The OAuth plumbing alone for 5 services would take weeks.
- **Client-side token storage** — Tokens should live server-side. Mini-apps should never see raw API tokens.
- **Tokens in mini-app state** — The `HttpAction` header interpolation (`{{token}}`) is fine for demo/public APIs but should never hold real OAuth tokens.

### Final Assessment

**Yes, it's worth going this direction.** Service integrations would be SwissKnife's killer differentiator — "describe an app that shows your Strava runs on a map" is a 10x better pitch than "describe a grocery list."

The best part: **we're already 70% there.** `HttpAction`, `ServerEndpoint` proxy, `SubServerManager`, and the capability system form the foundation. The missing pieces are OAuth token management and a connector abstraction — not a ground-up build.

The key is to layer the complexity:
1. `openUrl` for sharing (trivial, do now)
2. Expand the proxy whitelist + API keys (quick win)
3. Full OAuth connectors via Nango (medium effort, huge impact)
4. Community connector marketplace inspired by OpenClaw's ClawHub (long-term)

The declarative JSON architecture actually makes this *easier* than it would be in a traditional app — Claude just needs to know which connectors exist and what data they return, then it can generate UIs that display that data. The server does all the heavy lifting.

---

## Sources

- [OpenClaw Official Site](https://openclaw.ai/)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Integrations](https://openclaw.ai/integrations)
- [Nango — Developer Infrastructure for Integrations](https://nango.dev/)
- [Nango GitHub](https://github.com/NangoHQ/nango)
- [n8n GitHub](https://github.com/n8n-io/n8n)
- [Activepieces GitHub](https://github.com/activepieces/activepieces)
- [Appsmith GitHub](https://github.com/appsmithorg/appsmith)
- [Expo Auth Session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Strava API Docs](https://developers.strava.com/docs/authentication/)
- [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/)
- [Spotify PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [WhatsApp Cloud API Guide](https://www.unipile.com/whatsapp-api-a-complete-guide-to-integration/)
- [Supabase Social Auth with Expo](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)
- [Nango Alternatives (Composio)](https://composio.dev/blog/nango-alternatives-ai-agents)
