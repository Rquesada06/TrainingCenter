# Research Summary: LauFit

**Project:** LauFit
**Domain:** Trainer-client fitness coaching mobile app (React Native + Firebase)
**Researched:** 2026-05-27
**Confidence:** HIGH

---

## TL;DR

- **The SESSION data model is incomplete.** The mockups already show per-set weight/reps/RPE logging, but the current SESSIONS schema only stores `completed: boolean` per exercise. This must be fixed before Phase 1 ships — it is expensive to retrofit after sessions are being written.
- **Never use Expo Go.** react-native-firebase requires a development build (EAS Dev Client) from day one. Any developer who starts on Expo Go will waste significant time and produce untestable code.
- **Target Expo SDK 55, not 51.** SDK 55 (RN 0.83, React 19.2) is current stable. New Architecture is mandatory and cannot be disabled. All chosen libraries are compatible.
- **One mandatory Cloud Function exists before any client can log in:** `createClientAccount` — trainers cannot create Firebase Auth users from client-side code. This function must ship in Phase 1.
- **Session state must use two layers (Zustand + AsyncStorage), not real-time Firestore writes.** Writing every exercise completion to Firestore mid-workout is expensive, fragile under poor connectivity, and architecturally wrong. Commit only on finalize; use AsyncStorage as crash recovery backup.

---

## Validated Stack (2025)

