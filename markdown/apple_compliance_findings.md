# Apple App Store Compliance Findings — SwissKnife

> **Purpose:** This document lists potential issues and inconsistencies between the SwissKnife codebase and Apple's App Review Guidelines. Items are ordered by severity and guideline section. Use this as a pre-submission checklist.

**Reference:** `docs/apple_guidelines.md`  
**Last audit:** February 2026

---

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 5 | Must fix before submission |
| High | 4 | Strongly recommended |
| Medium | 5 | Address if flagged |
| Low | 3 | Nice to have |

---

## 1. Critical Issues

### 1.1 Privacy Policy Missing In-App (Guideline 5.1.1)

**Guideline:** All apps must include a link to their privacy policy **in the App Store Connect metadata field and within the app in an easily accessible manner**.

**Finding:** No privacy policy link is present anywhere in the app UI. Users cannot access the privacy policy from within the app.

**Recommendation:** Add a Settings/About screen or footer with a clearly visible "Privacy Policy" link that opens the policy (e.g. via Safari or in-app WebView). Ensure the policy covers:
- Data collected (prompts, mini-app specs, state, device ID)
- How data is used (Claude API, Supabase storage)
- Third parties (Anthropic, Supabase) and their data protection
- Data retention/deletion and how users can revoke consent

---

### 1.2 User-Generated Content: No Moderation Tools (Guideline 1.2)

**Guideline:** Apps with user-generated content must include:
- A method for filtering objectionable material
- A mechanism to report offensive content and timely responses
- The ability to block abusive users
- Published contact information

**Finding:** SwissKnife hosts user-generated mini-apps (specs created from user prompts). There is no:
- Content filtering (e.g. prompt/spec moderation before or after generation)
- Report mechanism for objectionable mini-apps
- Block functionality
- In-app contact/support information

**Recommendation:** Implement at minimum:
- Report button on each mini-app card (or in the mini-app header) to flag inappropriate content
- Support/contact email or form accessible from the app
- Consider server-side prompt filtering (blocklist, AI moderation) before generation
- Document response process for reports in App Review notes

---

### 1.3 Mini-Apps / Creator Content (Guideline 4.7)

**Guideline 4.7** applies to "mini apps, mini games, streaming games, chatbots, plug-ins." SwissKnife falls under this rule. Requirements include:

**4.7.1:** Software must follow privacy guidelines, include filtering/reporting/blocking, and follow 3.1 for digital goods.

**4.7.4:** You must provide an **index of software and metadata** available in the app, with **universal links** leading to all software offered.

**4.7.5:** Provide a way for users to identify software that exceeds the app's age rating, and use an age restriction mechanism.

**Finding:**
- No public index of mini-apps with universal links (current model is personal-only; if shared, this becomes required)
- No age restriction mechanism for mini-apps that may contain mature content
- Filtering/reporting covered above under 1.2

**Recommendation:**
- If mini-apps remain personal-only: Document this clearly in App Review notes; 4.7.4 may not apply
- If sharing is planned: Build an index with universal links and age-gating for mature content
- Add age restriction flow for mini-apps that could display user-generated text/images

---

### 1.4 Recording Without Clear Visual/Audible Indication (Guideline 2.5.14)

**Guideline:** Apps must request explicit user consent and provide a **clear visual and/or audible indication** when recording, logging, or otherwise making a record of user activity. This includes camera and microphone use.

**Finding:**
- **CameraViewRenderer:** Camera is visible, but there is no explicit "recording" or "capturing" indicator beyond the Capture button. For photo capture this may be acceptable; ensure the purpose is clear.
- **AudioRecorderRenderer:** Shows "Ready" / timer when recording, but the initial permission request happens on first tap. The recording state (red button, timer) provides visual feedback, which is good. Ensure the permission dialog clearly states recording purpose.

**Recommendation:**
- Add a persistent visual indicator (e.g. red dot, "Recording" badge) when microphone is actively recording
- Ensure permission strings in `app.json` explicitly mention recording (they do: "record audio")
- Consider a brief on-screen confirmation ("Recording started") when recording begins

---

### 1.5 Developer / Support Contact Information (Guideline 1.5)

