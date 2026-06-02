---
phase: 02-trainer-content-creation
plan: 01
subsystem: infra
tags: [zod-v4, expo-router, firestore, typescript, tabs, types, validation, reanimated-dnd, bottom-sheet]

# Dependency graph
requires:
  - phase: 01-infrastructure-auth
    provides: usersCollection ref pattern, firestore.rules baseline, trainer tab shell, User types
provides:
  - Phase 2 type contracts (Exercise, Routine, Program, Assignment + snapshot shapes)
  - Zod v4 validation schemas (exercise, routine, program) with test coverage
  - filterExercises pure function (EXER-04/05)
  - typed Firestore collection refs (exercises, routines, programs, assignments)
  - 4 composite Firestore indexes (exercises/routines/programs/users by trainerId+name)
  - 5-tab trainer nav shell (Clients|Exercises|Routines|Programs|Profile) with sub-stacks + placeholders
  - Phase 2 cross-trainer denial coverage in firestore rules tests
affects: [02-02-exercises, 02-03-clients, 02-04-routines, 02-05-programs]

# Tech tracking
tech-stack:
  added: [react-native-reanimated-dnd@^2.0.0, "@gorhom/bottom-sheet@^5.2.14"]
  patterns:
    - "Zod v4 form schemas: z.enum([...] as const), z.coerce.number(), z.url().optional().or(z.literal(''))"
    - "Typed CollectionReference<T> factory functions in src/firebase/firestore.ts"
    - "expo-router file-based tabs with href:null to suppress phantom index tab"
    - "Immutable assignment snapshot uses null (not undefined) for Firestore compatibility"

key-files:
  created:
    - src/types/exercise.ts
    - src/types/routine.ts
    - src/types/program.ts
    - src/types/assignment.ts
    - src/validation/exercise.schema.ts
    - src/validation/routine.schema.ts
    - src/validation/program.schema.ts
    - src/firebase/exerciseFilter.ts
    - src/app/trainer/clients/_layout.tsx
    - src/app/trainer/exercises/_layout.tsx
    - src/app/trainer/routines/_layout.tsx
    - src/app/trainer/programs/_layout.tsx
  modified:
    - src/firebase/firestore.ts
    - firestore.indexes.json
    - firestore/__tests__/rules.test.ts
    - src/app/trainer/_layout.tsx
    - src/app/trainer/index.tsx
    - package.json

key-decisions:
  - "Suppressed phantom /trainer/index tab with href:null instead of deleting the route (redirect must stay routable)"
  - "Assignment snapshot fields use null not undefined for Firestore field persistence"
  - "26-week durationWeeks cap to keep assignment snapshot under Firestore 1 MiB limit"

patterns-established:
  - "Zod v4 API: z.enum as const + z.coerce.number for all Phase 2 form schemas"
  - "Typed collection ref factories mirror the Phase 1 usersCollection pattern"
  - "Wave 0 test stubs (describe.skip) reserve scaffolding for future plans"

requirements-completed: [EXER-06, ROUT-07, PROG-06, CLNT-05]

# Metrics
duration: ~35min
completed: 2026-06-02
---

# Phase 2 Plan 01: Phase 2 Foundation Scaffolding Summary

**Phase 2 single source of truth: Exercise/Routine/Program/Assignment type contracts, Zod v4 schemas with 21 passing tests, typed Firestore collection refs + 4 composite indexes, and a 5-tab trainer nav shell with placeholder screens.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-06-02T16:05:00Z (approx)
- **Completed:** 2026-06-02T16:40:25Z
- **Tasks:** 3 (Task 1 checkpoint cleared by orchestrator, Tasks 2-3 auto)
- **Files modified:** 28 (across all task commits)