| Package | Version | Note |
|---------|---------|------|
| expo | ~55.0.14 | Upgrade from "SDK 51+" — SDK 55 is current stable |
| react-native | 0.83.4 | Pinned by SDK 55; New Architecture always on |
| react | 19.2.0 | Pinned by SDK 55 |
| expo-router | ~5.0.7 | Bundled with SDK 55 |
| @react-native-firebase/* | ^22.x | Use this, NOT the `firebase` JS SDK |
| @tanstack/react-query | ^5.x | v5 API changed to single-object — not v4 |
| zustand | ^5.0.x | `useShallow` hook replaces `shallow` comparator |
| react-hook-form | ^7.66.x | + `@hookform/resolvers/zod` |
| nativewind | ^4.x (stable) | Do NOT use v5 (pre-release) |
| tailwindcss | ^3.4.17 | Paired with NativeWind v4 |
| expo-video | latest | Replaces expo-av (removed in SDK 54) |
| expo-image | latest | Replaces RN Image for cached photo loading |
| date-fns + date-fns-tz | latest | Timezone-safe workout day calculation |

**iOS config requirement:** `expo-build-properties` with `useFrameworks: "static"` in `app.json` is mandatory for react-native-firebase on iOS.

**Gluestack UI: skip it.** The Obsidian Performance design system requires direct NativeWind control.

---

## Critical Decisions Required Before Phase 1

### 1. Expand the SESSION data model now

The current schema stores `completedExercises: [{exerciseId, completed: boolean, variantUsed}]`. The model must be:

```
completedExercises: [
  {
    exerciseId, completed, variantUsed,
    sets: [
      { setNumber, targetReps, actualReps, actualWeight, weightUnit, rpe, completedAt }
    ]
  }
]
```

Without this, session history is meaningless for strength tracking. Trainers will revert to spreadsheets.

### 2. Development build from day one

No Expo Go. Set up `expo-dev-client` + EAS development build profile before writing a single line of Firebase code.

### 3. Firestore security rules before writing data

Write rules before writing application code. The `role` field on USERS documents must not be writable by the document owner — a client who can write their own profile could elevate to trainer and read all data.

### 4. Store `startDate` as a date string, not a timestamp

`startDate` on ASSIGNMENT documents must be stored as `YYYY-MM-DD` (computed from the client's local timezone at assignment time). Using a Firestore Timestamp causes timezone bugs where clients see the wrong workout day at midnight boundaries. This is a data model decision that must be made before any session data is written.

### 5. Client onboarding flow (recommend Option A for MVP)

**(a) Trainer creates client accounts** via `createClientAccount` Cloud Function and shares credentials — simpler, eliminates orphaned-account problem.
**(b) Client self-registers** and trainer links by email/UID.

Recommend option (a) for MVP.

### 6. Commit google-services.json handling

Add Firebase config files to `.gitignore` immediately. Upload as EAS secret file variables. Reference via `process.env` in `app.config.js`. Do this before the first EAS build.

---

## Feature Scope Adjustments

### Add to MVP scope (small effort, high value)

| Feature | Reason |
|---------|--------|
| Per-set weight/reps/RPE logging | Mockup already shows this UI. Table stakes in every competing product (Trainerize, TrueCoach). |
| Exercise notes visible during session execution | `notes` field already exists on routine exercises. One-component change with high trainer value. |
| "Already trained today" guard | Prevents duplicate session creation when client opens app after completing a session. |
| Adherence badge on trainer client list | US-16 defines the metric but puts it only in history subscreen. Trainers need it on client list card (T04). |

### Confirmed post-MVP (never in MVP)

Program phases/periodization, superset support, weight progress charts, training streak, wearables, body measurements, in-app chat, nutrition, payments, custom video upload, public program marketplace, AI workouts.

---

## Architecture Patterns to Follow

### 1. `app/` is navigation only; `src/` is everything else
No business logic in route files. Route files import from `src/hooks`, `src/services`, `src/stores`.

### 2. Two protected route groups with Stack.Protected
```
app/_layout.tsx — reads Zustand authStore, renders Stack.Protected guards
app/sign-in.tsx — public
app/(trainer)/ — guard: role === 'trainer'
app/(client)/ — guard: role === 'client'
```
Auth race condition prevented by `isLoaded` boolean (renders SplashScreen until Firebase fires first auth event).

### 3. Session state: Zustand + AsyncStorage, Firestore only on finalize
Mid-workout state in Zustand. Snapshot to AsyncStorage on each exercise completion for crash recovery. Single Firestore batch write on "Finish Workout". Check AsyncStorage on app open and offer to resume unfinished sessions.

### 4. ASSIGNMENT contains the full program snapshot
A transaction at assignment time reads all referenced exercise documents and embeds them. Trainer can edit their library or program without affecting active client assignments.

### 5. `workout-calculator.ts` is a pure function
`getTodaysWorkout(assignment, userTimezone, nowUtc)` has no Firestore dependency. Use `differenceInCalendarDays` from date-fns — not millisecond math (breaks across DST transitions).

### 6. One mandatory Cloud Function: `createClientAccount`
Creates Firebase Auth user (requires Admin SDK) and writes USERS doc with `role: 'client'` and `trainerId`. All other operations are client-side Firestore SDK.

### 7. Composite indexes defined upfront
Required: `sessions (clientId ASC, date DESC)`, `assignments (clientId ASC, status ASC)`, `assignments (trainerId ASC, status ASC)`. Commit `firestore.indexes.json` in Phase 1.

---

## Top Pitfalls by Phase

### Phase 1: Firebase Setup + Auth

| Pitfall | Prevention |
|---------|------------|
| Auth state race condition (flash of login screen on cold start) | `isLoaded` boolean in Zustand; render SplashScreen until `onAuthStateChanged` fires |
| Firestore rules left open | Write rules before data; deploy with `firebase deploy --only firestore:rules` |
| Using Expo Go with react-native-firebase | EAS development build on day one |
| google-services.json not in EAS | Upload as EAS secret file variables before first build |
| Role elevation via client self-write | Security rules deny writes to `role` field from document owner |

### Phase 2: Program Builder + Assignment

| Pitfall | Prevention |
|---------|------------|
| Snapshot not deep-copying exercise references | Transaction at assignment time resolves all exerciseIds and embeds full objects |
| Timezone bug in workout day calculation | `YYYY-MM-DD` string for `startDate`; `differenceInCalendarDays` not millisecond math |
| Drag-to-reorder gesture conflicts on Android | `GestureHandlerRootView` wraps root `_layout.tsx`; never nest `DraggableFlatList` inside `ScrollView` |

### Phase 3: Client Workout Execution

| Pitfall | Prevention |
|---------|------------|
| Firestore listener leak during workout | Every `onSnapshot` cleanup in `useEffect` return |
| Rest timer causing cascade re-renders every second | Timer state in isolated component using `useSharedValue` on UI thread (Reanimated) |
| FlatList re-rendering all exercise rows on timer tick | `useCallback` on `renderItem`; `React.memo` on exercise row components |
| Video exits the app | Use `WebBrowser.openBrowserAsync` (expo-web-browser), not `Linking.openURL` |
| Client confusion on rest days / not-started state | Four explicitly designed home states: no assignment, starts in N days, rest day, active workout |

### Phase 4: History + Dashboard

| Pitfall | Prevention |
|---------|------------|
| Unbounded session history query | `orderBy('date', 'desc').limit(20)` with cursor pagination |

---

## Phase Sequencing Implications

**Phase 1 — Infrastructure + Auth**
Firebase project setup, security rules, EAS dev build, auth flow with `isLoaded` guard, role-based navigation shell, `createClientAccount` Cloud Function, composite indexes committed.

**Phase 2 — Trainer Content Creation**
Exercise CRUD with instant local search, routine builder with drag-to-reorder, program builder, client management, program assignment with deep-copy snapshot transaction, trainer dashboard.

**Phase 3 — Client Workout Execution** (validate with Lau)
`workout-calculator.ts` pure function with unit tests, all four client home states, per-set session logging, gym/home toggle, rest timer (Reanimated isolated), Zustand + AsyncStorage session state, single Firestore finalize, session completion, duplicate-session guard.

**Phase 4 — History + Polish**
Paginated session history, trainer view of client sessions, profiles with Firebase Storage photos, empty states for all screens, in-session navigation guard.

**Research flags for planning:**
- Phase 3 needs extra research (Reanimated rest timer + offline session pattern)
- Phase 2 benefits from a drag-reorder spike before building the full program builder

---

*Research completed: 2026-05-27*
*Ready for roadmap: yes*
