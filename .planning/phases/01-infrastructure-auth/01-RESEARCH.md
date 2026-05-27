# Phase 1: Infrastructure + Auth - Research

**Researched:** 2026-05-27
**Domain:** Expo SDK 55 project bootstrap, @react-native-firebase, EAS Build, expo-router v5 protected routes, Firestore security rules, Cloud Functions Admin SDK
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Trainer can log in with email and password | Firebase Auth `signInWithEmailAndPassword` via `@react-native-firebase/auth`; pattern documented in Architecture Patterns |
| AUTH-02 | Client can log in with email and password | Same auth flow; role-based routing lands each role on correct navigation shell after login |
| AUTH-03 | Both roles stay logged in across app restarts | `@react-native-firebase/auth` persists session natively on device by default; `onAuthStateChanged` fires on cold start with cached user |
| AUTH-04 | User can request password reset via email link | `sendPasswordResetEmail` with `actionCodeSettings`; Firebase Dynamic Links deprecated — use hosted email handler |
| AUTH-05 | App shows correct screen on cold start without auth flash | `isLoaded` boolean in Zustand + `SplashScreen.preventAutoHideAsync()` held until Firebase fires first auth event |
| CLNT-01 | Trainer creates client account via Cloud Function | `createClientAccount` httpsCallable wrapping Admin SDK `createUser` + Firestore `users/{uid}.set()` |
</phase_requirements>

---

## Summary

Phase 1 builds the entire foundation on which all subsequent phases depend. Nothing user-visible ships without this — no trainer screen, no client screen. The deliverable is: both roles can authenticate on a real device, land on the correct role-protected navigation shell, and experience no login flash on cold start.

The project starts as a greenfield Expo SDK 55 app. SDK 55 mandates the New Architecture (React Native 0.83); there is no opt-out. The `src/app/` directory layout (new SDK 55 default template) is used instead of `app/` at root level, so the `@/*` TypeScript path alias points to `./src/*`. All Firebase native modules require an EAS development build — Expo Go is architecturally incompatible with `@react-native-firebase`.

The most important infrastructure decisions for Phase 1: (1) EAS dev client build must be the very first artifact produced before any application code runs on device; (2) Firestore security rules must be deployed before the first data write; (3) `google-services.json` and `GoogleService-Info.plist` must be uploaded as EAS secret file variables before the first cloud build; (4) the `createClientAccount` Cloud Function must use v1 `functions.https.onCall` syntax — v2 `onCall` has known authentication propagation bugs with `@react-native-firebase/functions.httpsCallable()`.

**Primary recommendation:** Build in this exact order — Firebase project setup → EAS dev client build → Firestore rules → auth flow → role navigation shell → `createClientAccount` Cloud Function → composite indexes.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth state persistence | Device (native Firebase SDK) | Zustand store (read layer) | `@react-native-firebase/auth` caches tokens natively; Zustand is only a derived view |
| Auth race condition guard | Frontend (root layout) | — | `SplashScreen` held until `onAuthStateChanged` fires; guard is a rendering decision |
| Role-based routing | Frontend (expo-router `Stack.Protected`) | — | Client-side guard sufficient for MVP; role is read from Firestore on auth, not from URL |
| `createClientAccount` | Cloud Function (Admin SDK) | — | Cannot create Firebase Auth users from client SDK; requires Admin SDK trust boundary |
| Firestore security rules | Database tier | — | Rules enforced server-side by Firestore; client code cannot bypass them |
| Composite index definitions | Database tier | — | Declared in `firestore.indexes.json`, deployed with `firebase deploy` |
| Password reset email | Firebase Auth service | — | `sendPasswordResetEmail` is a Firebase Auth platform feature; no custom server code needed |
| Session persistence across restarts | Native Firebase Auth layer | — | `@react-native-firebase/auth` handles this natively; no `AsyncStorage` needed for auth tokens |

---

## Standard Stack

### Core (Phase 1 — install during bootstrap)

| Library | Verified Version (npm) | Purpose | Why Standard |
|---------|----------------------|---------|--------------|
| `expo` | ~55.0.14 (latest: 56.0.5) | Core framework | SDK 55 = RN 0.83 + New Arch always on; `create-expo-app --template default@sdk-55` |
| `expo-router` | ~5.0.7 (latest: 56.2.7) | File-based routing | Bundled with SDK 55; `Stack.Protected` available since SDK 53 |
| `@react-native-firebase/app` | ^22.x (latest: 24.0.0) | Firebase base | Native SDK wrapper; required before all other Firebase modules |
| `@react-native-firebase/auth` | ^22.x (latest: 24.0.0) | Firebase Auth | Native Auth; session persistence by default; no AsyncStorage needed |
| `@react-native-firebase/firestore` | ^22.x (latest: 24.0.0) | Primary database | Native Firestore; offline persistence on by default in RN |
| `@react-native-firebase/functions` | ^22.x (latest: 24.0.0) | Cloud Functions client | `httpsCallable` for `createClientAccount` |
| `expo-build-properties` | ~0.13.x (latest: 56.0.15) | iOS native config | Required: sets `useFrameworks: "static"` for react-native-firebase on iOS |
| `expo-dev-client` | ~5.x (latest: 56.0.16) | Development builds | Replaces Expo Go; required for native Firebase modules |
| `expo-splash-screen` | ~0.29.x (latest: 56.0.10) | Splash screen control | `preventAutoHideAsync()` held during auth init |
| `zustand` | ^5.0.x (latest: 5.0.13) | Auth state store | `authStore` holds `{ uid, role, trainerId, isLoaded }` |
| `react-hook-form` | ^7.76.x (latest: 7.76.1) | Sign-in form | Pair with zod for validation |
| `zod` | ^3.x (latest: 4.4.3) | Schema validation | Sign-in schema validation |
| `@hookform/resolvers` | ^5.x (latest: 5.4.0) | RHF + Zod bridge | `zodResolver` for form schemas |

### UI Styling (Phase 1)