## Accomplishments
- Installed two human-verified packages: `react-native-reanimated-dnd@^2.0.0` (routine drag-reorder) and `@gorhom/bottom-sheet@^5.2.14` (day picker / exercise select)
- Declared all Phase 2 type contracts once (single source of truth) — 19 exported types/interfaces across exercise, routine, program, assignment
- Zod v4 schemas for exercise, routine, program with full RED→GREEN TDD cycle (21 tests passing)
- `filterExercises` pure function with case-insensitive search + category + locationType AND-semantics ('both' acts as wildcard)
- 4 typed collection refs (exercises/routines/programs/assignments) following the Phase 1 `usersCollection` pattern
- 4 new composite indexes (exercises/routines/programs by trainerId+name; users by role+trainerId+name for listClients) — total now 8
- 5-tab trainer shell (Clients | Exercises | Routines | Programs | Profile) with 4 sub-stack layouts + 4 placeholder screens; `/trainer` redirects to `/trainer/clients`
- Extended firestore rules tests with 9 Phase 2 cross-trainer denial cases (T-02-01)

## Exported Type Names
- `src/types/exercise.ts`: ExerciseCategory, LocationType, Exercise, CreateExerciseInput
- `src/types/routine.ts`: RoutineExercise, Routine, CreateRoutineInput
- `src/types/program.ts`: ProgramDay, ProgramWeek, Program, CreateProgramInput
- `src/types/assignment.ts`: AssignmentStatus, AssignmentSnapshotExercise, AssignmentSnapshotDay, AssignmentSnapshotWeek, AssignmentSnapshot, Assignment, CreateAssignmentInput, CreateAssignmentResult

## Schema Test Results
- exercise.schema.test.ts, routine.schema.test.ts, program.schema.test.ts, exercise.filter.test.ts — **21 tests passing**
- assignment.service.test.ts — `describe.skip` Wave 0 stub (implemented in Plan 02-04), 1 skipped
- Full RN project suite: 31 passed, 1 skipped, 0 failed

## Indexes Added (firestore.indexes.json — now 8 total)
- `exercises`: trainerId ASC + name ASC
- `routines`: trainerId ASC + name ASC
- `programs`: trainerId ASC + name ASC
- `users`: role ASC + trainerId ASC + name ASC (for Plan 02-03 listClients)
- (4 existing Phase 1 indexes preserved: sessions×2, assignments×2)

## Rules Test Cases Added (firestore/__tests__/rules.test.ts)
1. trainer-A cannot read trainer-B exercise
2. trainer cannot create exercise with foreign trainerId
3. trainer-A cannot read trainer-B routine
4. trainer-A cannot read trainer-B program
5. trainer-A cannot read assignment for trainer-B client
6. client can read assignment where clientId == own uid
7. client cannot read another client's assignment
8. client cannot create an assignment (trainers only)
9. owning trainer can read own assignment

## Tab Shell
Five tabs render in order: **Clients | Exercises | Routines | Programs | Profile**, with Obsidian Performance theme (tab bar bg #0E0E0E, active #00FF66, inactive #888888). Each new tab is a stack (`headerShown:false`) whose `index.tsx` shows a centered "(coming in plan 02-NN)" placeholder on a #0E0E0E background. `/trainer` redirects to `/trainer/clients`.

## npm Packages Installed (verified versions)
- `react-native-reanimated-dnd@^2.0.0` (resolved 2.0.0) — maintainer entropyconquers, MIT, no postinstall
- `@gorhom/bottom-sheet@^5.2.14` (resolved within 5.2.x) — maintainer gorhom, MIT, no postinstall

## Task Commits

1. **Task 1: install verified packages** - `5be834a` (chore)
2. **Task 2 RED: failing tests + type contracts** - `6a2bf04` (test)
3. **Task 2 GREEN: schemas, filter, collection refs, indexes, rules tests** - `f4af4a0` (feat)
4. **Task 3: 5-tab nav shell + sub-stacks + placeholders** - `cf87cb5` (feat)

_Note: Task 2 is a TDD task (test → feat). No refactor commit was needed — GREEN code was already clean._

## Decisions Made
- **href:null for the index route** instead of deleting it — `/trainer/index.tsx` must remain to host the `Redirect` to `/trainer/clients`, but must not appear as a 6th tab. `href:null` is the canonical expo-router suppression pattern.
- **Snapshot fields use `null`** (not `undefined`) — Firestore drops `undefined` but persists `null`; the immutable assignment snapshot needs explicit nulls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] index-route registration kept (`href:null`) to prevent a phantom 6th tab**
- **Found during:** Task 3 (nav shell)
- **Issue:** The plan's acceptance criterion `grep -c 'name="index"' src/app/trainer/_layout.tsx == 0` is incompatible with expo-router file-based routing. Since `index.tsx` physically exists (required to host the `/trainer` → `/trainer/clients` redirect), expo-router auto-discovers it and renders it as a visible 6th tab labeled "index" — violating the "exactly 5 tabs in order" must-have.
- **Fix:** Registered `<Tabs.Screen name="index" options={{ href: null }} />`, the canonical expo-router pattern to keep a route routable while hiding it from the tab bar. The functional requirement (5 tabs, working redirect) is fully satisfied; only the literal grep proxy differs.
- **Files modified:** src/app/trainer/_layout.tsx
- **Verification:** `npx tsc --noEmit` exits 0; `npx expo export --platform ios` exits 0; the 5 named tabs each grep == 1.
- **Committed in:** cf87cb5 (Task 3 commit)

