---
sidebar_position: 1
title: Getting Started
---

# Getting Started

This guide gets the full Baristapp stack running locally (server, app, docs, website) and verifies end-to-end generation.

## Prerequisites

- **Node.js** 18+
- **npm** 9+ (workspaces support)
- **Expo CLI** (`npx expo`)
- **LLM API key** (Anthropic/OpenAI depending on server config)
- **Supabase project** (optional, for cloud sync)

## 1. Install Dependencies

From the repo root:

```bash
npm install
```

This installs all workspaces: `shared`, `server`, `app`, `docs`, `website`.

## 2. Configure root app settings

Edit `baristapp.config.js` at the root:

```javascript
module.exports = {
  debug: true,
  apiBaseUrl: "http://YOUR_LAN_IP:3001", // use LAN IP for physical devices
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
};
```

:::tip Finding your LAN IP
- **macOS/Linux:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` → look for IPv4 address under your active adapter
:::

## 3. Configure server environment

Create `server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...   # optional, if enabled in provider config
PORT=3001

# Optional: Supabase (for cloud storage)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  # optional legacy fallback
SUPABASE_JWT_SECRET=your-jwt-secret

# Optional: HuggingFace (for ML endpoints)
HUGGINGFACE_API_KEY=hf_...
```

## 4. Initialize Supabase (optional)

If using cloud sync, run `supabase_setup.sql` in the Supabase SQL Editor:

The script creates base storage + social/library tables and seeds starter official templates.

Enable **Email auth** in Supabase Dashboard → Authentication → Providers.

## 5. Run services

```bash
# Terminal 1: Start the server
npm run server

# Terminal 2: Start the app
npm run app

# Terminal 3: Start the docs (optional)
npm run docs

# Terminal 4: Start marketing website (optional)
npm run website
```

Default local URLs:

- API server: `http://localhost:3001`
- Docs (Docusaurus): `http://localhost:3000`
- Website (Next.js): usually `http://localhost:3002` or next available port

## 6. Verify end-to-end generation

1. Open the app on a simulator or device
2. Complete onboarding
3. Go to the **Create** tab
4. Enter a prompt, for example: *"A simple budget tracker with categories and monthly totals"*
5. Answer clarification questions (or skip when available)
6. Wait for generation to complete
7. Open the generated mini-app and test interactions
8. Ask for a modification (for example: *"Add CSV export and dark mode toggle"*)

If this succeeds, your generation + modify loop is healthy.

## 7. Common issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| App cannot reach server | Wrong `apiBaseUrl` for device | Use LAN IP, not `localhost`, on physical phone |
| Generation fails immediately | Missing/invalid API key | Verify `server/.env` and restart server |
| Cloud sync errors | Supabase env mismatch | Re-check URL, keys, and SQL setup |
| Docs build warnings | Broken links in docs | Run docs locally and fix route paths |

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run server` | Start Express server (tsx watch, hot reload) |
| `npm run app` | Start Expo dev server |
| `npm run docs` | Start documentation site |
| `npm run docs:build` | Build docs static output |
| `npm run website` | Start website (Next.js) |
| `npm run typecheck` | Type-check shared + server |

## Next steps

- Read [How to Use](./how-to-use.md) for practical creation/modification workflows.
- Read [Architecture Overview](../architecture/overview.md) for system-level understanding.
- Read [Security Model](../architecture/security.md) before public release.