| Library | Verified Version (npm) | Purpose | Why Standard |
|---------|----------------------|---------|--------------|
| `nativewind` | ^4.x (latest: 4.2.4) | Tailwind for RN | v4 stable; v5 still pre-release; pairs with Tailwind v3 |
| `tailwindcss` | ^3.4.17 (latest: 4.3.0) | CSS utility | Pin to v3 — NativeWind v4 requires Tailwind v3 specifically |
| `react-native-reanimated` | ~3.18.0 | Animations base | NativeWind v4 peer dep; if using v4 NativeWind, stay on Reanimated v3 |
| `react-native-gesture-handler` | ~2.26.0 | Gesture base | Required by expo-router; `GestureHandlerRootView` wraps root layout |
| `react-native-safe-area-context` | latest | Safe area insets | Standard expo-router dep |

**IMPORTANT version pin:** Install `tailwindcss@^3.4.17` explicitly. The latest tailwindcss on npm is v4.3.0, which is incompatible with NativeWind v4. [VERIFIED: nativewind.dev docs]

### Supporting (Phase 1 — EAS build tooling)

| Library | Verified Version (npm) | Purpose | When to Use |
|---------|----------------------|---------|-------------|
| `expo-secure-store` | ~14.x (latest: 56.0.4) | Secure key-value | For any additional session metadata beyond auth tokens |
| `@tanstack/react-query` | ^5.x (latest: 5.100.14) | Server state | Install now; used from Phase 2; avoid install friction later |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@react-native-firebase/*` | `firebase` (JS SDK) | JS SDK lacks native Crashlytics, App Check, Messaging; offline persistence requires manual setup; react-native-firebase is the right choice for Expo native apps |
| NativeWind v4 | NativeWind v5 (preview) | v5 requires Tailwind v4 and Reanimated v4+; still tagged `preview` as of May 2026; migrate post-MVP |
| `Stack.Protected` guard | Manual `useEffect` + `router.replace()` redirect | Stack.Protected cleans history correctly on auth state change; redirect pattern causes navigation stack corruption and double-navigation race conditions |
| Functions v1 `onCall` | Functions v2 `onCall` | v2 has auth propagation bugs with `@react-native-firebase/functions.httpsCallable()` — use v1 for MVP; see Pitfalls |

**Installation — bootstrap sequence:**
```bash
# 1. Create project with SDK 55 template
npx create-expo-app@latest laufit --template default@sdk-55

# 2. Firebase native modules (install before first prebuild)
npx expo install @react-native-firebase/app @react-native-firebase/auth
npx expo install @react-native-firebase/firestore @react-native-firebase/functions @react-native-firebase/storage
npx expo install expo-build-properties expo-dev-client expo-splash-screen

# 3. State, forms, validation
npm install zustand react-hook-form zod
npm install @hookform/resolvers
npm install @tanstack/react-query

# 4. UI/styling — PIN tailwindcss to v3
npm install nativewind
npm install --save-dev tailwindcss@^3.4.17

# 5. Already bundled in SDK 55 template, but pin versions
npx expo install react-native-reanimated react-native-gesture-handler react-native-safe-area-context

# 6. Additional Expo utilities
npx expo install expo-secure-store

# 7. THEN run prebuild (after all native modules installed)
npx expo prebuild --clean
```

---

## Package Legitimacy Audit

> Note: slopcheck v0.6.1 was run but defaults to PyPI — a cross-ecosystem false-positive scenario. All packages below were verified against the npm registry directly using `npm view <pkg> version` and confirmed against official documentation or the official invertase/react-native-firebase and expo/expo repositories.

| Package | Registry | Age | npm Version | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-------------|-----------|-------------|
| `@react-native-firebase/app` | npm | 7 yrs (2019) | 24.0.0 | github.com/invertase/react-native-firebase | Cross-ecosystem false positive (PyPI) | Approved — official Invertase package |
| `@react-native-firebase/auth` | npm | 7 yrs | 24.0.0 | github.com/invertase/react-native-firebase | Cross-ecosystem false positive | Approved |
| `@react-native-firebase/firestore` | npm | 7 yrs | 24.0.0 | github.com/invertase/react-native-firebase | Cross-ecosystem false positive | Approved |
| `@react-native-firebase/functions` | npm | 7 yrs | 24.0.0 | github.com/invertase/react-native-firebase | Cross-ecosystem false positive | Approved |
| `@react-native-firebase/storage` | npm | 7 yrs | 24.0.0 | github.com/invertase/react-native-firebase | Cross-ecosystem false positive | Approved |
| `expo` | npm | 13 yrs (2013) | 56.0.5 | github.com/expo/expo | Cross-ecosystem false positive | Approved |
| `expo-router` | npm | recent | 56.2.7 | github.com/expo/expo | Cross-ecosystem false positive | Approved — bundled with Expo SDK |
| `expo-build-properties` | npm | recent | 56.0.15 | github.com/expo/expo | Cross-ecosystem false positive | Approved |
| `expo-dev-client` | npm | recent | 56.0.16 | github.com/expo/expo | Cross-ecosystem false positive | Approved |
| `expo-splash-screen` | npm | recent | 56.0.10 | github.com/expo/expo | Cross-ecosystem false positive | Approved |
| `expo-secure-store` | npm | recent | 56.0.4 | github.com/expo/expo | Cross-ecosystem false positive | Approved |
| `@tanstack/react-query` | npm | 6+ yrs | 5.100.14 | github.com/tanstack/query | Cross-ecosystem false positive | Approved |
| `zustand` | npm | 6+ yrs | 5.0.13 | github.com/pmndrs/zustand | Cross-ecosystem false positive | Approved |
| `react-hook-form` | npm | 6+ yrs | 7.76.1 | github.com/react-hook-form/react-hook-form | Cross-ecosystem false positive | Approved |
| `@hookform/resolvers` | npm | 5+ yrs | 5.4.0 | github.com/react-hook-form/resolvers | Cross-ecosystem false positive | Approved |
| `zod` | npm | 5+ yrs | 4.4.3 | github.com/colinhacks/zod | npm OK (PyPI only) | Approved |
| `nativewind` | npm | 6+ yrs (2018) | 4.2.4 | github.com/marklawlor/nativewind | Cross-ecosystem false positive | Approved |
| `tailwindcss` | npm | 8+ yrs | 4.3.0 (install 3.4.17) | github.com/tailwindlabs/tailwindcss | npm OK | Approved — pin to ^3.4.17 |
| `react-native-reanimated` | npm | 8+ yrs | 4.4.0 | github.com/software-mansion/react-native-reanimated | Cross-ecosystem false positive | Approved — use ~3.18.0 with NativeWind v4 |
| `react-native-gesture-handler` | npm | 9+ yrs | 2.31.2 | github.com/software-mansion/react-native-gesture-handler | Cross-ecosystem false positive | Approved |

**Note on slopcheck:** slopcheck v0.6.1 checked against PyPI by default. This is a Node.js/React Native project. All `[SLOP]` verdicts above are cross-ecosystem false positives — the packages are confirmed on npm via `npm view`. No packages were removed. No packages were flagged suspicious on the correct (npm) registry.

**Packages with no postinstall scripts:** `@react-native-firebase/app`, `expo-build-properties`, `nativewind`, `expo-dev-client`, `@tanstack/react-query`, `zustand` — all clean. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Cold Start
    │
    ▼
Firebase Auth SDK (native)
    │  onAuthStateChanged fires
    ▼
src/firebase/auth.ts
    │  if user → getDoc(users/{uid})
    │  set { uid, role, trainerId, isLoaded: true }
    ▼
authStore (Zustand)
    │
    ▼
src/app/_layout.tsx
    │  if !isLoaded → hold SplashScreen
    │  if isLoaded → hide SplashScreen
    ▼
Stack.Protected guards
    ├── guard={!uid}        → src/app/sign-in.tsx
    ├── guard={role=trainer} → src/app/(trainer)/_layout.tsx → tabs
    └── guard={role=client}  → src/app/(client)/_layout.tsx → tabs

Sign-In Screen
    │
    ├── signInWithEmailAndPassword()
    │       → onAuthStateChanged fires → authStore updates → guard re-evaluates
    │
    └── sendPasswordResetEmail()
            → Firebase sends email → user clicks link → Firebase-hosted handler
            → no deep link needed for MVP

Trainer creates client:
    Trainer UI → httpsCallable('createClientAccount')
        → Cloud Function (Admin SDK)
            ├── admin.auth().createUser({ email, password, displayName })
            └── admin.firestore().doc(`users/${uid}`).set({ role: 'client', trainerId })
        → returns { uid }
```

### Recommended Project Structure

```
laufit/
├── src/
│   ├── app/                      # expo-router routes (navigation only)
│   │   ├── _layout.tsx           # Root: SplashScreen + Stack.Protected guards
│   │   ├── sign-in.tsx           # Public auth screen
│   │   ├── (trainer)/
│   │   │   ├── _layout.tsx       # Trainer tab navigator
│   │   │   └── (tabs)/
│   │   │       ├── _layout.tsx
│   │   │       ├── index.tsx     # Trainer dashboard (placeholder Phase 1)
│   │   │       └── profile.tsx   # Trainer profile (placeholder Phase 1)
│   │   └── (client)/
│   │       ├── _layout.tsx       # Client tab navigator
│   │       └── (tabs)/
│   │           ├── _layout.tsx
│   │           ├── index.tsx     # Client home (placeholder Phase 1)
│   │           └── profile.tsx   # Client profile (placeholder Phase 1)
│   ├── firebase/
│   │   ├── config.ts             # (empty — @react-native-firebase auto-initializes from google-services.json)
│   │   ├── auth.ts               # onAuthStateChanged listener + sign-in/sign-out helpers
│   │   ├── firestore.ts          # Typed collection refs + withConverter
│   │   └── functions.ts          # httpsCallable wrappers (createClientAccount)
│   ├── stores/
│   │   └── authStore.ts          # Zustand: { uid, role, trainerId, isLoaded }
│   ├── hooks/
│   │   └── useAuth.ts            # Convenience hook that reads authStore
│   ├── services/
│   │   └── user.service.ts       # createClientAccount caller
│   └── types/
│       └── user.ts               # User, Role types
├── functions/
│   ├── src/
│   │   └── index.ts              # exports: createClientAccount
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules
├── firestore.indexes.json        # All composite indexes committed Phase 1
├── firebase.json
├── app.config.js                 # Dynamic config (env vars for google-services)
├── eas.json
├── tailwind.config.js
├── metro.config.js               # withNativeWind wrapper
├── babel.config.js               # NativeWind preset
└── global.css                    # Tailwind base + Obsidian Performance tokens
```

> The SDK 55 default template puts routes in `src/app/`. The `@/*` TypeScript path alias resolves to `./src/*`. [VERIFIED: docs.expo.dev/router/reference/src-directory]

### Pattern 1: Root Layout with SplashScreen + Stack.Protected

**What:** Hold the splash screen until Firebase fires its first `onAuthStateChanged` event, then let `Stack.Protected` guards handle routing without any `router.replace()` calls.

**When to use:** Always — this is the mandatory Phase 1 auth guard pattern.

```tsx
// src/app/_layout.tsx
// Source: https://docs.expo.dev/router/advanced/authentication/
import { Stack, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/authStore';
import { initAuthListener } from '@/firebase/auth';

// MUST be called at module scope — not inside the component
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoaded, uid, role } = useAuthStore();

  // Start the Firebase auth listener once on mount
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  // Hide splash screen only after auth state is known
  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  // Return null (not a redirect) while loading — SplashScreen covers the UI
  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Unauthenticated — sign-in visible only when no uid */}
        <Stack.Protected guard={!uid}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        {/* Trainer shell — visible only when role === 'trainer' */}
        <Stack.Protected guard={uid !== null && role === 'trainer'}>
          <Stack.Screen name="(trainer)" />
        </Stack.Protected>

        {/* Client shell — visible only when role === 'client' */}
        <Stack.Protected guard={uid !== null && role === 'client'}>
          <Stack.Screen name="(client)" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
