# Apple Release Implementation Checklist (Executed)

## 1) Consent and privacy disclosures

- [x] `app/src/privacy/dataConsentFlow.ts`
  - Added interactive consent prompt before data processing.
- [x] `app/src/storage/privacyConsent.ts`
  - Added persisted consent state.
- [x] `app/src/screens/CreateScreen.tsx`
  - Consent check now happens before clarification API call.
- [x] `app/src/context/GenerationContext.tsx`
  - Consent check now happens before generate/modify API calls.

## 2) In-app privacy policy and support access

- [x] `app/src/screens/LegalScreen.tsx`
  - Added in-app Privacy Policy and Support pages.
- [x] `app/src/types/navigation.ts`
  - Added `Legal` route to root stack.
- [x] `app/App.tsx`
  - Wired `Legal` screen into stack navigator.
- [x] `app/src/screens/ProfileScreen.tsx`
  - Added links to Privacy Policy and Support pages.
  - Added contact email action.

## 3) Data deletion controls

- [x] `app/src/api/client.ts`
  - Added `deleteMyCloudData()`.
- [x] `app/src/storage/storageLayer.ts`
  - Added `clearAllApps()` for local wipe.
- [x] `app/src/screens/ProfileScreen.tsx`
  - Added "Delete my data" flow (cloud + local delete).
- [x] `server/src/services/supabaseClient.ts`
  - Added `deleteAllUserData(userId)`.
- [x] `server/src/routes/storage.ts`
  - Added `DELETE /api/storage/me`.

## 4) Reporting and moderation

- [x] `app/src/api/client.ts`
  - Added `reportMiniApp()`.
- [x] `app/src/components/MiniAppCard.tsx`
  - Added report action in card menu.
- [x] `app/src/screens/HomeScreen.tsx`
  - Added report reason picker and report submission.
- [x] `server/src/services/reportStore.ts`
  - Added report persistence in `server/tmp/reports`.
- [x] `server/src/routes/reports.ts`
  - Added `POST /api/reports`.
- [x] `server/src/index.ts`
  - Mounted reports route.
- [x] `server/src/utils/contentModeration.ts`
  - Added basic prompt moderation utility.
- [x] `server/src/routes/clarify.ts`
  - Added moderation gate.
- [x] `server/src/routes/generate.ts`
  - Added moderation gate.
- [x] `server/src/routes/modify.ts`
  - Added moderation gate.

## 5) Recording transparency

- [x] `app/src/components/renderers/AudioRecorderRenderer.tsx`
  - Added explicit "Recording" visual indicator with red dot.

## 6) Config and release metadata support

- [x] `app/src/config.ts`
  - Added `privacyPolicyUrl`, `supportUrl`, `supportEmail` config fields.
- [x] `markdown/privacy-policy.md`
  - Added draft privacy policy source text for publication.

## 7) Social sharing and import UX polish

- [x] `server/src/services/supabaseClient.ts`
  - Share code generation now uses short human-readable format (`abc-def-ghi`) with collision retry.
  - Import accepts normalized share tokens and preserves backward compatibility with legacy codes.
- [x] `app/src/screens/HomeScreen.tsx`
  - Share flow upgraded to a dedicated modal with minimal QR code + native share action.
- [x] `app/src/screens/SocialScreen.tsx`
  - Import flow upgraded with code auto-formatting, validation, post-import quick actions, and QR scanning.
- [x] `app/src/utils/shareCode.ts`
  - Added reusable share-code sanitize/format/validate/extract helpers.
- [x] `app/package.json`
  - Added `react-native-qrcode-svg` for QR rendering in sharing flow.

## 8) Official developer library starter content

- [x] `supabase_setup.sql`
  - Added idempotent seed templates in `featured_mini_apps`:
    - Tic Tac Toe
    - Would-You-Rather Party
    - Debate Duel Timer
    - Book Club Companion (public API-backed list)

## Remaining manual release tasks (outside code)

- [ ] Publish the privacy policy and support URLs used in App Store Connect.
- [ ] Fill App Review notes with backend + mini-app model explanation.
- [ ] Validate production API uptime during review window.
- [ ] Run iOS IPv6-only network test.
