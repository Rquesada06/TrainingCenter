---
phase: 03-client-workout-execution
plan: "02"
subsystem: client-workout-data-layer
tags: [service, store, persist, hooks, async-storage, expo-video, tdd, wave-2]
dependency_graph:
  requires: [03-01]
  provides:
    - session.service (findMyActiveAssignment, findTodaySession, createSession)
    - sessionStore (Zustand + persist + AsyncStorage)
    - useClientActiveAssignment hook
    - useTodaySession hook
    - useFinishSession hook
    - lastWorkoutMode helper
    - expo-video installed
    - async-storage declared dependency
  affects: [03-03, 03-04, 03-05]
tech_stack:
  added:
    - "expo-video ~55.0.17"
    - "@react-native-async-storage/async-storage 2.2.0"
  patterns:
    - client-scoped Firestore read (no trainerId filter) — relies on firestore.rules clientId==uid
    - querySnap.empty guard (RNFB v24 property) for collection queries
    - Zustand v5 persist middleware + createJSONStorage(AsyncStorage) — first persist usage in codebase
    - partialize excludes action functions from persisted state
    - separate AsyncStorage key for across-session preference (lastWorkoutMode) so it survives clearSession
    - TanStack Query queryKey discipline (myActiveAssignment / todaySession) for cross-plan invalidation
    - TDD RED/GREEN cycle per task
key_files:
  created:
    - src/services/session.service.ts
    - src/services/__tests__/session.service.test.ts
    - src/stores/sessionStore.ts
    - src/stores/__tests__/sessionStore.test.ts
    - src/hooks/useClientActiveAssignment.ts
    - src/hooks/useTodaySession.ts
    - src/hooks/useFinishSession.ts
    - src/lib/lastWorkoutMode.ts
  modified:
    - package.json
    - package-lock.json
    - app.config.js
decisions:
  - "expo-video pinned to ~55.0.17 via npx expo install (SDK-55 bundledNativeModules, not standalone latest)"
  - "async-storage 2.2.0 promoted from hoisted transitive dep (@firebase/auth) to a declared dependency"
  - "expo-video config plugin added to app.config.js plugins array — required for native linking (deviation Rule 3)"
  - "findMyActiveAssignment drops the trainerId filter — the client reads its own assignment; the rule isClient() && clientId==uid does not require trainerId"
  - "createSession wraps data directly in stripUndefinedDeep with NO serverTimestamp — startedAt/completedAt are client-set ISO strings"
  - "lastWorkoutMode lives in a separate AsyncStorage key (laufit:lastWorkoutMode), NOT in sessionStore, so it survives clearSession on day roll-over"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-06-03"
  tasks_completed: 3
  files_changed: 11
---

# Phase 03 Plan 02: Client Workout Data Layer — session.service, sessionStore, hooks, expo-video

**One-liner:** Client-scoped session.service (active-assignment read + WORK-09 duplicate guard + finish write, all relying on server-side rules) plus a crash-safe Zustand+persist sessionStore, three TanStack Query hooks, the across-session last-mode helper, and the expo-video / async-storage installs — 11 new unit tests, full suite green (103 passed), tsc clean.

---

## What Was Built

### Task 1 — Package installs (`package.json`, `package-lock.json`, `app.config.js`)

`npx expo install expo-video @react-native-async-storage/async-storage` resolved both to their SDK-55 bundled pins:
- **expo-video ~55.0.17** — inline exercise video playback (WORK-03). Native module; JS references will red-screen until the dev client is rebuilt (Plan 05 on-device UAT).
- **@react-native-async-storage/async-storage 2.2.0** — promoted from a hoisted transitive dep (of `@firebase/auth`) to a declared dependency, because sessionStore imports it directly for persistence.

Added `'expo-video'` to the `plugins` array in `app.config.js` — the install printed "Cannot automatically write to dynamic config"; the config plugin is required for the native module to link.

### Task 2 — session.service (`src/services/session.service.ts`)

Three functions, all relying on `firestore.rules` (sessions + assignments blocks) for ownership:
- `findMyActiveAssignment(clientId)` — `where('clientId','==').where('status','==','active').limit(1)`, **no trainerId filter**, `snap.empty → null`, present → `{ ...data, id }`.
- `findTodaySession(clientId, todayStr)` — duplicate guard (WORK-09): filters `clientId` + `date`, `snap.empty → null`.
- `createSession(data)` — `sessionsCollection().add(stripUndefinedDeep(data))`, returns the new ref id; no serverTimestamp (ISO strings already in data).