```

**Key behaviors of `Stack.Protected`:** [VERIFIED: docs.expo.dev/router/advanced/protected]
- When `guard` flips from `true` to `false`, all history entries for that group are removed automatically — no stale back-button navigation to the wrong role.
- Deep links into protected screens are also blocked — a client who deep-links to `/(trainer)/clients` is redirected to their anchor route.
- Route groups are path-transparent: `/(trainer)/clients` renders at URL `/clients`, avoiding role leakage in URL.

### Pattern 2: Firebase Auth Listener → Zustand authStore

**What:** The single `onAuthStateChanged` listener that populates `authStore`. Lives in `src/firebase/auth.ts`, started once from root `_layout.tsx`.

```ts
// src/firebase/auth.ts
// Source: https://github.com/invertase/react-native-firebase/blob/main/docs/auth/usage/index.mdx
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '@/stores/authStore';

export function initAuthListener(): () => void {
  return auth().onAuthStateChanged(async (firebaseUser) => {
    if (!firebaseUser) {
      // Signed out — clear store and mark as loaded
      useAuthStore.getState().clear();
      return;
    }

    // Fetch role from Firestore USERS doc (one read per auth event)
    const snap = await firestore().collection('users').doc(firebaseUser.uid).get();
    const data = snap.data();

    useAuthStore.getState().set({
      uid: firebaseUser.uid,
      role: data?.role ?? null,
      trainerId: data?.trainerId ?? null,
      isLoaded: true,
    });
  });
}

