---
sidebar_position: 1
title: Getting Started
---

# Getting Started

This guide walks you through setting up SwissKnife for local development.

## Prerequisites

- **Node.js** 18+
- **npm** 9+ (workspaces support)
- **Expo CLI** (`npx expo`)
- **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- **Supabase project** (optional, for cloud sync)

## 1. Install Dependencies

From the monorepo root:

```bash
npm install
```

This installs all workspace packages (`shared`, `server`, `app`, `docs`).

## 2. Configure

Edit `swissknife.config.js` at the root:

```javascript
module.exports = {
  debug: true,
  apiBaseUrl: "http://YOUR_LAN_IP:3001",  // Use LAN IP for physical devices
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
};
```

:::tip Finding your LAN IP
- **macOS/Linux:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` → look for IPv4 address under your active adapter
:::

## 3. Server Environment

Create `server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001

# Optional: Supabase (for cloud storage)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  # optional legacy fallback
SUPABASE_JWT_SECRET=your-jwt-secret

# Optional: HuggingFace (for ML endpoints)
HUGGINGFACE_API_KEY=hf_...
```

## 4. Supabase Setup (Optional)

If using cloud sync, run `supabase_setup.sql` in the Supabase SQL Editor:

The script creates base storage + social/library tables and seeds starter official templates.

Enable **Email auth** in Supabase Dashboard → Authentication → Providers.

## 5. Run

```bash
# Terminal 1: Start the server
npm run server

# Terminal 2: Start the app
npm run app

# Terminal 3: Start the docs (optional)
npm run docs
```

The server runs on `http://localhost:3001`. The app opens in Expo DevTools.

## 6. Test It

1. Open the app on a simulator or device
2. Complete onboarding
3. Go to the **Create** tab
4. Enter a prompt like: *"A simple counter with increment and decrement buttons"*
5. Answer clarification questions (or skip)
6. Wait for generation to complete
7. Tap the notification to view your mini-app

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run server` | Start Express server (tsx watch, hot reload) |
| `npm run app` | Start Expo dev server |
| `npm run docs` | Start documentation site |
| `npm run typecheck` | Type-check shared + server |
