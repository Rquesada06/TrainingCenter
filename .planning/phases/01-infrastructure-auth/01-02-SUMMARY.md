---
phase: 01-infrastructure-auth
plan: 02
subsystem: auth
tags: [zustand, firebase-auth, firestore, expo-router, stack-protected, auth-flash, tdd]

# Dependency graph
requires:
  - 01-01 (UserRole type from src/types/user.ts, @/* alias, jest config)
provides:
  - Zustand authStore { uid, role, trainerId, isLoaded } with set/clear actions (useAuthStore, useAuth)
  - Firebase onAuthStateChanged listener that reads Firestore USERS doc and populates authStore
  - signIn/signOut/sendPasswordReset auth helpers
  - SplashScreen-guarded root layout with three ordered Stack.Protected role guards
  - Trainer tab shell (placeholder Dashboard + Profile screens)
  - Client tab shell (placeholder Home + Profile screens)
  - 6 authStore unit tests (AUTH-01 AUTH-02 AUTH-03 AUTH-05)
affects:
  - 01-03 (sign-in screen imports useAuthStore, signIn, sendPasswordReset)
  - 01-04 (Cloud Function writes USERS doc that the auth listener reads)
  - all subsequent phases (authStore + root layout are the navigation backbone)

# Tech tracking
tech-stack:
  added:
    - jest ^29.x (devDep, missing from Plan 01 install — jest-expo needs it)
    - babel-preset-expo (devDep, missing from Plan 01 — needed for jest transform)
    - "@types/jest (devDep, TS types for jest globals)"
  patterns:
    - Zustand v5 create<AuthState> with useShallow for memoized selectors
    - Firebase onAuthStateChanged + Firestore getDoc (one read per auth event)
    - SplashScreen.preventAutoHideAsync at module scope + return null while !isLoaded
    - Stack.Protected guard ordering: sign-in (anchor) → trainer → client

key-files:
  created:
    - src/stores/authStore.ts
    - src/firebase/auth.ts
    - src/firebase/firestore.ts
    - src/hooks/useAuth.ts
    - src/stores/__tests__/authStore.test.ts
    - src/app/_layout.tsx
    - src/app/sign-in.tsx (placeholder — Plan 03 replaces with full form)
    - src/app/(trainer)/_layout.tsx
    - src/app/(trainer)/(tabs)/_layout.tsx
    - src/app/(trainer)/(tabs)/index.tsx
    - src/app/(trainer)/(tabs)/profile.tsx
    - src/app/(client)/_layout.tsx
    - src/app/(client)/(tabs)/_layout.tsx
    - src/app/(client)/(tabs)/index.tsx
    - src/app/(client)/(tabs)/profile.tsx
  modified:
    - package.json (jest, babel-preset-expo, @types/jest added as devDeps)

key-decisions:
  - "Stack.Protected ordering: sign-in declared first as unauthenticated anchor per Pitfall 4"
  - "sendPasswordReset: no actionCodeSettings — Firebase Dynamic Links shut down Aug 2025"
  - "authStore.clear() sets isLoaded=true — signed-out is a loaded state to prevent flash on logout"
  - "jest + babel-preset-expo + @types/jest installed as devDeps (missing from Plan 01 install)"

# Metrics
duration: 6min
completed: 2026-05-28
---

# Phase 01 Plan 02: Auth State Layer and Role Navigation Summary

**Zustand authStore with Firebase onAuthStateChanged listener, SplashScreen-guarded root layout using three ordered Stack.Protected role guards, and placeholder trainer/client tab shells — AUTH-01 through AUTH-05 satisfied with 6 green unit tests.**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-05-28T15:00:00Z
- **Completed:** 2026-05-28T15:06:10Z
- **Tasks:** 2 (Task 1: TDD store + listener; Task 2: root layout + shells)
- **Files modified:** 15

## Accomplishments

### Task 1: authStore + Firebase auth listener (TDD)

- Created `src/stores/authStore.ts` — Zustand v5 store with `{ uid, role, trainerId, isLoaded }`, `set(partial)` and `clear()` actions; `useAuth` convenience hook using `useShallow` (v5 API)
- Created `src/firebase/auth.ts` — `initAuthListener()` registers `onAuthStateChanged`, reads `users/{uid}` Firestore doc on sign-in, populates `authStore`; `signIn`/`signOut`/`sendPasswordReset` helpers
- Created `src/firebase/firestore.ts` — typed `usersCollection` reference; single source of truth for the 'users' collection name
- Created `src/hooks/useAuth.ts` — re-exports `useAuth` for ergonomic component imports
- Wrote `src/stores/__tests__/authStore.test.ts` — 6 tests covering all 5 plan behaviors (initial state, trainer set, client set, clear+isLoaded, isLoaded transition)

### Task 2: Root layout + role shells

- Replaced scaffold `src/app/_layout.tsx` with auth-guarded root layout: `SplashScreen.preventAutoHideAsync()` at module scope, `initAuthListener()` in useEffect, `return null` while `!isLoaded`, three `Stack.Protected` guards in correct order
- Created `src/app/sign-in.tsx` placeholder (Plan 03 replaces with full form)
- Created trainer tab shell: `(trainer)/_layout.tsx` + `(trainer)/(tabs)/_layout.tsx` with Dashboard + Profile tabs
- Created client tab shell: `(client)/_layout.tsx` + `(client)/(tabs)/_layout.tsx` with Home + Profile tabs
- All placeholder screens use `bg-[#0E0E0E]` (Obsidian Performance base color)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: authStore tests** - `06cc280` (test)
2. **Task 1 GREEN: authStore + auth listener implementation** - `86a22ae` (feat)
3. **Task 2: Root layout + role shells** - `864821f` (feat)

## Verification Results

- `npx jest --testPathPatterns="authStore"` — 6/6 tests pass
- `npx tsc --noEmit` — clean (0 errors)
- `sendPasswordReset` has no `actionCodeSettings` — verified via node check
- Root layout: `preventAutoHideAsync` at module scope, `initAuthListener` in useEffect, `return null` while `!isLoaded`, three ordered `Stack.Protected` guards, no `router.replace`
- Both role shells exist: `(trainer)/_layout.tsx` and `(client)/_layout.tsx`

## Decisions Made

- **Stack.Protected ordering:** `sign-in` Screen declared first inside `guard={!uid}` block — makes sign-in the unauthenticated anchor. RESEARCH Pitfall 4 explains that the anchor is the first accessible screen; wrong ordering sends signed-out users to unexpected screens.
- **sendPasswordReset:** No `actionCodeSettings` argument. Firebase Dynamic Links was shut down August 25, 2025; all `.page.link` domains return HTTP 404. Plain `sendPasswordResetEmail(email)` uses Firebase-hosted web handler — sufficient for MVP.
- **authStore.clear() sets isLoaded=true:** A signed-out state is a known/loaded state. Without this, sign-out would briefly show the native splash screen again (isLoaded would stay at whatever value). Setting isLoaded=true in clear() ensures the root layout stays rendered on sign-out.
- **jest + babel-preset-expo + @types/jest devDeps:** Plan 01 installed `jest-expo` but not the `jest` package itself (which jest-expo depends on), `babel-preset-expo` (needed for jest's babel transform), or `@types/jest` (needed for TypeScript to recognize jest globals). These were missing from Plan 01 and installed as a Rule 3 auto-fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing jest + babel-preset-expo + @types/jest devDeps**
- **Found during:** Task 1 RED phase (first test run)
- **Issue:** `jest-expo` was installed in Plan 01 but its peer dependency `jest` was not. Running tests failed with `Cannot find module 'jest/package.json'`. Also `babel-preset-expo` was missing (used by `babel.config.js` for jest transforms) and `@types/jest` was missing (TS errors: `Cannot use namespace 'jest' as a value`).
- **Fix:** `npm install --save-dev jest babel-preset-expo @types/jest`
- **Files modified:** `package.json`
- **Verification:** Tests ran successfully; `npx tsc --noEmit` clean
- **Committed in:** `06cc280` and `86a22ae` (spread across RED and GREEN commits)

**2. [Rule 1 - Verification] Removed `actionCodeSettings` string from auth.ts comments**
- **Found during:** Task 1 verify phase (node check script)
- **Issue:** The verification script checks for the string `actionCodeSettings` anywhere in `auth.ts`. My initial implementation had the word in explanatory comments ("sendPasswordReset uses NO actionCodeSettings"). The check failed as a false positive.
- **Fix:** Reworded comments to not contain the literal string `actionCodeSettings`
- **Committed in:** `86a22ae`

**3. [Rule 1 - Verification] Removed `router.replace` string from _layout.tsx comments**
- **Found during:** Task 2 verify phase (node check script)
- **Issue:** The verification script checks for `router.replace` in `_layout.tsx`. My root layout comment said "NO router.replace() in useEffect" — the check failed as false positive.
- **Fix:** Reworded comment to "do NOT use imperative redirect in useEffect"
- **Committed in:** `864821f`

---

**Total deviations:** 3 (1 missing devDeps fix, 2 comment wording adjustments for verification scripts)
**Impact:** All fixes correct and self-contained. No scope creep.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Sign In placeholder | `src/app/sign-in.tsx` | all | Plan 03 owns the sign-in form; this stub keeps the build green |
| Trainer Dashboard | `src/app/(trainer)/(tabs)/index.tsx` | all | Intentional per plan — Phase 2 ships real content |
| Trainer Profile | `src/app/(trainer)/(tabs)/profile.tsx` | all | Intentional per plan — Phase 2 ships real content |
| Client Home | `src/app/(client)/(tabs)/index.tsx` | all | Intentional per plan — Phase 3 ships real content |
| Client Profile | `src/app/(client)/(tabs)/profile.tsx` | all | Intentional per plan — Phase 3 ships real content |

These stubs are explicitly required by the plan ("intentionally placeholder shells"). They do not block the plan's goal (auth-to-navigation pipeline). Real content is scoped to Phases 2-4.

## Next Phase Readiness

- **Plan 03** (sign-in screen): Ready. `useAuthStore`, `signIn`, `sendPasswordReset` are wired and typed. `sign-in.tsx` placeholder exists for replacement.
- **Plan 04** (Firestore rules + Cloud Function): Ready. `usersCollection` typed reference exists. Auth listener reads from `users/{uid}` — rules must be deployed before first user write.

No blockers for Plans 03-04.

---
*Phase: 01-infrastructure-auth*
*Completed: 2026-05-28*

## Self-Check: PASSED

- src/stores/authStore.ts — FOUND
- src/firebase/auth.ts — FOUND
- src/firebase/firestore.ts — FOUND
- src/hooks/useAuth.ts — FOUND
- src/stores/__tests__/authStore.test.ts — FOUND
- src/app/_layout.tsx — FOUND
- src/app/sign-in.tsx — FOUND
- src/app/(trainer)/_layout.tsx — FOUND
- src/app/(trainer)/(tabs)/_layout.tsx — FOUND
- src/app/(trainer)/(tabs)/index.tsx — FOUND
- src/app/(trainer)/(tabs)/profile.tsx — FOUND
- src/app/(client)/_layout.tsx — FOUND
- src/app/(client)/(tabs)/_layout.tsx — FOUND
- src/app/(client)/(tabs)/index.tsx — FOUND
- src/app/(client)/(tabs)/profile.tsx — FOUND
- Commits verified: 06cc280, 86a22ae, 864821f in git log
- 6 authStore tests passing
- tsc --noEmit clean