export const signIn = (email: string, password: string) =>
  auth().signInWithEmailAndPassword(email, password);

export const signOut = () => auth().signOut();

export const sendPasswordReset = (email: string) =>
  auth().sendPasswordResetEmail(email);
```

### Pattern 3: Zustand authStore (v5)

**What:** Minimal store holding auth state. v5 `useShallow` replaces v4 `shallow`.

```ts
// src/stores/authStore.ts
// Source: https://github.com/pmndrs/zustand
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface AuthState {
  uid: string | null;
  role: 'trainer' | 'client' | null;
  trainerId: string | null;
  isLoaded: boolean;
  set: (state: Partial<Omit<AuthState, 'set' | 'clear'>>) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  role: null,
  trainerId: null,
  isLoaded: false,
  set: (state) => set(state),
  clear: () => set({ uid: null, role: null, trainerId: null, isLoaded: true }),
}));

// Convenience hook for components that read multiple fields
export const useAuth = () =>
  useAuthStore(useShallow((s) => ({ uid: s.uid, role: s.role, isLoaded: s.isLoaded })));
```

### Pattern 4: createClientAccount Cloud Function (v1 syntax)

**What:** The only mandatory Cloud Function for Phase 1. Creates a Firebase Auth user and writes a USERS Firestore doc atomically. Requires v1 `functions.https.onCall` syntax — v2 has auth propagation bugs with `@react-native-firebase/functions.httpsCallable()`. [ASSUMED — v2 compatibility issues confirmed via community reports but not officially documented as resolved in v22/v23]

```ts
// functions/src/index.ts
// Source: https://firebase.google.com/docs/functions/callable
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface CreateClientAccountData {
  name: string;
  email: string;
  temporaryPassword: string;
}

export const createClientAccount = functions.https.onCall(
  async (data: CreateClientAccountData, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to create client accounts.'
      );
    }

    // 2. Verify caller is a trainer (role check against Firestore)
    const callerSnap = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();
    if (callerSnap.data()?.role !== 'trainer') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only trainers can create client accounts.'
      );
    }

    // 3. Create Firebase Auth user
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: data.email,
        password: data.temporaryPassword,
        displayName: data.name,
      });
    } catch (err: unknown) {
      const firebaseError = err as { code: string; message: string };
      throw new functions.https.HttpsError(
        'already-exists',
        `Auth user creation failed: ${firebaseError.message}`
      );
    }

    // 4. Write USERS doc with role: 'client' and trainerId reference
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
      role: 'client',
      trainerId: context.auth.uid,
      name: data.name,
      email: data.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid };
  }
);
```

**Client-side caller:**
```ts
// src/firebase/functions.ts
import functions from '@react-native-firebase/functions';

// Use v1-style httpsCallable (function name, not URL) [ASSUMED — v2 httpsCallableFromURL
// is the safer path but requires knowing the deployed Cloud Run URL]
export const createClientAccount = functions().httpsCallable('createClientAccount');