**2. [Rule 3 - Blocking] Regenerated stale expo-router typed-routes cache**
- **Found during:** Task 3 (nav shell)
- **Issue:** `tsc` failed with TS2322 because `.expo/types/router.d.ts` (gitignored, auto-generated) predated the new `/trainer/{clients,exercises,routines,programs}` routes, so `<Redirect href="/trainer/clients" />` was not yet a known typed route.
- **Fix:** Briefly started `expo start` to trigger the typed-routes generator, then stopped it. The regenerated cache now lists all 5 trainer routes. No committed file changed (`.expo/` is gitignored).
- **Files modified:** none committed (.expo/types/router.d.ts is gitignored)
- **Verification:** `npx tsc --noEmit` exits 0 after regeneration.
- **Committed in:** n/a (cache-only)

---

**Total deviations:** 2 ((1) Rule-1 correctness fix to avoid a phantom tab, (2) Rule-3 cache regeneration)
**Impact on plan:** Both necessary for a clean compile and correct 5-tab UX. No scope creep — all plan artifacts delivered.

## Issues Encountered
- **Firestore rules emulator could not run in this environment** — `firebase emulators:exec` requires a Java runtime, which is not installed here (`Unable to locate a Java Runtime`). The plan's verify block explicitly notes this as a conditional dependency. Mitigation: the extended `rules.test.ts` typechecks clean and follows the exact existing harness pattern (same `assertFails`/`assertSucceeds`, two trainer contexts). The Phase 2 rule semantics it tests are already present and correct in `firestore.rules` (lines 76-108). **Deferred:** run `firebase emulators:exec --only firestore "npx jest --selectProjects firestore-rules --testPathPattern=rules"` on a machine with Java installed to prove the 9 new denial cases green.

## Known Stubs
- 4 trainer tab placeholder screens (`clients/index.tsx`, `exercises/index.tsx`, `routines/index.tsx`, `programs/index.tsx`) render "(coming in plan 02-NN)" text. **Intentional** per plan — Wave 2-4 plans (02-02 through 02-05) overwrite these with real screens. No data source is expected at this stage.
- `assignment.service.test.ts` is a `describe.skip` Wave 0 stub. **Intentional** — the service is implemented in Plan 02-04.

## User Setup Required
None - the two npm packages were installed and committed during execution. No external dashboard/env configuration required.

## Next Phase Readiness
- Wave 2 plans (02-02 exercises, 02-03 clients) can import `Exercise`/`Routine`/`Program`/`Assignment` types and `exerciseSchema`/`routineSchema`/`programSchema` directly — no redefinition.
- `exercisesCollection().where('trainerId','==',uid).orderBy('name')` will work after `firebase deploy --only firestore:indexes` (deploy is part of Wave 2 per plan).
- 5-tab shell ready; downstream plans fill placeholders without touching the shell.
- **Blocker (soft):** firestore rules emulator verification deferred until a Java-equipped environment is available.

## Self-Check: PASSED

All 16 spot-checked files exist on disk and all 4 task commits (5be834a, 6a2bf04, f4af4a0, cf87cb5) are present in git history.

---
*Phase: 02-trainer-content-creation*
*Completed: 2026-06-02*