**Guideline:** People need to know how to reach you. Your app and Support URL must include an easy way to contact you.

**Finding:** No in-app support URL, contact email, or help/settings screen. App Store Connect will have a Support URL, but the guideline also requires accessibility **within the app**.

**Recommendation:** Add a Settings or About screen with:
- Support URL (or mailto link)
- Contact email
- Link to privacy policy

---

## 2. High Priority Issues

### 2.1 Data Sharing With Third Parties — Disclosure & Consent (Guideline 5.1.2)

**Guideline:** You must clearly disclose where personal data will be shared with third parties, **including with third-party AI**, and obtain explicit permission before doing so.

**Finding:**
- User prompts are sent to **Claude (Anthropic)** for generation and modification
- App specs and state are stored in **Supabase** (cloud)
- Device ID (`x-device-id`) is used for user identification
- No in-app disclosure or consent flow before first API call

**Recommendation:**
- Add a first-launch or pre-generation consent screen: "Your prompts and app data are processed by Anthropic (Claude) and stored in our cloud. [Learn more]. [Accept] [Decline]"
- Privacy policy must explicitly list Anthropic and Supabase
- Provide a way to withdraw consent (e.g. opt-out of cloud sync, delete data)

---

### 2.2 Template / App Generation Service (Guideline 4.2.6)

**Guideline:** Apps created from a commercialized template or app generation service will be rejected unless submitted directly by the provider of the app's content, or they use a "picker" model (e.g. single binary hosting all client content).

**Finding:** SwissKnife is an app generation service. Users create mini-apps via prompts; the content is user-generated, not developer-provided. The "picker" model (one app, many user-created entries) aligns with the acceptable pattern.

**Recommendation:**
- Emphasize in App Review notes: "Single binary, user-created content only, no third-party submissions"
- Avoid framing as "app store" or "marketplace" — use "personal tool creation" or "mini-app builder"
- Ensure the app provides substantial native value (creation UI, rendering engine, storage) beyond a thin wrapper

---

### 2.3 Backend Availability During Review (Guideline 2.1)

**Guideline:** Enable backend services so they're live and accessible during review. Provide demo account or fully-featured demo mode if the app includes account-based features.

**Finding:**
- App requires server at `https://api.swissknife.app` for generation, modification, storage
- No demo account or built-in demo mode
- If server is down or rate-limited, reviewers cannot test core flows

**Recommendation:**
- Ensure `api.swissknife.app` is live and stable during review
- Consider a demo mode with pre-loaded mini-apps that work offline for fallback
- Add App Review notes: "Backend required; ensure api.swissknife.app is reachable"

---

### 2.4 Hardcoded Development IP in Production Build

**Finding:** `app/src/api/client.ts`, `MiniAppRenderer.tsx`, and `supabaseClient.ts` use:
```ts
const BASE_URL = __DEV__
  ? "http://192.168.2.223:3001"
  : "https://api.swissknife.app";
```
`__DEV__` should correctly switch to production URL in release builds. Verify that release builds never use the LAN IP.

**Recommendation:**
- Confirm `__DEV__` is false in production/App Store builds
- Consider using `expo-constants` or env vars for BASE_URL to avoid accidental leakage
- Remove or document the hardcoded IP for clarity

---

## 3. Medium Priority Issues

### 3.1 Account Deletion (Guideline 5.1.1(v))

**Guideline:** If your app supports account creation, you must also offer account deletion within the app.

**Finding:** SwissKnife uses device-based identity (`x-device-id`) rather than traditional accounts. There is no account creation flow. However, user data (specs, state) is stored and synced to Supabase keyed by device ID.

**Recommendation:**
- If no "account" exists: Document that identity is device-based, no sign-up required
- Add "Delete all my data" / "Reset" in Settings to clear local storage and request server-side deletion
- Privacy policy should describe data deletion process

---

### 3.2 Location Services Purpose (Guideline 5.1.5)

**Guideline:** Use Location Services only when directly relevant. Notify and obtain consent before collecting/transmitting location data. Explain the purpose in the app.

