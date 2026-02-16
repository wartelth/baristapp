# Auth & Config Setup

## Config (Debug vs Production)

Edit **`swissknife.config.js`** at the project root to switch between debug and production:

```js
module.exports = {
  debug: true,  // false for production
  apiBaseUrl: "http://192.168.2.223:3001",  // your production API URL
  supabaseUrl: "https://your-project.supabase.co",
  supabaseAnonKey: "your-anon-key",
};
```

Or use env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Supabase Auth Setup

1. **Supabase Dashboard** → Authentication → Providers → Email: enable, optionally disable "Confirm email" for dev.
2. **Settings → API**: copy Project URL and anon/public key into `swissknife.config.js`.
3. **Server**: add `SUPABASE_JWT_SECRET` to `.env` (from Supabase Dashboard → Settings → API → JWT Secret) so the server can verify auth tokens.

## Flow

- **Onboarding** → first launch shows portfolio tiles, then "Get started".
- **Auth** → Login / Sign up (email + password).
- **Main** → Library, Create, Profile tabs. Profile shows email and Sign out.
- **Cloud sync** → When logged in, storage API uses `user_id` from JWT. When not logged in, uses `x-device-id`.