### Task 3 — sessionStore + hooks + helper

- **`src/stores/sessionStore.ts`** — Zustand v5 + `persist` + `createJSONStorage(() => AsyncStorage)` (the codebase's first persist usage). `LocalSessionState` + `SessionStoreActions` + exported `INITIAL`. Actions: `startSession` (sets fields, isActive=true, clears completed ids), `toggleExercise`, `setMode`, `clearSession` (resets to INITIAL — the stale-date roll-over path). `partialize` persists only data fields.
- **`src/lib/lastWorkoutMode.ts`** — `getLastMode()` / `setLastMode()` over key `laufit:lastWorkoutMode`; returns 'home' iff stored === 'home', else defaults 'gym'. Separate key so it survives clearSession (D-09).
- **`src/hooks/useClientActiveAssignment.ts`** — `useQuery(['myActiveAssignment', uid], …)`.
- **`src/hooks/useTodaySession.ts`** — `useQuery(['todaySession', uid, today], …)`, staleTime 5s (the guard needs freshness).
- **`src/hooks/useFinishSession.ts`** — `useMutation` over `createSession`, invalidates `['todaySession', uid, today]` on success.

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `session.service.test.ts` | 6 | findMyActiveAssignment empty→null + present→doc (+ asserts NO trainerId filter); findTodaySession empty→null + present→doc; createSession returns id + stripUndefinedDeep applied |
| `sessionStore.test.ts` | 5 | initial state; startSession sets+clears; toggleExercise add/remove; setMode swap; clearSession → INITIAL (stale-date reset) |
| **Total new** | **11** | **All passing** |

Full `react-native` jest suite: **103 passed, 1 skipped** (no regressions). `npx tsc --noEmit` exit code **0**.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking config] Added expo-video config plugin to app.config.js**

- **Found during:** Task 1 (install)
- **Issue:** `npx expo install expo-video` printed "Cannot automatically write to dynamic config at: app.config.js — Add the following to your Expo config { plugins: ['expo-video'] }". Without the plugin entry, the native module would not link on the next dev-client build.
- **Fix:** Added `'expo-video'` to the `plugins` array in `app.config.js` (after `@react-native-google-signin/google-signin`).
- **Files modified:** `app.config.js`
- **Commit:** 94fef68 (Task 1 commit)

No other deviations — the three functions, store, hooks, and helper match 03-PATTERNS.md as written.

---

## Authentication Gates

None — the supply-chain checkpoint (Task 0) was approved by the orchestrator before execution began; no auth gates were hit during the autonomous tasks.

---

## Known Stubs

None — every export is fully wired. The only deferred item is runtime: any JS reference to `expo-video` will red-screen until the native dev client is rebuilt (`npx expo run:ios` / `run:android` or an EAS dev build). This is intentional and scheduled as Plan 05 on-device UAT, not a stub.

---

## Threat Surface Scan

All surfaces in this plan are already enumerated in the plan's `<threat_model>`:
- `createSession` write (T-03-03) — clientId enforced server-side by sessions rule.
- `findMyActiveAssignment` / `findTodaySession` reads (T-03-04) — clientId==self filter + read rules.
- AsyncStorage session state (T-03-06, accept) — non-sensitive workout progress only.
- Package installs (T-03-SC) — cleared by the blocking human-verify checkpoint.

No new network endpoints, auth paths, or schema changes beyond the register. No new threat flags.

---

## Self-Check

Files exist:
- `src/services/session.service.ts` ✓
- `src/services/__tests__/session.service.test.ts` ✓
- `src/stores/sessionStore.ts` ✓
- `src/stores/__tests__/sessionStore.test.ts` ✓
- `src/hooks/useClientActiveAssignment.ts` ✓
- `src/hooks/useTodaySession.ts` ✓
- `src/hooks/useFinishSession.ts` ✓
- `src/lib/lastWorkoutMode.ts` ✓

Commits exist:
- 94fef68 — chore(03-02): install expo-video + declare async-storage
- 78f638f — test(03-02): failing tests for session.service
- c68345a — feat(03-02): session.service
- c8997b5 — test(03-02): failing tests for sessionStore
- 4c8319d — feat(03-02): sessionStore + hooks + last-mode helper

Tests: 11/11 new passing; full suite 103 passed / 1 skipped
TypeScript: 0 errors

## Self-Check: PASSED
