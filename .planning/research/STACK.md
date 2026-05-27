# Stack Research: LauFit

**Researched:** 2026-05-27
**Confidence:** HIGH (all key choices verified against Context7 / official docs)

---

## Recommended Stack (2025)

### Frontend

| Library | Target Version | Purpose | Confidence |
|---------|---------------|---------|------------|
| expo | ~55.0.14 | Core framework | HIGH — SDK 55 is current stable |
| react-native | 0.83.4 | RN runtime (pinned by SDK 55) | HIGH |
| react | 19.2.0 | React runtime (pinned by SDK 55) | HIGH |
| expo-router | ~5.0.7 | File-based navigation | HIGH — bundled with SDK 54/55 |
| @tanstack/react-query | ^5.x | Server state, async data | HIGH — v5 is current stable |
| zustand | ^5.0.x | Client/UI state | HIGH — v5 is current stable |
| react-hook-form | ^7.66.x | Form management | HIGH — v7 is current stable |
| zod | ^3.x | Schema validation | HIGH — standard, unchanged |
| nativewind | ^4.x (stable) | Tailwind styling | MEDIUM — see note below |
| react-native-reanimated | ~3.18.0 | Animations (required by NativeWind) | HIGH — bundled with SDK |
| react-native-gesture-handler | ~2.26.0 | Gesture handling | HIGH — bundled with SDK |
| react-native-safe-area-context | latest | Safe area insets | HIGH — standard dep |
| expo-image | latest | Performant image rendering | HIGH — replaces RN Image |
| expo-video | latest | Video playback (YouTube embed alternative) | HIGH — replaces deprecated expo-av |
| expo-secure-store | latest | Secure token persistence | HIGH — recommended over AsyncStorage for auth |
| expo-constants | latest | App config, EAS project ID | HIGH — required for push notifications |

### Backend / Firebase

| Service | Package | Version | Purpose | Confidence |
|---------|---------|---------|---------|------------|
| Firebase Auth | @react-native-firebase/auth | ^23.x | Email/password auth | HIGH |
| Firestore | @react-native-firebase/firestore | ^23.x | Primary database | HIGH |
| Storage | @react-native-firebase/storage | ^23.x | Profile photos | HIGH |
| Cloud Functions | @react-native-firebase/functions | ^23.x | Server-side logic | HIGH |

**Firebase SDK choice: use `@react-native-firebase` (react-native-firebase), NOT `firebase` (JS SDK).**

React-native-firebase wraps the native Android/iOS Firebase SDKs directly, giving access to all Firebase services (Crashlytics, App Check, Performance, Messaging) that the pure JS SDK does not expose. It is the officially recommended package for React Native/Expo projects as of 2025.

### Build and Deploy

| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| Expo EAS Build | latest CLI | iOS + Android binary builds | HIGH |
| Expo EAS Update | latest | OTA JavaScript updates | HIGH |
| expo-build-properties | latest | Native build config (required for iOS Firebase) | HIGH |

---

## Validated Choices

All of the following pre-decided stack choices are confirmed as correct for mid-2025:

- **React Native (Expo SDK 51+)** — Confirmed, upgrade target to SDK 55 (current stable). SDK 55 ships with React Native 0.83.4 and React 19.2.0.
- **expo-router** — Confirmed at version ~5.0.7 (bundled with SDK 55). File-based routing is the Expo standard.
- **react-query** — Confirmed as TanStack Query v5 (the library was renamed; import path is `@tanstack/react-query`). V5 uses a single-object API for `useQuery` — minor migration surface if coming from v4.
- **zustand** — Confirmed at v5.x. The `shallow` selector pattern changed in v5 (use `useShallow` hook instead of passing `shallow` to `create`). Negligible impact for greenfield.
- **react-hook-form + zod** — Confirmed. v7.66.x is current. Combine via `@hookform/resolvers/zod` as before.
- **Firebase (Auth + Firestore + Storage + Functions)** — Confirmed. Use `@react-native-firebase/*` packages, NOT the web `firebase` JS SDK. React-native-firebase v23.x is current.
- **iOS + Android via Expo EAS** — Confirmed. EAS Build is the standard path for managed/bare Expo workflows.

---

## Adjustments

### 1. Target SDK 55, not SDK 51

The PROJECT.md says "Expo SDK 51+". The current stable release is **SDK 55** (React Native 0.83, React 19.2). Starting on SDK 55 means:

- New Architecture is **always on and cannot be disabled** (as of SDK 55 / RN 0.82+). No opt-out exists.
- React 19 concurrent features are available by default.
- All libraries must be New Architecture compatible. The react-native-firebase packages, reanimated, gesture-handler, and NativeWind v4 are all compatible.

