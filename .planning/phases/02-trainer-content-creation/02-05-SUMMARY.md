---
phase: 02-trainer-content-creation
plan: 05
subsystem: programs-assignment
tags: [tanstack-query-v5, react-hook-form, zod-v4, gorhom-bottom-sheet, cloud-functions-v1, tdd, prog-01, prog-02, prog-03, prog-04, prog-05, prog-06, asgn-01, asgn-02, asgn-03, asgn-04]

# Dependency graph
requires:
  - phase: 02-trainer-content-creation
    plan: 01
    provides: Program/Assignment types, programSchema (Zod v4), programsCollection/assignmentsCollection refs, 5-tab shell
  - phase: 02-trainer-content-creation
    plan: 03
    provides: findActiveAssignmentForClient (ASGN-02 overwrite check), useClients, ClientPhoto, ClientListItem
  - phase: 02-trainer-content-creation
    plan: 04
    provides: useRoutines (day picker population), GestureHandlerRootView+BottomSheetModalProvider at root, routine builder pattern
provides:
  - functions/src/index.ts: createAssignment v1 onCall Cloud Function (deployable)
  - src/firebase/functions.ts: createAssignmentCallable + callCreateAssignment wrapper
  - src/services/assignment.service.ts: callCreateAssignment + findActiveAssignmentForClient re-export
  - src/services/program.service.ts: listPrograms/getProgram/createProgram/updateProgram/deleteProgram
  - 5 program hooks: usePrograms/useProgram/useCreateProgram/useUpdateProgram/useDeleteProgram
  - src/hooks/useCreateAssignment.ts: mutation with clientId+trainerId cache invalidation
  - src/components/programs/ProgramMetaForm.tsx: RHF + zodResolver(programSchema)
  - src/components/programs/WeekDayGrid.tsx: horizontal ScrollView Week×Day grid
  - src/components/programs/DayPickerSheet.tsx: forwardRef bottom sheet, routine list + REST/Unassigned
  - src/components/programs/ClientPickerSheet.tsx: forwardRef bottom sheet, client list
  - src/components/programs/AssignProgramModal.tsx: 5-step assign flow with ASGN-02 overwrite check
  - src/app/trainer/programs/index.tsx: FlatList program list (PROG-06)
  - src/app/trainer/programs/new.tsx: meta-only create (PROG-01)
  - src/app/trainer/programs/[programId].tsx: grid editor + assign + delete (PROG-02..05, ASGN-01..04)
