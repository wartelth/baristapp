Here’s a concise summary of what matters for your setup.

---

## Apple’s requirement (Guideline 4.8)

Apple no longer explicitly requires “Sign in with Apple,” but if you use **third‑party or social login** (Google, Facebook, Twitter, etc.) for the **primary account**, you must also offer another login option that:

- Limits data collection to name and email
- Allows users to keep their email private
- Does not track users for advertising

Sign in with Apple is the usual way to satisfy this.

You **do not** need Sign in with Apple if:

- You only use your own account system (e.g. email/password)
- You use only Sign in with Apple (no other social providers)
- The app is education/enterprise and uses institutional accounts

---

## Supabase Auth vs Clerk

### Supabase Auth — sufficient and low overhead

Supabase Auth supports Sign in with Apple and fits your stack well because:

1. You already use Supabase for storage.
2. **Native flow** (recommended for iOS) uses `signInWithIdToken()` with the token from `expo-apple-authentication`:
   - No OAuth redirect flow
   - No `.p8` secret key
   - No 6‑month secret rotation
3. OAuth flow (web, Android) needs a `.p8` key and 6‑month rotation; native iOS does not.

**Implementation outline:**

```ts
// 1. expo-apple-authentication → get credential
// 2. supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce })
// 3. Save fullName on first sign-in (Apple only sends it once)
```

**Overhead:**

- Add `@supabase/supabase-js` in the app (you currently proxy through the server).
- Add `expo-apple-authentication`.
- Configure Apple in Supabase Dashboard (Bundle ID, etc.).
- Wire up the flow and replace `x-device-id` with Supabase user ID where needed.

### Clerk — more features, more overhead

- Pre-built UI and `useSignInWithApple()` for Expo.
- Requires a native build (no Expo Go).
- Adds another service, billing, and configuration.
- Can integrate with Supabase, but then you have two auth layers.

Clerk makes sense if you want multiple social providers, hosted UI, and B2B features. For “Sign in with Apple only” and minimal overhead, it’s usually more than you need.

---

## Recommendation for SwissKnife

**Use Supabase Auth with Sign in with Apple**:

1. You already use Supabase.
2. Native flow avoids OAuth and secret rotation.
3. One auth system instead of adding Clerk.
4. You can keep your server as a proxy and pass the Supabase JWT in `Authorization` instead of `x-device-id`.

**Minimal flow:**

1. Install: `expo-apple-authentication`, `@supabase/supabase-js`.
2. Enable “Sign in with Apple” for your App ID in Apple Developer.
3. Configure Apple in Supabase Dashboard (Bundle ID as Client ID; no OAuth config for native).
4. Use `AppleAuthentication.signInAsync()` → `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`.
5. On first sign-in, save `fullName` via `supabase.auth.updateUser()`.
6. Use `supabase.auth.getSession()` / `user.id` instead of device UUID for storage keys.

**When you need Sign in with Apple:**

- Only if you add other social logins (Google, etc.) for the primary account.
- If you stay with “device ID only” or “Supabase Auth with Apple only,” you’re fine without it from Apple’s perspective.