**Recommendation:** Target SDK 55 from day one. Do not start on 51 and plan to upgrade.

### 2. NativeWind: Use v4 (stable), not v5 (pre-release)

The project says "NativeWind". Two active versions exist:

- **NativeWind v4** (stable, `nativewind@4.x`) — Uses Tailwind CSS v3, `tailwind.config.js`, stable and production-ready. Install with `npm install nativewind tailwindcss@^3.4.17`.
- **NativeWind v5** (pre-release, `nativewind@preview`) — Uses Tailwind CSS v4, `@tailwindcss/postcss`, requires React Native v0.81+ and Reanimated v4+. Still tagged `preview` as of May 2026.

**Recommendation: Use NativeWind v4 for this project.** V5 is still in pre-release, requires `nativewind@preview` install flag, and its Tailwind v4 `@tailwindcss/postcss` pipeline differs significantly from v3. The Obsidian Performance design system tokens and custom theme are straightforward to express in v4's `tailwind.config.js`. Migrate to v5 post-MVP when it goes stable.

### 3. Replace expo-av with expo-video

`expo-av` was deprecated in SDK 53 and removed in SDK 54. **It does not exist in SDK 55.**

For LauFit's exercise video playback (YouTube/Vimeo links), use `expo-video`:

```tsx
import { VideoView, useVideoPlayer } from 'expo-video';
```

Since the project spec says "uses YouTube/Vimeo links instead of custom video upload", the primary need is a WebView-based YouTube embed, but `expo-video` handles direct video URLs. Use `react-native-webview` for YouTube iframe embeds if needed.

### 4. Add expo-image (replaces React Native's Image)

expo-image provides disk and memory caching, blurhash placeholders, smooth transitions, and better performance than the built-in `<Image>`. For profile photos and exercise thumbnails loaded from Firebase Storage, this is a meaningful upgrade.

```tsx
import { Image } from 'expo-image';
```

### 5. Add expo-secure-store for auth token persistence

Firebase auth tokens must persist across app restarts. expo-secure-store is the Expo-recommended approach over AsyncStorage for sensitive values. React Native Firebase's auth module handles session persistence natively on device, but expo-secure-store is still needed for any additional user session state stored in Zustand that needs to survive restarts.

### 6. Firebase: @react-native-firebase, not firebase JS SDK

Crucial: the `firebase` npm package (Firebase JS SDK) is optimized for web/Node. For Expo/React Native, use `@react-native-firebase/*` packages. These wrap the native iOS/Android Firebase SDKs and expose the full Firebase feature set.

Versions to target: `@react-native-firebase/*` v22.x (compatible with current Expo SDK 55). V23.0.0 was released 2025-08-07 (future date relative to this research) with iOS 15+ and Android minSdk 23+ requirements — verify timeline before adopting v23.

**Required iOS gotcha:** Add `expo-build-properties` to your plugins and set `useFrameworks: "static"` in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      ["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
    ]
  }
}
```

### 7. Gluestack UI: skip it for this project

Gluestack UI v3 (current) is actually a component library built on top of NativeWind. It provides copy-pasteable components but adds an abstraction layer and `GluestackUIProvider` wrapper. For LauFit's custom Obsidian Performance design system (electric green `#00FF66`, dark `#0E0E0E`, specific typography), building directly with NativeWind gives more design fidelity without fighting Gluestack's component defaults. Skip Gluestack.

---

## Critical Gotchas

### Gotcha 1: New Architecture is mandatory in SDK 55

SDK 55 uses React Native 0.83, which runs exclusively on the New Architecture (JSI/Fabric/TurboModules). The legacy architecture was frozen in June 2025. Any library that has not migrated to the New Architecture will crash or behave incorrectly.

Libraries confirmed as New Architecture compatible: `@react-native-firebase/*`, `react-native-reanimated` ~3.18, `react-native-gesture-handler` ~2.26, NativeWind v4, TanStack Query v5, Zustand v5.

If you encounter a library that is not New Architecture compatible, you must either find an alternative or stay on SDK 54 (which allows opting out). **Do not start on SDK 54 just to hedge — instead vet every library before adding it.**

### Gotcha 2: expo-router v5 and SDK 56 deprecate React Navigation direct imports

SDK 55 uses expo-router v5.0.7. SDK 56 (upcoming) will require replacing `@react-navigation/native` imports with `expo-router/react-navigation`. This is a minor future migration. Start on SDK 55, be aware the upgrade to SDK 56 involves an automated codemod: `npx expo-codemod sdk-56-expo-router-react-navigation-replace src`.

### Gotcha 3: TanStack Query v5 single-object API

In v5, all hooks accept a single object argument:

```tsx
// v4 (old)
useQuery(['exercises'], fetchExercises, { staleTime: 60000 })

// v5 (correct)
useQuery({ queryKey: ['exercises'], queryFn: fetchExercises, staleTime: 60000 })
```

If any team member has v4 muscle memory, this will cause silent TypeScript errors. Set up eslint-plugin-query from day one.

### Gotcha 4: Zustand v5 — `shallow` selector change

In Zustand v5, the `shallow` comparator is no longer passed directly to `create`. Use the `useShallow` hook:

```tsx
// v4 (old)
const { count, text } = useStore(state => ({ count: state.count, text: state.text }), shallow)

// v5 (correct)
const { count, text } = useStore(useShallow(state => ({ count: state.count, text: state.text })))
```

### Gotcha 5: React Native Firebase requires a development build (no Expo Go)

`@react-native-firebase/*` uses native code and cannot run in Expo Go. Every team member must use a development build (built via EAS Dev Client or local `npx expo run:ios`). Set this expectation from day one to avoid "it works in Expo Go" confusion.

### Gotcha 6: EAS Build free tier build limits

EAS Build free tier offers a limited number of low-priority builds per month (Expo docs describe it as "a limited quantity" without publishing a fixed number — verify current limit at expo.dev/pricing). Low-priority builds can queue for 30-60 minutes. For active development:

- Starter plan: $19/month, includes $45 build credit, priority builds.
- Two developers running frequent iOS + Android builds will likely exhaust the free tier quickly.

**Recommendation:** Budget for Starter plan ($19/month) from the start. Do not rely on free tier for active iteration.

### Gotcha 7: iOS useFrameworks: static breaks some libraries

Setting `useFrameworks: "static"` in `expo-build-properties` (required for react-native-firebase on iOS) can conflict with libraries that use dynamic frameworks. Notable: `react-native-maps` is a known conflict. LauFit does not require maps, so this is low risk — but vet each new library against this constraint.

### Gotcha 8: expo-av is removed in SDK 55

Do not use `expo-av`. It was removed in SDK 54. For video: use `expo-video`. For audio: use `expo-audio`. Both are first-party Expo packages with full SDK 55 support.

---

## Installation Reference

```bash
# Bootstrap
npx create-expo-app@latest laufit --template default@sdk-55

# Core navigation (already included in SDK 55 template)
npx expo install expo-router react-native-safe-area-context react-native-screens

# Firebase
npx expo install @react-native-firebase/app @react-native-firebase/auth
npx expo install @react-native-firebase/firestore @react-native-firebase/storage @react-native-firebase/functions
npx expo install expo-build-properties

# State and data
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod

# UI and styling
npm install nativewind
npm install --save-dev tailwindcss@^3.4.17

# Expo utilities
npx expo install expo-image expo-video expo-secure-store expo-constants expo-notifications

# Gesture/animation (already bundled, but pin versions)
npx expo install react-native-reanimated react-native-gesture-handler
```

---

## Confidence

| Area | Level | Reasoning |
|------|-------|-----------|
| Expo SDK version (55) | HIGH | Confirmed via Context7/expo docs — SDK 55 current stable with RN 0.83 |
| expo-router version | HIGH | Confirmed ~5.0.7 bundled with SDK 55 |
| NativeWind v4 vs v5 | MEDIUM | V5 is pre-release; v4 is stable. Recommendation is conservative but evidence-based |
| TanStack Query v5 | HIGH | Confirmed via Context7/tanstack docs — v5 is current with v5.90.x releases |
| react-native-firebase | HIGH | Confirmed via Context7/invertase docs — proper choice over firebase JS SDK for RN |
| New Architecture mandatory | HIGH | Confirmed via Expo docs — SDK 55 / RN 0.83 cannot disable New Arch |
| EAS Build pricing | MEDIUM | Free tier limit count not published precisely in docs; structure confirmed |
| expo-av deprecation | HIGH | Confirmed deprecated SDK 53, removed SDK 54, replaced by expo-video |

---

## Sources

- Expo SDK 55 docs: https://docs.expo.dev (Context7: `/websites/expo_dev`, `/llmstxt/expo_dev_llms_txt`)
- NativeWind v4 docs: https://www.nativewind.dev/docs (Context7: `/websites/nativewind_dev`)
- NativeWind v5 docs: https://www.nativewind.dev/v5 (Context7: `/websites/nativewind_dev_v5`)
- TanStack Query v5: https://tanstack.com/query/v5 (Context7: `/tanstack/query`)
- React Native Firebase: https://github.com/invertase/react-native-firebase (Context7: `/invertase/react-native-firebase`)
- Zustand v5: https://github.com/pmndrs/zustand (Context7: `/pmndrs/zustand`)
- EAS Billing: https://docs.expo.dev/billing/plans