affects: [phase-03-client-workout-execution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createAssignment uses v1 onCall CF (NOT v2) — same pattern as createClientAccount; v2 has auth propagation bug with @react-native-firebase/functions.httpsCallable() (Pitfall 5)"
    - "admin SDK uses exists as boolean property; RNFB v24 client SDK uses exists() as method — different APIs"
    - "Cloud Function builds snapshot server-side with parallel Promise.all for routine+exercise reads (ASGN-03)"
    - "800KB pre-flight size guard in CF before Firestore write (Pitfall 6)"
    - "ASGN-02: client-side findActiveAssignmentForClient check BEFORE CF call (UI warning); CF atomically marks prev as completed too (double defense)"
    - "ASGN-04: YYYY-MM-DD regex enforced client-side (AssignProgramModal) AND server-side (CF step 5)"
    - "Program CRUD + hooks mirror routine.service / useRoutines pattern exactly (dry duplication)"
    - "PROG-04: createProgram auto-generates weeks with Array(7).fill(null) per durationWeeks"
    - "WeekDayGrid horizontal ScrollView addresses Pitfall 5 (7-column overflow on iPhone SE)"
    - "DayPickerSheet + ClientPickerSheet: forwardRef+useImperativeHandle exposing present()/dismiss() — same pattern as Plan 02-04"
    - "stripUndefinedDeep applied to all program service writes"
    - "withSaveFeedback wraps all mutateAsync calls in screens + AssignProgramModal"

key-files:
  created:
    - functions/src/__tests__/createAssignment.test.ts
    - functions/src/index.ts (createAssignment added to existing file)
    - src/services/assignment.service.ts
    - src/services/__tests__/assignment.service.test.ts
    - src/services/program.service.ts
    - src/services/__tests__/program.service.test.ts
    - src/hooks/useCreateAssignment.ts
    - src/hooks/usePrograms.ts
    - src/hooks/useProgram.ts
    - src/hooks/useCreateProgram.ts
    - src/hooks/useUpdateProgram.ts
    - src/hooks/useDeleteProgram.ts
    - src/components/programs/ProgramMetaForm.tsx
    - src/components/programs/WeekDayGrid.tsx
    - src/components/programs/DayPickerSheet.tsx
    - src/components/programs/ClientPickerSheet.tsx
    - src/components/programs/AssignProgramModal.tsx
    - src/app/trainer/programs/new.tsx
    - src/app/trainer/programs/[programId].tsx
  modified:
    - src/firebase/functions.ts (createAssignmentCallable + callCreateAssignment added)
    - src/app/trainer/programs/index.tsx (replaced placeholder with real screen)

key-decisions:
  - "createAssignment CF uses admin SDK where exists is a boolean property (not a method) — unlike RNFB v24 client SDK"
  - "AssignProgramModal is a RN Modal (pageSheet presentation) rather than a bottom sheet — provides full screen real estate for the multi-step flow"
  - "Cloud Function test uses jest.mock('firebase-admin') module mock — avoids jest.spyOn TypeScript overload issue with the admin namespace"
  - "PROG-04 default weeks auto-generated in createProgram service, not in the hook or screen — single source of truth"
  - "DEPLOYMENT REQUIRED: createAssignment CF must be deployed before the assignment flow works on device — NOT deployed by this plan"

# Metrics
duration: ~57min
completed: 2026-06-02
---

# Phase 2 Plan 05: Programs + Assignment Summary

**Program builder (PROG-01..06) + assignment flow (ASGN-01..04) completing the "trainer can create a program and assign it to a client in under 3 minutes" core value prop. Cloud Function `createAssignment` builds the immutable snapshot server-side; deployment to Firebase is the human-verify gate for Task 4.**

## Performance

- **Duration:** ~57 min
- **Started:** 2026-06-02T21:33:22Z
- **Completed:** 2026-06-02T22:30:22Z
- **Tasks:** 3 of 4 implemented (Tasks 1-3 auto TDD); Task 4 is a planned `checkpoint:human-verify gate="blocking"` — cannot be automated (index build time, CF deployment, device smoke test)
- **Files created/modified:** 21

## Accomplishments

### Task 1: createAssignment Cloud Function + callable + assignment.service

- **`functions/src/index.ts`** — Added `createAssignment` v1 onCall CF (preserves `createClientAccount`):
  1. Reject unauthenticated → `HttpsError('unauthenticated')`
  2. Role check (must be trainer) → `HttpsError('permission-denied')`
  3. Program ownership check (`program.trainerId !== uid`) → `HttpsError('not-found')`
  4. Client validation (role='client' + trainerId=uid) → `HttpsError('permission-denied')`
  5. ASGN-04 date format regex `/^\d{4}-\d{2}-\d{2}$/` → `HttpsError('invalid-argument')`
  6. Server-side snapshot build with `Promise.all` for routine+exercise reads (performance)
  7. 800KB pre-flight size guard (Pitfall 6) → `HttpsError('failed-precondition')`
  8. Query previous active assignments for clientId
  9. Atomic batch: set new assignment + mark previous as 'completed'
  10. Return `{ assignmentId: newRef.id }`

- **`src/firebase/functions.ts`** — Added `createAssignmentCallable` + `callCreateAssignment` wrapper
- **`src/services/assignment.service.ts`** — Re-exports `callCreateAssignment` + `findActiveAssignmentForClient` (single import path for consumers)
- **`src/hooks/useCreateAssignment.ts`** — TanStack Query v5 mutation, invalidates `['activeAssignment', clientId]` + `['clients', trainerId]` on success

**Test coverage (TDD RED→GREEN):**
- 8 CF unit tests (unauthenticated, non-trainer, wrong-owner, success, batch-prev-complete, size-guard, returns-assignmentId, invalid-startDate) — all GREEN
- 2 service tests (callCreateAssignment unwraps data, findActiveAssignmentForClient re-export) — all GREEN

### Task 2: Program service + hooks + component primitives

- **`src/services/program.service.ts`** — `listPrograms/getProgram/createProgram/updateProgram/deleteProgram`
  - PROG-04: `createProgram` auto-generates `Array.from({ length: durationWeeks }, () => ({ days: Array(7).fill(null) }))` if `weeks` not provided
  - `stripUndefinedDeep` on all writes; `snap.exists()` (RNFB v24 method)
- **5 hooks** (`usePrograms/useProgram/useCreateProgram/useUpdateProgram/useDeleteProgram`) — exact TanStack Query v5 pattern matching Plan 02-04 routine hooks
- **`ProgramMetaForm`** — RHF + `zodResolver(programSchema)` + 3-generic `useForm<input, unknown, output>` (Pitfall 4); fields: name, description, durationWeeks (1-26)
- **`WeekDayGrid`** — horizontal `ScrollView` (Pitfall 5); sticky header D1-D7; per-week rows with null→REST/#888888 and routineId→truncated-name/#00FF66 cells; `Pressable` with onCellPress
- **`DayPickerSheet`** — `forwardRef<DayPickerSheetHandle>` exposing `present(w, d)`; `BottomSheetModal` + `BottomSheetFlatList`; Mark as Rest + Unassigned + routine list via `useRoutines()`

**Test coverage (TDD RED→GREEN):** 7 program.service tests — all GREEN

### Task 3: Screens + AssignProgramModal + ClientPickerSheet

- **`programs/index.tsx`** — FlatList with loading/error/empty states, header + Add button (PROG-06)
- **`programs/new.tsx`** — ProgramMetaForm → `useCreateProgram` → navigate to `[programId]` (PROG-01)
- **`programs/[programId].tsx`** — Full edit screen:
  - WeekDayGrid + DayPickerSheet for PROG-02/03/04
  - Edit metadata modal (ProgramMetaForm) for PROG-05
  - Alert.alert delete confirm → `useDeleteProgram` (PROG-05)
  - "Assign to Client" → AssignProgramModal (ASGN-01..04)
- **`ClientPickerSheet`** — `forwardRef` + `present()`, `useClients()`, `ClientPhoto` + email row
- **`AssignProgramModal`** — 5-step flow:
  1. `pickClient` → `ClientPickerSheet`
  2. `pickDate` → TextInput with YYYY-MM-DD regex guard (ASGN-04)
  3. Check `findActiveAssignmentForClient` (ASGN-02)
  4. `confirmOverwrite` — #FFD600 warning with existing program name
  5. `submitting` → `useCreateAssignment().mutateAsync` wrapped in `withSaveFeedback`

## Service/Hook Exports

| Export | File | Consumers |
|--------|------|-----------|
| `callCreateAssignment` | assignment.service.ts | AssignProgramModal |
| `findActiveAssignmentForClient` | assignment.service.ts (re-export) | AssignProgramModal |
| `createAssignmentCallable` | firebase/functions.ts | assignment.service |
| `listPrograms(uid)` | program.service.ts | usePrograms |
| `getProgram(id)` | program.service.ts | useProgram |
| `createProgram({trainerId, input})` | program.service.ts | useCreateProgram |
| `updateProgram(id, partial)` | program.service.ts | useUpdateProgram |
| `deleteProgram(id)` | program.service.ts | useDeleteProgram |
| `usePrograms()` | usePrograms.ts | programs/index.tsx |
| `useProgram(id)` | useProgram.ts | programs/[programId].tsx |
| `useCreateProgram()` | useCreateProgram.ts | programs/new.tsx |
| `useUpdateProgram()` | useUpdateProgram.ts | programs/[programId].tsx |
| `useDeleteProgram()` | useDeleteProgram.ts | programs/[programId].tsx |
| `useCreateAssignment()` | useCreateAssignment.ts | AssignProgramModal |

## Task Commits

1. **Task 1 RED: failing CF + service tests** — `a7dd816` (test)
2. **Task 1 GREEN: createAssignment CF + callable + assignment.service + useCreateAssignment** — `9bf2c2e` (feat)
3. **Task 2 RED: failing program service tests** — `ede2877` (test)
4. **Task 2 GREEN: program service + hooks + component primitives** — `f0dac26` (feat)
5. **Task 3: programs screens + AssignProgramModal + ClientPickerSheet** — `be02729` (feat)

## Test Results

- `functions/src/__tests__/createAssignment.test.ts`: **8 tests passing** (GREEN after TDD RED→GREEN)
- `src/services/__tests__/assignment.service.test.ts`: **2 tests passing** (GREEN after TDD RED→GREEN)
- `src/services/__tests__/program.service.test.ts`: **7 tests passing** (GREEN after TDD RED→GREEN)
- Full RN project suite: **63 passed, 1 skipped, 0 failed**
- `npx tsc --noEmit`: exits 0 (root)
- `cd functions && npx tsc --noEmit`: exits 0 (functions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] admin SDK `exists` is a boolean property, not a method**
- **Found during:** Task 1 GREEN (CF implementation)
- **Issue:** The Cloud Function test suite failed with `TypeError: Boolean has no call signatures` — `programSnap.exists()` was written as a method call. The admin SDK (`firebase-admin`) uses `exists` as a boolean property on `DocumentSnapshot`, unlike the RNFB v24 client SDK where `exists()` IS a method (the critical patterns note applies to client-side code only).
- **Fix:** Changed all `snap.exists()` → `snap.exists` inside `functions/src/index.ts`. Client-side services still correctly use `snap.exists()`.
- **Files modified:** `functions/src/index.ts`, `functions/src/__tests__/createAssignment.test.ts`
- **Committed in:** `9bf2c2e`

**2. [Rule 1 - Bug] CF test mock: `jest.spyOn(admin, 'firestore')` TS overload error**
- **Found during:** Task 1 RED (initial test write)
- **Issue:** Attempting to use `jest.spyOn` on the admin namespace caused TS2769 overload errors — the admin module's `firestore` export doesn't match the expected spy signature.
- **Fix:** Replaced with `jest.mock('firebase-admin', () => {...})` module mock. Simpler and avoids the TypeScript issue entirely.
- **Files modified:** `functions/src/__tests__/createAssignment.test.ts`
- **Committed in:** `a7dd816` (test fix before GREEN)

**3. [Rule 2 - Missing Critical Functionality] `withSaveFeedback` applied to all screen mutations**
- **Found during:** Task 3 (screen implementation)
- **Issue:** Per critical patterns instruction, all `mutateAsync` calls must be guarded by `withSaveFeedback`. Initial drafts of screens used bare `await mutateAsync(...)`.
- **Fix:** Wrapped all `mutateAsync` calls in `programs/new.tsx`, `programs/[programId].tsx`, and `AssignProgramModal.tsx` with `withSaveFeedback`.
- **Files modified:** All three screen/component files
- **Committed in:** `be02729`

## Known Stubs

None — all program and assignment data paths are wired to live service/hooks/Cloud Function. No placeholder rendering.

**DEPLOYMENT NOTE (not a stub — a deployment gate):**
The `createAssignment` Cloud Function is implemented and unit-tested but NOT YET DEPLOYED to Firebase. The assignment flow (`AssignProgramModal → submitting step`) will fail at runtime until:
```
cd functions && npm run build && firebase deploy --only functions:createAssignment
```
The Task 4 human-verify checkpoint covers this deployment step.

## Threat Flags

None — all threat-model mitigations from the plan's threat register are implemented:
- **T-02-04**: CF step 2 rejects non-trainer (tested by case 2)
- **T-02-XPROG**: CF step 3 rejects cross-trainer program (tested by case 3)
- **T-02-XCLIENT**: CF step 4 rejects cross-trainer client (tested by case 4 — implementation validates role='client' AND trainerId=uid)
- **T-02-SNAP-SPOOF**: Snapshot built server-side from Firestore reads; client sends only {programId, clientId, startDate}
- **T-02-SNAP-SIZE**: 800KB pre-flight guard in CF step 7 (tested by case 6)
- **T-02-DATE-FORMAT**: YYYY-MM-DD regex in CF step 5 (tested by case 7) + client-side guard in AssignProgramModal
- **T-02-OVERWRITE**: ASGN-02 — AssignProgramModal calls findActiveAssignmentForClient before CF; confirmOverwrite step requires explicit "Overwrite" button; CF marks prev as 'completed' atomically
- **T-02-INDEX-DOS**: Programs index (trainerId+name) was added in Plan 02-01; deploy in Task 4
- **T-02-CF-V2-AUTH**: v1 onCall used (verified: `grep "functions.https.onCall" functions/src/index.ts` returns 4 occurrences for 2 functions)

## Pending (Task 4 — Human Verify Gate)

Task 4 is a `checkpoint:human-verify gate="blocking"`. The following must be done by the trainer before phase sign-off:

1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Deploy Cloud Function: `cd functions && npm run build && firebase deploy --only functions:createAssignment`
3. Build and run dev client: `npx expo start --dev-client`
4. Complete the 3-minute trainer journey smoke test (7 sub-steps in the plan)
5. Inspect Firestore console: verify snapshot shape + ASGN-03 immutability

## Self-Check: PASSED

Files verified to exist on disk:
- functions/src/__tests__/createAssignment.test.ts: EXISTS
- functions/src/index.ts (createAssignment): EXISTS
- src/firebase/functions.ts (createAssignmentCallable): EXISTS
- src/services/assignment.service.ts: EXISTS
- src/services/program.service.ts: EXISTS
- src/hooks/useCreateAssignment.ts: EXISTS
- src/hooks/usePrograms.ts: EXISTS
- src/hooks/useProgram.ts: EXISTS
- src/hooks/useCreateProgram.ts: EXISTS
- src/hooks/useUpdateProgram.ts: EXISTS
- src/hooks/useDeleteProgram.ts: EXISTS
- src/components/programs/ProgramMetaForm.tsx: EXISTS
- src/components/programs/WeekDayGrid.tsx: EXISTS
- src/components/programs/DayPickerSheet.tsx: EXISTS
- src/components/programs/ClientPickerSheet.tsx: EXISTS
- src/components/programs/AssignProgramModal.tsx: EXISTS
- src/app/trainer/programs/index.tsx: EXISTS (replaced placeholder)
- src/app/trainer/programs/new.tsx: EXISTS
- src/app/trainer/programs/[programId].tsx: EXISTS

Commits verified in git log:
- a7dd816: test(02-05): RED — failing tests for createAssignment CF + assignment.service
- 9bf2c2e: feat(02-05): GREEN — createAssignment CF + callable + assignment.service + useCreateAssignment
- ede2877: test(02-05): RED — failing tests for program.service
- f0dac26: feat(02-05): GREEN — program service + hooks + ProgramMetaForm + WeekDayGrid + DayPickerSheet
- be02729: feat(02-05): programs list/create/edit screens + AssignProgramModal + ClientPickerSheet

---
*Phase: 02-trainer-content-creation*
*Completed (Tasks 1-3): 2026-06-02*
*Task 4: Awaiting human verification (deploy + smoke test)*
