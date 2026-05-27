---
phase: 01-infrastructure-auth
type: skeleton
created: 2026-05-27
---

# Walking Skeleton — Phase 1: Infrastructure + Auth

> The thinnest possible end-to-end stack that proves the architecture works on a real device.
> Subsequent phases build on the decisions recorded here without renegotiating them.

## Phase Goal (User Story)

**As a** trainer or client, **I want to** open the LauFit app on my real phone, log in with my email and password, and land on my own role's home screen, **so that** I can trust the app to remember who I am and keep my data separate from the other role.

## What the Skeleton Must Prove

The Phase 1 skeleton is "done" when this exact sequence works on a physical device running an EAS development build (never Expo Go):

1. **Cold start, never opened** → native splash screen appears (NOT a white flash, NOT the login screen).
2. **Splash dismisses** → sign-in screen appears.
3. **Sign in with trainer credentials** → trainer tab navigator appears.
4. **Sign out** → sign-in screen appears, no trainer routes left in the back stack.
5. **Sign in with client credentials** → client tab navigator appears.
6. **Force-kill the app and reopen** → the correct role's tab navigator appears immediately, with no login flash.
7. **Trainer calls `createClientAccount`** → a new user appears in Firebase Auth + a USERS doc with `role: 'client'` and the correct `trainerId`, and that client can immediately log in (step 5).

This is the definition of done for Phase 1 before any feature screen is built.

## End-to-End Slice (thinnest path)

```
Real device (EAS dev build)
  └─ src/app/_layout.tsx
       ├─ SplashScreen.preventAutoHideAsync()  (module scope)
       ├─ initAuthListener()  →  @react-native-firebase/auth onAuthStateChanged
       │                            └─ Firestore read: users/{uid}.role   ← ONE real Firebase read
       │                                 └─ authStore.set({ uid, role, isLoaded:true })  (Zustand)
       ├─ if !isLoaded → render null (splash stays up)   ← no auth flash
       └─ Stack.Protected guards (uid / role)
            ├─ guard={!uid}                 → src/app/sign-in.tsx
            │     └─ signInWithEmailAndPassword()   ← ONE real UI interaction + Firebase write to auth session
            ├─ guard={role==='trainer'}     → src/app/(trainer)/_layout.tsx (placeholder tabs)
            └─ guard={role==='client'}      → src/app/(client)/_layout.tsx (placeholder tabs)

Trainer-only round trip (proves Cloud Function + Admin SDK trust boundary):
  trainer UI → functions().httpsCallable('createClientAccount')
       → Cloud Function v1 onCall (Admin SDK)
            ├─ admin.auth().createUser(...)
            └─ admin.firestore().doc('users/{uid}').set({ role:'client', trainerId })
```

## Architectural Decisions (locked for all subsequent phases)

| Decision | Choice | Rationale (source) |
|----------|--------|--------------------|
| Framework | Expo SDK 55 (RN 0.83, React 19.2, New Architecture always on) | RESEARCH Standard Stack; SDK 55 is current stable, no opt-out of New Arch |
| Route directory | `src/app/` (NOT `app/` at root) | SDK 55 default template; `@/*` → `./src/*` |
| Build path | EAS development build from day one — never Expo Go | `@react-native-firebase` is native; Expo Go is architecturally incompatible |
| Firebase client | `@react-native-firebase/*` (native), NOT `firebase` JS SDK | Native token lifecycle, offline persistence, App Check |
| Auth persistence | Native Firebase Auth (no custom AsyncStorage for tokens) | SDK handles refresh/expiry/revocation |
| Auth race guard | `SplashScreen.preventAutoHideAsync()` at module scope + `isLoaded` boolean | Prevents login-screen flash on cold start (AUTH-05) |
| Navigation guard | `Stack.Protected guard={boolean}` — NOT `useEffect + router.replace()` | Cleans history correctly; redirect chains corrupt the stack |
| State (client) | Zustand v5 (`authStore`: uid, role, trainerId, isLoaded); `useShallow` for multi-field reads | RESEARCH Pattern 3 |
| State (server) | TanStack Query v5 (installed Phase 1, used from Phase 2) | Avoid install friction later |
| Forms | react-hook-form v7 + zod via `@hookform/resolvers/zod` | Sign-in validation (V5 input validation) |
| Styling | NativeWind v4 + `tailwindcss@^3.4.17` (PINNED, NOT v4.x) | NativeWind v4 requires Tailwind v3 |
| Design theme | Obsidian Performance — bg `#0E0E0E`, accent `#00FF66`, Hanken Grotesk font | Design system locked |
| Cloud Function | `createClientAccount` — Functions **v1** `functions.https.onCall` (NOT v2) | v2 has auth propagation bugs with `httpsCallable('name')` |
| iOS native config | `expo-build-properties` `useFrameworks: "static"` | firebase-ios-sdk requires static frameworks |
| Firebase secrets | `google-services.json` / `GoogleService-Info.plist` gitignored, uploaded as EAS secret file vars, referenced via `process.env` in `app.config.js` | EAS clones clean repo; missing files → runtime crash |
| `startDate` storage | `YYYY-MM-DD` string (NOT Firestore Timestamp) — relevant from Phase 2 | Timezone bugs at midnight boundaries |
| Password reset | Plain `sendPasswordResetEmail(email)`, NO `actionCodeSettings`/deep links | Firebase Dynamic Links shut down Aug 2025 |
| Role-elevation defense | Firestore rule: USERS `update` denies any diff touching `role`/`trainerId` | Client cannot self-promote to trainer |

## Directory Layout (created by the skeleton)

```
laufit/
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Root: SplashScreen + Stack.Protected
│   │   ├── sign-in.tsx             # Public login
│   │   ├── (trainer)/_layout.tsx + (tabs)/{_layout,index,profile}.tsx
│   │   └── (client)/_layout.tsx  + (tabs)/{_layout,index,profile}.tsx
│   ├── firebase/{auth,firestore,functions}.ts
│   ├── stores/authStore.ts
│   ├── hooks/useAuth.ts
│   ├── services/user.service.ts
│   └── types/user.ts
├── functions/src/index.ts          # createClientAccount (v1 onCall)
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── app.config.js
├── eas.json
├── tailwind.config.js / metro.config.js / babel.config.js / global.css
└── tsconfig.json                   # @/* → ./src/*
```

## Deployment Target

- **Dev:** `eas build --profile development --platform android` (APK) / `--profile development-simulator --platform ios` for simulator smoke tests.
- **Real device verification:** install dev build, run all 7 proof steps above.
- **Backend deploy:** `firebase deploy --only firestore:rules,firestore:indexes,functions`.

## Out of Scope for the Skeleton (deferred to later phases)

- Any feature screens (exercise library, routines, programs, sessions) — Phases 2–4.
- Per-set session logging schema — Phase 3 (decision noted in research, not built here).
- Profile photo upload / Firebase Storage — Phase 4.
- Real tab content — Phase 1 ships placeholder tabs only.