**Finding:** `NSLocationWhenInUseUsageDescription` is set: "This app uses your location for map and location-based mini-apps." Permission is requested per mini-app via capabilityManager when a mini-app declares `location` capability.

**Recommendation:**
- Purpose string is adequate
- Ensure location is only requested when a mini-app actually uses MapView or similar
- Do not request location at app launch; defer to first mini-app that needs it

---

### 3.3 IPv6-Only Networks (Guideline 2.5.5)

**Guideline:** Apps must be fully functional on IPv6-only networks.

**Finding:** No explicit IPv6 handling. Fetch calls to `api.swissknife.app` depend on DNS and network stack. Supabase and Anthropic APIs should support IPv6.

**Recommendation:** Test on an IPv6-only network (e.g. enable IPv6-only in Xcode scheme) to ensure all API calls succeed.

---

### 3.4 Minimum Functionality / 4.2 Risk (Guideline 4.2)

**Guideline:** Your app should include features, content, and UI that elevate it beyond a repackaged website. It should be "app-like," useful, unique.

**Finding:** Per `docs/knowledge.md`, Apple has rejected "container" apps that host other content without unique native features. SwissKnife could be seen as a thin wrapper if not framed correctly.

**Recommendation:**
- Highlight native value: declarative renderer, offline-capable mini-apps, capability system, local storage
- Ensure screenshots and description emphasize the creation and rendering experience, not just "another app store"
- Consider adding native-only features (e.g. widgets, Shortcuts) to strengthen the case

---

### 3.5 Permission Strings — Microphone for Recording

**Finding:** `NSMicrophoneUsageDescription`: "This app uses the microphone to record audio for mini-apps." This is used by `expo-av` for `AudioRecorderRenderer`. The string is clear.

**Recommendation:** Ensure the capability is only requested when the user opens a mini-app that uses `audioRecorder`, not at app launch. Current flow (request on first use per mini-app) is correct.

---

## 4. Low Priority / Nice to Have

### 4.1 Age Rating Alignment

**Recommendation:** Answer age rating questions honestly. If mini-apps can display arbitrary user-generated text (e.g. journal entries, lists), consider a 12+ or 17+ rating depending on moderation. Document in App Review notes.

---

### 4.2 "For Kids" / "For Children" (Guideline 2.3.8)

**Guideline:** Use of "For Kids" and "For Children" in metadata is reserved for the Kids Category.

**Finding:** No such terms found in the codebase. Ensure app name, subtitle, and description avoid these unless targeting Kids Category.

---

### 4.3 Metadata and Screenshots (Guideline 2.3)

**Recommendation:** Before submission:
- Screenshots should show the app in use, not just splash/login
- Ensure description accurately reflects functionality
- No placeholder text or empty content in submission

---

## 5. Checklist for App Review Notes

When submitting, include in **Notes for Review**:

1. **Backend:** "This app requires our backend at https://api.swissknife.app. Please ensure it is reachable during review."
2. **Mini-apps:** "Mini-apps are user-created, personal tools. No shared marketplace. Content is generated from user prompts and rendered via a declarative schema (no code execution)."
3. **Data flow:** "User prompts are sent to Anthropic (Claude) for generation. App specs and state are stored in Supabase. See privacy policy for details."
4. **Demo:** If possible, "Demo mode available: [instructions]" or "No login required; create a mini-app with any prompt to test."
5. **4.2.6 / 4.7:** "Single binary, picker model. Users create personal mini-apps only. No third-party submissions."

---

## 6. Files to Update

| File | Changes |
|------|---------|
| `app/App.tsx` or new Settings screen | Add Privacy Policy link, Support/Contact |
| `app/src/screens/` | New SettingsScreen or AboutScreen |
| `app/src/context/` or onboarding | Consent flow for data sharing (Claude, Supabase) |
| `app/src/components/MiniAppCard.tsx` or similar | Report button for mini-apps |
| `app/app.json` | Verify all permission strings |
| App Store Connect | Privacy policy URL, Support URL, category, age rating |
| New: `docs/privacy-policy.md` or external URL | Full privacy policy |

---

*This document should be updated after each significant change to the app or before each App Store submission.*