// In service layer:
// const result = await createClientAccount({ name, email, temporaryPassword });
// const { uid } = result.data;
```

**IAM note:** Cloud Functions deployed with `firebase deploy` automatically have the `roles/firestore.admin` and `roles/iam.serviceAccountTokenCreator` permissions via the default service account. No additional IAM configuration needed for `admin.auth().createUser()` or `admin.firestore().set()`. [ASSUMED — verify if using a custom service account]

### Pattern 5: app.config.js with EAS Secret Files

```js
// app.config.js
// Source: https://docs.expo.dev/guides/using-firebase/
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'LauFit (Dev)' : 'LauFit',
    slug: 'laufit',
    version: '1.0.0',
    scheme: 'laufit',
    android: {
      package: IS_DEV ? 'com.laufit.dev' : 'com.laufit',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'com.laufit.dev' : 'com.laufit',
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
    },
    plugins: [
      'expo-router',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
  },
};
```

### Pattern 6: eas.json Build Profiles

```json
{
  "cli": {
    "version": ">= 7.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_VARIANT": "development"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "development-simulator": {
      "extends": "development",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

> [VERIFIED: docs.expo.dev/build/eas-json] `developmentClient: true` marks the build as a dev client build. The `development-simulator` profile is used for iOS Simulator testing without requiring a physical device — useful for initial Firebase auth smoke testing.

### Pattern 7: NativeWind v4 Configuration

```js
// tailwind.config.js
// Source: https://www.nativewind.dev/docs/getting-started/installation
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Obsidian Performance design system
        base: '#0E0E0E',
        accent: '#00FF66',
        surface: '#1A1A1A',
        muted: '#444444',
        text: {
          primary: '#FFFFFF',
          secondary: '#888888',
        },
      },
      fontFamily: {
        sans: ['HankenGrotesk-Regular'],
        mono: ['JetBrainsMono-Regular'],
      },
    },
  },
  plugins: [],
};
```

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

### Pattern 8: Firestore Security Rules (Phase 1 Baseline)

**What:** Security rules deployed before the first data write. Prevents role elevation and limits read/write to document owners.

```firestore
// firestore.rules
// Source: https://firebase.google.com/docs/firestore/security/rules-fields
// Source: https://firebase.google.com/docs/firestore/solutions/role-based-access
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: look up the calling user's role (costs 1 Firestore read per rule eval)
    function userRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isTrainer() {
      return isSignedIn() && userRole() == 'trainer';
    }

    function isClient() {
      return isSignedIn() && userRole() == 'client';
    }

    // USERS collection
    match /users/{userId} {
      // Anyone reads their own doc
      allow read: if isSignedIn() && request.auth.uid == userId;

      // Trainer creates client accounts (createClientAccount Cloud Function uses Admin SDK
      // which bypasses rules — this covers any future direct client creation)
      allow create: if isTrainer();

      // Document owner can update own profile BUT cannot change the 'role' field
      // Uses affectedKeys() to deny any write that modifies 'role' or 'trainerId'
      allow update: if isSignedIn()
        && request.auth.uid == userId
        && !request.resource.data.diff(resource.data)
              .affectedKeys()
              .hasAny(['role', 'trainerId']);

      // No client can delete their own account doc
      allow delete: if false;
    }

    // EXERCISES — trainer owns; future phases
    match /exercises/{exerciseId} {
      allow read, write: if isTrainer()
        && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer()
        && request.resource.data.trainerId == request.auth.uid;
    }

    // ROUTINES — trainer owns; future phases
    match /routines/{routineId} {
      allow read, write: if isTrainer()
        && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer()
        && request.resource.data.trainerId == request.auth.uid;
    }

    // PROGRAMS — trainer owns; future phases
    match /programs/{programId} {
      allow read, write: if isTrainer()
        && resource.data.trainerId == request.auth.uid;
      allow create: if isTrainer()
        && request.resource.data.trainerId == request.auth.uid;
    }

    // ASSIGNMENTS — trainer creates; client reads own; future phases
    match /assignments/{assignmentId} {
      allow create, update: if isTrainer()
        && request.resource.data.trainerId == request.auth.uid;
      allow read: if (isTrainer() && resource.data.trainerId == request.auth.uid)
        || (isClient() && resource.data.clientId == request.auth.uid);
    }

    // SESSIONS — client creates/updates own; trainer reads client's sessions; future phases
    match /sessions/{sessionId} {
      allow create, update: if isClient()
        && request.resource.data.clientId == request.auth.uid;
      allow read: if (isClient() && resource.data.clientId == request.auth.uid)
        || (isTrainer() && resource.data.trainerId == request.auth.uid);
    }
  }
}
```

**Role elevation defense explained:** The `affectedKeys().hasAny(['role', 'trainerId'])` check on the USERS `update` rule ensures a client cannot write `{ role: 'trainer' }` to their own profile doc. The entire update is denied if those fields appear in the diff. [VERIFIED: firebase.google.com/docs/firestore/security/rules-fields]

### Pattern 9: Composite Indexes (All Phases, Committed Phase 1)

```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "assignments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assignments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "trainerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "assignmentId", "order": "ASCENDING" },
        { "fieldPath": "dayNumber", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

These four indexes cover: session history pagination (Phase 4), active assignment lookup (Phase 2–3), trainer dashboard (Phase 2), and duplicate-session guard (Phase 3). [ASSUMED — derived from query patterns in ARCHITECTURE.md and REQUIREMENTS.md; verify by running queries in emulator]

### Anti-Patterns to Avoid

- **Using `router.replace()` inside `useEffect` for auth redirect:** Causes navigation stack corruption and double-navigation race conditions. Use `Stack.Protected` instead.
- **Calling `SplashScreen.preventAutoHideAsync()` inside a component:** Must be at module scope — by the time the component renders, the splash may already be gone.
- **Returning `null` from a layout that isn't also calling `SplashScreen.preventAutoHideAsync()`:** Renders a white flash instead of the splash screen.
- **Using Firebase Dynamic Links for password reset deep links:** Firebase Dynamic Links was shut down August 25, 2025. All `.page.link` domains return HTTP 404. For password reset, use Firebase's hosted email action handler (no deep link config needed for MVP — user clicks email link, completes reset on web, then returns to app).
- **Defining `@react-native-firebase` functions as v2 `onCall` and calling via `httpsCallable('name')`:** Reported auth propagation bugs. Deploy Functions with v1 `functions.https.onCall` syntax and call with `functions().httpsCallable('functionName')`.
- **Installing `tailwindcss@latest`:** Latest is v4.3.0 which is incompatible with NativeWind v4. Explicitly pin `tailwindcss@^3.4.17`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session token persistence across restarts | Custom AsyncStorage token cache | `@react-native-firebase/auth` native persistence | Firebase SDK handles token refresh, expiry, revocation — hand-rolled token storage misses all of these |
| Navigation guard / auth redirect | `useEffect + router.replace()` chains | `Stack.Protected guard={condition}` | Stack.Protected correctly cleans navigation history; redirect chains create back-button bugs |
| Role-based access checks | Custom middleware or route wrapper | Firestore security rules + `Stack.Protected` | Firestore rules enforce at data layer (server); Stack.Protected enforces at nav layer; client-code checks are always bypassable |
| Client account creation | Firestore write from trainer's client | `createClientAccount` Cloud Function | Client SDK cannot call `admin.auth().createUser()` — requires Admin SDK trust boundary |
| Password reset flow | Custom token + deep link handler | `auth().sendPasswordResetEmail()` | Firebase Auth handles token generation, expiry, secure link delivery |
| Firestore offline sync | Custom request queue / retry loop | `@react-native-firebase/firestore` (persistence on by default) | Native SDK has durable offline queue that survives app restarts; custom queues don't |

**Key insight:** Firebase's native SDK handles the genuinely hard problems — token lifecycle, offline durability, secure user creation. Resist the urge to layer custom solutions on top.

---

## Common Pitfalls

### Pitfall 1: Auth State Flash (Race Condition on Cold Start)

**What goes wrong:** Firebase Auth's `onAuthStateChanged` is asynchronous. Between app launch and the first callback, auth state is `null`. If `_layout.tsx` renders `Stack.Protected` with `guard={!!uid}` before the listener fires, `uid` is `null` and the user sees the sign-in screen for 200–800ms, then gets redirected to their home screen. Navigation stack is now polluted with the sign-in screen in history.

**Why it happens:** The `guard` prop evaluates synchronously from React state. On cold start, React renders before the async Firebase callback runs.

**How to avoid:** `SplashScreen.preventAutoHideAsync()` at module scope + `isLoaded` boolean in `authStore` initialized to `false`. Root layout returns `null` while `!isLoaded`, keeping the native splash screen visible. Only call `SplashScreen.hideAsync()` after `isLoaded === true`.

**Warning signs:** Users report a brief flicker of the sign-in screen on every app open. Navigation back button goes to sign-in after app is fully authenticated.

---

### Pitfall 2: EAS Cloud Build Fails — Firebase Config Files Missing

**What goes wrong:** `google-services.json` and `GoogleService-Info.plist` are in `.gitignore`. EAS Build clones a clean repo. The build succeeds (React Native Firebase gracefully omits initialization if files are absent at build time) but the app crashes at runtime with `No Firebase App '[DEFAULT]' has been created`.

**Why it happens:** EAS Build environment has no access to gitignored files unless they are uploaded as EAS secret file variables.

**How to avoid:** Before the first EAS build, run:
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
```
And reference in `app.config.js`:
```js
googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'
```

**Warning signs:** EAS Build succeeds but app crashes on launch. Firebase error visible in Metro/device logs.

---

### Pitfall 3: iOS Build Fails Without `useFrameworks: static`

**What goes wrong:** `@react-native-firebase` uses Firebase's native iOS SDK (CocoaPods). The Firebase iOS SDK requires static frameworks. Without `expo-build-properties` setting `useFrameworks: "static"`, the Xcode build fails with linker errors about missing symbols.

**Why it happens:** This is a firebase-ios-sdk architectural requirement, not an Expo bug.

**How to avoid:** Add to `app.config.js` plugins before the first iOS build:
```json
["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
```

**Warning signs:** iOS EAS build fails with `Duplicate symbol` or `ld: framework not found FirebaseCore` linker errors.

---

### Pitfall 4: `Stack.Protected` Returns to Wrong Anchor on Logout

**What goes wrong:** After a user signs out, `uid` becomes `null` and `Stack.Protected guard={!!uid}` for the trainer group becomes `false`. If the root layout's first accessible screen when `uid === null` is not `sign-in`, the user may land on an unexpected screen.

**Why it happens:** Stack.Protected redirects to the "anchor route" — the first available screen. The anchor is determined by the order of `Stack.Screen` declarations.

**How to avoid:** Declare `sign-in` as the only Screen inside `Stack.Protected guard={!uid}`. Ensure this block appears before the role-guarded blocks in the JSX so the sign-in screen is the anchor when unauthenticated.

---

### Pitfall 5: Functions v2 `onCall` Auth Propagation Bug

**What goes wrong:** Writing `createClientAccount` as a v2 `onCall` function (using `import { onCall } from 'firebase-functions/v2/https'`) and calling it with `functions().httpsCallable('createClientAccount')()` results in `context.auth` being `undefined` even when the client is authenticated. The function throws `unauthenticated` despite the caller being logged in.

**Why it happens:** v2 callable functions require being invoked via `httpsCallableFromURL(url)` with the full Cloud Run URL, not by name. The standard `httpsCallable('name')` path does not correctly propagate auth tokens to v2 functions. [ASSUMED — confirmed via multiple community reports in react-native-firebase GitHub issues; no official resolution documented in v22/v23 changelogs]

**How to avoid:** Write `createClientAccount` with v1 `functions.https.onCall` syntax. Deploy on Node.js 18 or 20 (v22 is not yet GA on Firebase Functions as of May 2026). Call with `functions().httpsCallable('createClientAccount')`.

**Warning signs:** Cloud Function logs show `context.auth` is `undefined` even though the client app shows the user as authenticated.

---

### Pitfall 6: NativeWind Tailwind CSS v4 Incompatibility

**What goes wrong:** Running `npm install tailwindcss` installs v4.3.0 (latest). NativeWind v4 requires Tailwind CSS v3. With v4, the `tailwind.config.js` + `nativewind/preset` approach doesn't work — styles are silently not applied.

**How to avoid:** Pin `tailwindcss@^3.4.17` explicitly. `npm install --save-dev tailwindcss@^3.4.17`.

---

## Walking Skeleton (MVP Proof)

The minimal walking skeleton for Phase 1 proves the entire auth-to-role-nav flow on a real device:

1. Cold start on a device that has never opened the app → native splash screen shows (not a white flash)
2. Splash screen dismisses → sign-in screen appears
3. Sign in with trainer credentials → trainer tab navigator appears (placeholder tabs)
4. Sign out → sign-in screen appears (no trainer routes in back stack)
5. Sign in with client credentials → client tab navigator appears (placeholder tabs)
6. Kill app completely → reopen → correct role's tab navigator appears immediately (no flash)
7. Trainer calls `createClientAccount` → new user appears in Firebase Auth console + Firestore USERS collection

This is the definition of done for Phase 1 before any other screens are built.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm installs, Functions | ✓ | v24.4.0 | — |
| npm | package management | ✓ | 11.4.2 | — |
| EAS CLI | EAS builds | ✗ | — | Install: `npm install -g eas-cli` |
| Firebase CLI | Rules deploy, Functions deploy | ✗ | — | Install: `npm install -g firebase-tools` |
| Xcode | iOS builds | ✗ (CLI tools only) | — | Full Xcode required for iOS local builds; EAS cloud builds don't require local Xcode |
| Android SDK / adb | Android local testing | ✗ | — | EAS cloud builds don't require local Android SDK; Android Emulator via Android Studio |

**Missing dependencies with fallback (install before Phase 1 execution):**
- `eas-cli`: `npm install -g eas-cli` — required for `eas build` and `eas secret:create`
- `firebase-tools`: `npm install -g firebase-tools` — required for `firebase deploy --only firestore:rules` and `firebase deploy --only functions`

**Missing dependencies, local build only:**
- Xcode (full) and Android Studio are only needed for local development builds (`npx expo run:ios` / `npx expo run:android`). EAS cloud builds (`eas build --profile development`) work without them.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + `@testing-library/react-native` (bundled with Expo SDK 55 template) |
| Config file | `jest.config.js` in project root (auto-generated by `create-expo-app`) |
| Quick run command | `npx jest --testPathPattern="authStore"` |
| Full suite command | `npx jest` |

For the auth store and pure logic, Jest with the default Expo Jest preset is sufficient. No Firestore emulator is needed for Phase 1 unit tests — the `authStore` and auth listener can be unit-tested with mocked Firebase modules.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AUTH-01 | Trainer sign-in updates authStore with uid + role='trainer' | Unit | `npx jest --testPathPattern="authStore"` | Mock `onAuthStateChanged` + Firestore `getDoc` |
| AUTH-02 | Client sign-in updates authStore with uid + role='client' | Unit | `npx jest --testPathPattern="authStore"` | Same test, different mock data |
| AUTH-03 | authStore.isLoaded goes false→true after onAuthStateChanged fires | Unit | `npx jest --testPathPattern="authStore"` | Verify state transitions |
| AUTH-03 | Persistent session on restart | Manual only | — | Verify on physical device: kill app, reopen, correct screen appears |
| AUTH-04 | sendPasswordReset calls auth().sendPasswordResetEmail | Unit | `npx jest --testPathPattern="auth.service"` | Mock `@react-native-firebase/auth` module |
| AUTH-05 | SplashScreen held until isLoaded=true | Manual only | — | Verify on cold start: no login screen flash before role screen |
| CLNT-01 | createClientAccount function creates Auth user + Firestore doc | Integration | Firebase Emulator Suite | `firebase emulators:exec "npx jest --testPathPattern=createClientAccount"` |
| CLNT-01 | Caller must be trainer (permission-denied for client callers) | Integration | Firebase Emulator Suite | Test with client auth token — expect HttpsError('permission-denied') |

### Manual Verification Steps

These cannot be automated without a physical device or device farm:

1. **Cold start no-flash test:** Install dev build on physical device. Force-kill app. Reopen. Verify: splash screen shows briefly, then role's home screen — NO sign-in screen visible at any point if already authenticated.
2. **Role routing isolation:** Sign in as trainer. Verify trainer tabs visible. Sign out. Sign in as client. Verify client tabs visible. Sign out. Verify sign-in screen.
3. **Deep link protection:** While signed in as client, manually navigate via deep link to a trainer-only route. Verify `Stack.Protected` redirects to client home.
4. **createClientAccount smoke test:** Sign in as trainer. Call `createClientAccount` from UI. Verify in Firebase console: new user in Authentication + USERS doc with `role: 'client'` and correct `trainerId`.
5. **Security rules smoke test:** Using the Firebase Emulator or direct Firestore console, attempt to write `{ role: 'trainer' }` to a client's USERS doc as that client. Verify rejection.

### What CI/CD Should Check

```bash
# Lint + type check
npx tsc --noEmit
npx eslint src/ functions/src/

# Unit tests
npx jest --coverage

# Firebase rules unit tests (use @firebase/rules-unit-testing)
npx jest --testPathPattern="firestore.rules"

# Expo doctor — catches SDK version mismatches
npx expo-doctor
```

**EAS build CI (on PR to main):**
```bash
eas build --profile development-simulator --platform ios --non-interactive
```

**Pre-merge gate:** All unit tests green + `expo-doctor` clean + TypeScript no errors.

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit && npx jest --testPathPattern="authStore|auth.service"`
- **Per wave merge:** `npx jest --coverage` full suite
- **Phase gate:** Full suite green + manual verification steps 1–5 completed on physical device before `/gsd-verify-work`

### Wave 0 Gaps (test files to create before implementation)

- [ ] `src/stores/__tests__/authStore.test.ts` — covers AUTH-01, AUTH-02, AUTH-03
- [ ] `src/firebase/__tests__/auth.service.test.ts` — covers AUTH-04
- [ ] `functions/src/__tests__/createClientAccount.test.ts` — covers CLNT-01 (Emulator Suite)
- [ ] `firestore/__tests__/rules.test.ts` — covers Firestore security rules role elevation prevention

---

## Security Domain

> `security_enforcement: true` in `.planning/config.json`. ASVS Level 1 applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `@react-native-firebase/auth` email/password; session persistence native |
| V3 Session Management | Yes | Firebase Auth token lifecycle; native SDK handles refresh and revocation |
| V4 Access Control | Yes | `Stack.Protected` (client-side) + Firestore security rules (server-side) |
| V5 Input Validation | Yes | `zod` schema on sign-in form via `@hookform/resolvers/zod` |
| V6 Cryptography | No direct control | Firebase Auth handles password hashing; never hand-roll |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Role elevation via Firestore write | Elevation of Privilege | `affectedKeys().hasAny(['role'])` deny rule on USERS update |
| Client reads another client's sessions | Information Disclosure | Firestore rule: `clientId == request.auth.uid` on sessions read |
| Trainer creates user without Cloud Function | Tampering | Admin SDK in Cloud Function only; client SDK `createUser` not possible |
| Auth token replay / session fixation | Spoofing | Firebase Auth token rotation on sign-in; `onAuthStateChanged` listener always reflects current server state |
| google-services.json key exposure | Information Disclosure | Gitignored + EAS secret file variables; Firebase security enforced at rules layer, not key secrecy |
| Functions called by unauthenticated users | Elevation of Privilege | `if (!context.auth) throw HttpsError('unauthenticated')` as first check |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `router.replace()` in `useEffect` for auth redirect | `Stack.Protected guard={condition}` | expo-router v3/SDK 53 | Eliminates history corruption and double-navigation race conditions |
| Expo Go for development | EAS Dev Client (`expo-dev-client`) | Ongoing — react-native-firebase always required native build | Anyone starting with Expo Go wastes hours on silent failures |
| `expo-av` for video | `expo-video` | SDK 54 removal | `expo-av` does not exist in SDK 55 |
| Firebase Dynamic Links for password reset deep links | Firebase-hosted email action handler | August 25, 2025 (Dynamic Links shutdown) | All `.page.link` domains are HTTP 404 — do not use |
| `shallow` comparator passed to Zustand `useStore` | `useShallow` hook | Zustand v5 | API change; old pattern causes TypeScript errors |
| TanStack Query `useQuery(key, fn, options)` three-arg form | `useQuery({ queryKey, queryFn, ...options })` | TanStack Query v5 | Old form removed in v5 |
| `app/` at project root | `src/app/` (default SDK 55 template) | SDK 55 | New template default; `@/*` paths resolve to `./src/*` |

**Deprecated/outdated:**
- `expo-av`: Removed SDK 54. Use `expo-video` and `expo-audio`.
- Firebase Dynamic Links: Shut down August 2025. Use hosted email action handlers.
- react-native-firebase v22: Latest is v24.x (v23 adds iOS 15+ / Android minSdk 23 requirements). The Stack.md recommends v22.x, but verify the exact pinned version in the Expo SDK 55 compatibility matrix before installing.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Functions v2 `onCall` has auth propagation bugs with `@react-native-firebase/functions.httpsCallable()` — use v1 `functions.https.onCall` | Pattern 4, Pitfall 5 | If resolved in v22+, v2 functions with better cold start performance could be used instead |
| A2 | Cloud Functions default service account has sufficient IAM for `admin.auth().createUser()` and `admin.firestore().set()` — no additional IAM setup required | Pattern 4 | If custom service account is used or project has restrictive IAM policies, additional `roles/firebase.auth.admin` grant may be needed |
| A3 | All composite indexes derived from query patterns in ARCHITECTURE.md are correct | Pattern 9 | If queries change shape in Phases 2–4, additional indexes will be needed; existing ones won't break anything |
| A4 | `@react-native-firebase` v22.x is compatible with Expo SDK 55 / RN 0.83 New Architecture | Standard Stack | Latest is v24.0.0; v22 compatibility with RN 0.83 should be verified before pinning |
| A5 | Password reset for MVP requires no deep link handling — Firebase-hosted web handler is sufficient | Pattern on sendPasswordReset | If the trainer or product owner requires the app to open directly from password reset email, deep link configuration (custom URL scheme, iOS Universal Links, Android App Links) will need to be added |
| A6 | Node.js v22 is not yet GA on Firebase Functions as of May 2026 — use Node.js 18 or 20 | Pattern 4 | If v22 is now GA, it is the preferred runtime; verify at firebase.google.com/docs/functions/manage-functions |

---

## Open Questions

1. **react-native-firebase version to pin**
   - What we know: Project research recommends ^22.x; latest on npm is 24.0.0; v23 bumped minSdk to 23 (Android)
   - What's unclear: Whether v22.x is still maintained / receives security patches given v24 is current; whether v24 is SDK 55 / RN 0.83 compatible
   - Recommendation: Check `npm view @react-native-firebase/app versions --json | tail -20` and use latest v22 patch if v23/v24 New Arch compatibility is not confirmed

2. **Functions v2 `onCall` auth bug resolution status**
   - What we know: Multiple community reports of auth propagation failure with `httpsCallable('name')` for v2 functions; a PR was merged adding `httpsCallableFromURL` but no confirmed fix for v2 named callable
   - What's unclear: Whether this is fixed in v22.x or v23/v24 of @react-native-firebase/functions
   - Recommendation: Use v1 `functions.https.onCall` for `createClientAccount` — no downside for a single-function MVP

3. **Password reset deep link requirement**
   - What we know: Firebase Dynamic Links is shut down; deep link config requires custom URL scheme + associated domain setup in app.config.js
   - What's unclear: Whether product owner (Lau) requires the reset email to open the app directly
   - Recommendation: Implement simple `sendPasswordResetEmail` with no `actionCodeSettings` for Phase 1; add deep link handling in Phase 4 polish if requested

---

## Sources

### Primary (HIGH confidence)
- `docs.expo.dev/router/advanced/protected/` — Stack.Protected API, guard behavior, anchor route [VERIFIED]
- `docs.expo.dev/router/advanced/authentication/` — SplashScreen.preventAutoHideAsync pattern, SessionProvider approach [VERIFIED]
- `docs.expo.dev/router/reference/src-directory/` — src/app/ directory, SDK 55 template default [VERIFIED]
- `docs.expo.dev/build/eas-json/` — eas.json build profiles, developmentClient flag [VERIFIED]
- `rnfirebase.io/` — react-native-firebase Expo setup, app.json plugins, iOS useFrameworks [VERIFIED]
- `rnfirebase.io/functions/usage` — httpsCallable syntax, emulator setup [VERIFIED]
- `firebase.google.com/docs/functions/callable` — onCall function structure, HttpsError codes, context.auth [VERIFIED]
- `firebase.google.com/docs/firestore/security/rules-fields` — affectedKeys(), hasAny(), hasOnly() for field-level deny [VERIFIED]
- `expo.dev/changelog/sdk-55` — SDK 55 breaking changes, src/app template, legacy arch removal [VERIFIED]
- `nativewind.dev/docs/getting-started/installation` — NativeWind v4 install commands, tailwind.config.js, metro.config.js [VERIFIED]
- npm registry — all package version and age verification via `npm view` [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `github.com/invertase/react-native-firebase/discussions/6543` — Functions v2 compatibility issues with httpsCallable [CITED]
- `rnfirebase.io/migrating-to-v23` — v23 breaking changes (iOS 15+, minSdk 23) [VERIFIED]
- `expo.dev/blog/simplifying-auth-flows-with-protected-routes` — Stack.Protected introduction blog post [CITED]

### Tertiary (LOW confidence — community reports)
- Multiple GitHub issues on `invertase/react-native-firebase`: Functions v2 auth propagation failures (issues #6622, #8492) — motivation for v1 onCall recommendation [CITED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry and against official docs
- Architecture patterns: HIGH — Stack.Protected, auth listener, and Zustand patterns verified against official Expo and react-native-firebase docs
- Firestore security rules: HIGH — field-level deny pattern verified against official Firestore docs
- Cloud Function pattern: MEDIUM — v1 onCall approach verified; v2 incompatibility based on community reports (A1 assumption)
- EAS build setup: HIGH — eas.json structure and secret file approach verified against official Expo docs
- NativeWind configuration: HIGH — installation steps verified against official nativewind.dev docs

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (30 days — stable stack; react-native-firebase v24 compatibility with SDK 55 worth rechecking)
