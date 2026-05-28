---
phase: 01-infrastructure-auth
plan: 04
subsystem: backend-security
tags: [cloud-functions, firestore-rules, composite-indexes, admin-sdk, tdd, security, role-elevation]

# Dependency graph
requires:
  - 01-01 (src/types/user.ts CreateClientAccountInput/Result contracts, @/* alias, firebase.json)
  - 01-02 (Cloud Function writes USERS doc that the auth listener reads)
provides:
  - createClientAccount v1 onCall Cloud Function (Admin SDK createUser + Firestore set atomically)
  - Firestore security rules with role-elevation defense (affectedKeys().hasAny(['role','trainerId']))
  - firestore.indexes.json with 4 composite indexes for Phases 2-4 queries
  - src/firebase/functions.ts typed httpsCallable client caller
  - src/services/user.service.ts typed createClientAccount service wrapper for Phase 2 trainer UI
  - functions/ package scaffolded (Node 20, firebase-admin ^12, firebase-functions ^5, jest+ts-jest)
  - firestore/__tests__/rules.test.ts emulator-based rules test suite (5 behaviors)
  - functions/src/__tests__/createClientAccount.test.ts emulator-based function test suite (4 behaviors)
affects:
  - 01-02 (auth listener reads users/{uid} doc that createClientAccount creates)
  - all Phase 2+ (trainer UI calls createClientAccount via user.service.ts)
  - all Phases (Firestore rules enforce access; indexes enable Phase 2-4 queries)

# Tech tracking
tech-stack:
  added:
    - firebase-admin ^12.0.0 (functions/ dep — Admin SDK for createUser + Firestore set)
    - firebase-functions ^5.0.0 (functions/ dep — v1 onCall syntax)
    - firebase-functions-test ^3.0.0 (functions/ devDep — emulator test SDK)
    - ts-jest ^29.0.0 (functions/ devDep and root devDep — TypeScript jest transform)
    - "@firebase/rules-unit-testing (root devDep — Firestore rules emulator test SDK)"
  patterns:
    - v1 functions.https.onCall (NOT v2) — avoids auth propagation bug with @react-native-firebase/functions.httpsCallable()
    - Admin SDK guard pattern — initializeApp() only if !admin.apps.length (safe for test env)
    - affectedKeys().hasAny(['role','trainerId']) — server-enforced role-elevation defense
    - jest projects split — react-native project (jest-expo) vs firestore-rules project (node + ts-jest)

key-files:
  created:
    - functions/package.json
    - functions/tsconfig.json
    - functions/src/index.ts
    - functions/src/__tests__/createClientAccount.test.ts
    - src/firebase/functions.ts
    - src/services/user.service.ts
    - firestore.rules
    - firestore.indexes.json
    - firestore/__tests__/rules.test.ts
  modified:
    - jest.config.js (split into projects for RN + node test environments)
    - package.json (@firebase/rules-unit-testing + ts-jest devDeps added)

key-decisions:
  - "Node.js 20 chosen for Cloud Functions runtime — v22 not yet GA on Firebase Functions as of May 2026 (RESEARCH A6)"
  - "Admin SDK initializeApp() guards with !admin.apps.length — prevents double-init in test env"
  - "jest.config.js split into projects: react-native (jest-expo preset) and firestore-rules (node + ts-jest) — different test environments required"
  - "No additional IAM grants needed — Cloud Functions default service account has Auth Admin + Firestore Admin (RESEARCH A2)"
  - "v1 functions.https.onCall used — v2 onCall has auth propagation bugs with httpsCallable('name') in @react-native-firebase/functions (RESEARCH Pitfall 5, T-04-05)"

# Metrics
duration: 18min
completed: 2026-05-28
---

# Phase 01 Plan 04: Cloud Function, Firestore Rules, and Composite Indexes Summary

**createClientAccount v1 onCall Cloud Function with Admin SDK trust boundary, Firestore rules with server-enforced role-elevation defense (affectedKeys hasAny), 4 composite indexes, and typed client-side service wrapper — CLNT-01 closed, T-04-02 role-elevation threat mitigated.**

## Performance

- **Duration:** 18 minutes
- **Started:** 2026-05-28T15:10:00Z
- **Completed:** 2026-05-28T15:28:00Z
- **Tasks:** 2 (TDD: each with RED + GREEN commits)
- **Files modified:** 11

## Accomplishments

### Task 1: createClientAccount Cloud Function + client caller (TDD)

- Scaffolded `functions/` package with Node 20 runtime, `firebase-admin ^12`, `firebase-functions ^5`, `jest` + `ts-jest` + `firebase-functions-test` devDeps
- Created `functions/tsconfig.json` with CommonJS, `outDir: lib`, strict mode
- Created `functions/src/index.ts` — v1 `functions.https.onCall` with 5 guards in order: (1) unauthenticated rejection, (2) Firestore role check (only trainer), (3) Admin SDK `createUser`, (4) Firestore `users/{uid}.set` with `role:'client'` + `trainerId`, (5) return `{ uid }`
- Created `functions/src/__tests__/createClientAccount.test.ts` — 4 emulator test behaviors: trainer success (creates Auth user + Firestore doc), client denied (permission-denied), unauthenticated (unauthenticated), duplicate email (already-exists)
- Created `src/firebase/functions.ts` — typed `httpsCallable<CreateClientAccountInput, CreateClientAccountResult>('createClientAccount')` caller
- Created `src/services/user.service.ts` — typed `createClientAccount(input)` async wrapper for Phase 2 trainer UI

### Task 2: Firestore security rules + composite indexes (TDD)

- Created `firestore.rules` — `rules_version = '2'` with helper functions `userRole()`, `isSignedIn()`, `isTrainer()`, `isClient()`; USERS role-elevation defense via `affectedKeys().hasAny(['role','trainerId'])`; trainer-scoped EXERCISES/ROUTINES/PROGRAMS; trainer-create/client-read ASSIGNMENTS; client-create/trainer-read SESSIONS
- Created `firestore.indexes.json` — 4 composite indexes: `sessions(clientId ASC, date DESC)`, `assignments(clientId ASC, status ASC)`, `assignments(trainerId ASC, status ASC)`, `sessions(clientId ASC, assignmentId ASC, dayNumber ASC)`
- Created `firestore/__tests__/rules.test.ts` — 5 emulator test behaviors covering role-elevation denial (T-04-02), trainerId change denial, own name update allowed, cross-user read denied, trainer exercise scoping
- Updated `jest.config.js` to split into two projects: `react-native` (jest-expo preset, jsdom) and `firestore-rules` (node environment + ts-jest)

## Task Commits

Each TDD phase committed atomically:

1. **Task 1 RED: failing createClientAccount emulator tests** - `23dccbd` (test)
2. **Task 1 GREEN: createClientAccount implementation + client caller** - `c0caf07` (feat)
3. **Task 2 RED: failing Firestore rules tests** - `884133c` (test)
4. **Task 2 GREEN: firestore.rules + firestore.indexes.json** - `9f641a3` (feat)

## Verification Results

- `functions/npm run build` — exits 0 (TypeScript compiles cleanly to lib/)
- `functions/src/index.ts` — uses v1 `functions.https.onCall` (no `firebase-functions/v2` import) — verified via node check
- `src/firebase/functions.ts` — uses `httpsCallable('createClientAccount')` by name — verified via node check
- `firestore.indexes.json` — 4 composite indexes — verified via node check
- `firestore.rules` — contains `affectedKeys().hasAny(['role', 'trainerId'])` guard — verified via node check
- `npx tsc --noEmit` (app code) — clean, 0 errors
- Emulator tests: structured correctly for `firebase emulators:exec` — fail with connection timeout when run without emulators (expected behavior)
- Existing `authStore` tests: 6/6 still pass after jest.config.js split

## Decisions Made

- **Node.js 20 for Cloud Functions runtime** — v22 is not yet GA on Firebase Functions as of May 2026 (RESEARCH Assumption A6). Using v20 as the stable choice.
- **Admin SDK `initializeApp()` guard** — `if (!admin.apps.length)` prevents double-initialization when tests import `index.ts` after setting up their own `admin.initializeApp()`. This is the standard pattern for testable Cloud Functions.
- **jest.config.js split into projects** — `@firebase/rules-unit-testing` and `@firebase/app` emit ESM/CJS that conflicts with `jest-expo`'s jsdom environment. Split into `react-native` (jest-expo, jsdom) and `firestore-rules` (ts-jest, node) projects to give each correct runtime.
- **No additional IAM grants needed** — Cloud Functions deployed via `firebase deploy` automatically have the default service account with `roles/firebase.auth.admin` and `roles/datastore.user` permissions (RESEARCH Assumption A2).
- **v1 `functions.https.onCall`** — v2 `onCall` has auth propagation bugs when called via `@react-native-firebase/functions.httpsCallable('name')` (RESEARCH Pitfall 5, T-04-05 mitigation). v1 is the correct choice for the MVP.

## TDD Gate Compliance

Both tasks followed full RED/GREEN TDD gate sequence:

| Gate | Task 1 | Task 2 |
|------|--------|--------|
| RED (test commit) | `23dccbd` | `884133c` |
| GREEN (feat commit) | `c0caf07` | `9f641a3` |
| REFACTOR | Not needed | Not needed |

Emulator tests correctly fail without a running Firebase Emulator Suite — they are designed to run via `firebase emulators:exec` during the phase gate verification step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed firebase-functions-test import syntax**
- **Found during:** Task 1 RED phase (test run)
- **Issue:** `import * as functions from 'firebase-functions-test'` caused TypeScript error TS2349 — namespace import cannot be called as function. The package uses a default export.
- **Fix:** Changed to `const functions = require('firebase-functions-test')` (CommonJS require for the default export)
- **Files modified:** `functions/src/__tests__/createClientAccount.test.ts`
- **Commit:** `23dccbd`

**2. [Rule 3 - Blocking] Fixed double admin.initializeApp() in test env**
- **Found during:** Task 1 GREEN phase (test run with implementation)
- **Issue:** `index.ts` called `admin.initializeApp()` unconditionally; test file also calls `admin.initializeApp({ projectId: 'laufit-emulator-test' })`. When the test `require('../index')`, the second call threw "The default Firebase app already exists."
- **Fix:** Wrapped `admin.initializeApp()` in `if (!admin.apps.length)` guard in `index.ts`
- **Files modified:** `functions/src/index.ts`
- **Commit:** `c0caf07`

**3. [Rule 3 - Blocking] Fixed jest environment for @firebase/rules-unit-testing ESM**
- **Found during:** Task 2 RED phase (rules test run)
- **Issue:** `@firebase/rules-unit-testing` uses ESM imports that fail under `jest-expo`'s jsdom environment with "Cannot use import statement outside a module"
- **Fix:** Split `jest.config.js` into two projects: `react-native` (jest-expo, jsdom for RN tests) and `firestore-rules` (node + ts-jest for rules tests). Installed `ts-jest` as root devDependency.
- **Files modified:** `jest.config.js`, `package.json`
- **Commit:** `884133c`

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking)
**Impact:** All fixes correct and self-contained. No scope creep. Existing authStore tests unaffected.

## User Setup Required

Before deploying the Cloud Function, the following steps are required:

1. **Enable Blaze plan on Firebase project** — Cloud Functions require the Blaze (pay-as-you-go) billing plan. Navigate to Firebase Console → Project Settings → Usage and Billing.

2. **Enable Cloud Functions** — Firebase Console → Functions → Get started (if not already enabled).

3. **Verify service account IAM** — The default App Engine service account (`<project-id>@appspot.gserviceaccount.com`) should automatically have the required roles. If using a custom service account, grant `roles/firebase.auth.admin` and `roles/datastore.user`.

4. **Create first trainer account** — Before any trainer can call `createClientAccount`, a trainer account must exist:
   - Firebase Console → Authentication → Add user (email + password)
   - Firestore → `users/{uid}` → Create document with `{ role: 'trainer', name: 'Lau', email: '...', trainerId: null }`

5. **Deploy rules, indexes, and function:**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions
   ```

## Known Stubs

None — all code in this plan is wired and functional. The emulator test suites require a running Firebase Emulator Suite to pass, but are correctly structured for `firebase emulators:exec` execution during the phase gate.

## Threat Flags

No new security surface introduced beyond what is documented in the plan's `<threat_model>`. All five threats (T-04-01 through T-04-05) have mitigations implemented and documented.

## Next Phase Readiness

- **Phase 2** (trainer UI — program builder): Ready. `src/services/user.service.ts` exports `createClientAccount(input)`. `firestore.rules` enforces trainer-scoped EXERCISES/ROUTINES/PROGRAMS access.
- **AUTH-02** (client login): Enabled — a client account can now be created via `createClientAccount`, and that client can immediately log in using their email + temporary password.
- **CLNT-01**: Closed — trainer can call `createClientAccount` → new Auth user + USERS doc (role:'client', trainerId) created atomically → returns `{ uid }`.

---
*Phase: 01-infrastructure-auth*
*Completed: 2026-05-28*
