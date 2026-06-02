---
phase: 02-trainer-content-creation
plan: 04
subsystem: routines-builder
tags: [tanstack-query-v5, react-hook-form, zod-v4, useFieldArray, react-native-reanimated-dnd, gorhom-bottom-sheet, gesture-handler, rout-01, rout-02, rout-03, rout-04, rout-05, rout-06, rout-07]

# Dependency graph
requires:
  - phase: 02-trainer-content-creation
    plan: 01
    provides: Routine types, routinesCollection ref, routineSchema (Zod v4), react-native-reanimated-dnd + @gorhom/bottom-sheet installed, trainer tab shell
  - phase: 02-trainer-content-creation
    plan: 02
    provides: useExercises() hook + exercise.service pattern, ExerciseListItem, exercise defaults (defaultSets/Reps/Duration/Rest)
provides:
  - src/services/routine.service.ts (listRoutines, getRoutine, createRoutine, updateRoutine, deleteRoutine)
  - src/hooks/useRoutines.ts, useRoutine.ts, useCreateRoutine.ts, useUpdateRoutine.ts, useDeleteRoutine.ts
  - src/components/routines/RoutineBuilder.tsx (master form), RoutineExerciseRow, SortableExerciseList, ExercisePickerSheet, AlternativeExercisePicker
  - src/app/trainer/routines/index.tsx (ROUT-07 list), new.tsx (ROUT-01 create), [routineId].tsx (ROUT-06 edit/delete)
  - Root layout wrapped with GestureHandlerRootView + BottomSheetModalProvider (shared infra for Plan 02-05 program builder sheets)
affects: [02-05-programs-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Routine service mirrors exercise.service / client.service: pure async functions, typed collection refs, serverTimestamp on create/update"
    - "TDD RED-GREEN cycle: failing service test commit → impl commit (same pattern as 02-02 / 02-03)"
    - "RHF useFieldArray name:'exercises' drives the sortable exercise list; replace() syncs visual drag order back to form state"
    - "react-native-reanimated-dnd Sortable wrapped in SortableExerciseList, onOrderChange → useFieldArray.replace()"
    - "@gorhom/bottom-sheet via forwardRef + useImperativeHandle exposing present()/dismiss() — parent opens sheets imperatively"
    - "Multi-select picker seeds per-exercise defaults from source exercise (defaultSets/Reps/Duration/Rest) on first pick"
    - "Alternative-exercise picker filters out the row's own exerciseId so an exercise cannot be its own alternative (T-02-XREF)"
    - "Root layout: GestureHandlerRootView outermost, BottomSheetModalProvider inside — required by gesture-handler + bottom-sheet"

key-files:
  created:
    - src/services/routine.service.ts
    - src/services/__tests__/routine.service.test.ts
    - src/hooks/useRoutines.ts
    - src/hooks/useRoutine.ts
    - src/hooks/useCreateRoutine.ts
    - src/hooks/useUpdateRoutine.ts
    - src/hooks/useDeleteRoutine.ts
    - src/components/routines/RoutineExerciseRow.tsx
    - src/components/routines/ExercisePickerSheet.tsx
    - src/components/routines/AlternativeExercisePicker.tsx
    - src/components/routines/SortableExerciseList.tsx
    - src/components/routines/RoutineBuilder.tsx
    - src/app/trainer/routines/new.tsx
    - src/app/trainer/routines/[routineId].tsx
  modified:
    - src/app/trainer/routines/index.tsx (replaced placeholder with real list screen)
    - src/app/_layout.tsx (added GestureHandlerRootView + BottomSheetModalProvider wrappers)

key-decisions:
  - "Drag-reorder synced to RHF via useFieldArray.replace(newOrder.map(id => fields.find(...))) rather than move(), so any whole-list reorder commits atomically"
  - "Bottom sheets exposed via forwardRef + useImperativeHandle(present/dismiss) so RoutineBuilder controls open/close imperatively without prop-drilling visibility state"
  - "Per-exercise overrides default-seeded from the source exercise's defaults on first pick (CONTEXT.md 'first pick uses exercise defaults')"
  - "Task 4 (on-device drag + bottom-sheet UX) DEFERRED to manual UAT — animation behavior cannot be verified in this headless environment (VALIDATION.md manual-only matrix, ROUT-04)"

patterns-established:
  - "Imperative bottom-sheet control: forwardRef + useImperativeHandle exposing present()/dismiss()"
  - "Sortable list → RHF bridge: onOrderChange callback maps reordered ids back through useFieldArray.replace()"

requirements-completed: [ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05, ROUT-06, ROUT-07]

# Metrics
duration: ~30min
completed: 2026-06-02
---

# Phase 2 Plan 04: Routine Builder Summary

**Trainer routine builder — multi-exercise selection via @gorhom/bottom-sheet, per-exercise sets/reps/duration/rest/notes overrides, gym/home alternative-exercise cross-references, drag-reorder via react-native-reanimated-dnd wired to RHF useFieldArray, and full list/create/edit/delete screens. On-device drag + sheet UX deferred to manual UAT.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-06-02
- **Tasks:** 3 of 4 implemented (Task 1 TDD, Tasks 2-3 auto); Task 4 is a human-verify checkpoint deferred to manual UAT
- **Files modified:** 16

## Accomplishments

- **Routine service** (`src/services/routine.service.ts`): `listRoutines` (`where('trainerId','==',uid).orderBy('name','asc')` — T-02-01), `getRoutine`, `createRoutine` (serverTimestamp createdAt/updatedAt), `updateRoutine`, `deleteRoutine` — mirrors the exercise.service pattern. Unit-tested via TDD RED→GREEN.
- **Five TanStack Query v5 hooks**: `useRoutines`, `useRoutine`, `useCreateRoutine`, `useUpdateRoutine` (invalidates both `['routines', uid]` and `['routine', id]`), `useDeleteRoutine`.
- **RoutineBuilder** master form: RHF `useForm` + `zodResolver(routineSchema)` + `useFieldArray({ name: 'exercises' })`; "+ Add Exercises" opens the multi-select sheet; sortable list of `RoutineExerciseRow`; delete is `Alert.alert` confirm-gated.
- **ExercisePickerSheet**: `BottomSheetModal` + `BottomSheetFlatList`, multi-select (local `Set<exerciseId>`), Confirm seeds new rows with defaults from each source exercise (ROUT-01, ROUT-02 seed).
- **AlternativeExercisePicker**: single-select sheet filtering out the row's own `exerciseId` so an exercise can't be its own alternative (ROUT-05, T-02-XREF).
- **RoutineExerciseRow**: 4 `Controller`-wired numeric fields (sets/reps/duration/rest, number-pad) + notes field + alternative button (ROUT-02, ROUT-03, ROUT-05).
- **SortableExerciseList**: wraps `react-native-reanimated-dnd` Sortable; `onOrderChange` → `useFieldArray.replace()` to commit drag order to form state (ROUT-04).
- **Three screens**: list (`index.tsx`, ROUT-07) with empty state + exercise count; create (`new.tsx`, ROUT-01) via `useCreateRoutine`; edit/delete (`[routineId].tsx`, ROUT-06) via `useRoutine` + `useUpdateRoutine` + `useDeleteRoutine`.
- **Root layout**: added `GestureHandlerRootView` (outermost) + `BottomSheetModalProvider` (inner) — required by gesture-handler and @gorhom/bottom-sheet, and shared with Plan 02-05's program builder.

## Service/Hook Exports

| Export | File | Consumers |
|--------|------|-----------|
| `listRoutines(trainerId)` | routine.service.ts | useRoutines |
| `getRoutine(id)` | routine.service.ts | useRoutine |
| `createRoutine({trainerId, input})` | routine.service.ts | useCreateRoutine |
| `updateRoutine(id, partial)` | routine.service.ts | useUpdateRoutine |
| `deleteRoutine(id)` | routine.service.ts | useDeleteRoutine |
| `useRoutines()` | useRoutines.ts | routines/index.tsx, Plan 02-05 day picker |
| `useRoutine(id)` | useRoutine.ts | routines/[routineId].tsx |
| `useCreateRoutine()` | useCreateRoutine.ts | routines/new.tsx |
| `useUpdateRoutine()` | useUpdateRoutine.ts | routines/[routineId].tsx |
| `useDeleteRoutine()` | useDeleteRoutine.ts | routines/[routineId].tsx |

## Task Commits

1. **Task 1 RED: failing routine service tests** - `85b152e` (test)
2. **Task 1 GREEN: routine CRUD service + hooks + root layout providers** - `947d93d` (feat)
3. **Task 2: RoutineExerciseRow, ExercisePickerSheet, AlternativeExercisePicker, SortableExerciseList, RoutineBuilder** - `2167c3a` (feat)
4. **Task 3: routines list, create, edit/delete screens wired end-to-end** - `c366f48` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Decisions Made

- **Drag order → RHF via `replace()`** rather than `move()`: the Sortable `onOrderChange` returns the full reordered id list, so `replace(newOrder.map(id => fields.find(f => f.id === id)!))` commits the visible order atomically.
- **Imperative sheet control** via `forwardRef` + `useImperativeHandle(present/dismiss)` keeps sheet-open state out of the form's render tree.
- **Defaults seeded on pick** from the source exercise's `defaultSets/Reps/Duration/Rest` so a freshly added exercise is immediately usable.

## Deviations from Plan

None — Tasks 1–3 executed as written. Task 4 is a planned `checkpoint:human-verify` (not a deviation); see Deferred / Pending Verification.

## Deferred / Pending Verification

### Task 4 — On-device drag-reorder + bottom-sheet UX (DEFERRED to manual UAT)

**Status:** NOT DONE — awaiting on-device test. The plan marks this `checkpoint:human-verify gate="blocking"` because the Reanimated v4 + `react-native-reanimated-dnd` combination is new and must be eyeball-tested on a physical device / simulator per RESEARCH.md Pitfall 1 and the VALIDATION.md manual-only matrix (ROUT-04 "animation behavior requires physical device / simulator"). It **cannot be automated in this headless environment.**

The implementation is complete and TypeScript-clean; only the runtime UX confirmation remains. To complete UAT:

1. `npx expo start --dev-client` and open the EAS dev client on a device/simulator (Expo Go does not work with react-native-firebase per CLAUDE.md).
2. Sign in as a trainer with ≥5 exercises, go to Routines → "+ Add".
3. Verify: sheet slides up smoothly; multi-select persists until Confirm; defaults populate; number-pad on overrides; **long-press drag reorders without flicker / worklet errors** (the Pitfall 1 risk — T-02-DRAG); alternative picker works; save → reopen preserves order, overrides, notes, alternative.
4. If the drag flickers / snaps incorrectly, the documented fallback is RESEARCH.md A6 (custom long-press + RHF `move()`).

## Known Stubs

None — all routine-builder data paths are wired to live service/hooks. No placeholder/empty-data rendering introduced by this plan.

## Threat Flags

None — all threat-model mitigations are implemented:
- **T-02-01** (Information Disclosure): `listRoutines` uses `where('trainerId','==',uid)` + existing firestore.rules routines pattern.
- **T-02-06** (Tampering): `routineSchema` (Plan 02-01) enforces `exercises.min(1)` + positive numeric fields via `zodResolver`.
- **T-02-XREF** (Tampering): `AlternativeExercisePicker` filters out the row's primary `exerciseId`.
- **T-02-ALT-XTRAINER** (Information Disclosure): alternative picker uses `useExercises()`, already trainerId-scoped (Plan 02-02).
- **T-02-DRAG** (DoS / flicker): covered by the deferred Task 4 human-verify checkpoint above.

## Issues Encountered

- **Firestore rules emulator cannot run in this environment** — `firebase emulators:exec` requires a Java runtime (no JRE installed). Same soft-blocker as Plans 02-01 and 02-03. This plan adds no new rules tests, but the existing routines rules remain unverified against the emulator here. **Deferred:** run the rules suite on a machine with Java installed.
- **Post-pause root-cause fixes (by orchestrator, on main tree — not part of this plan's routine code):** While this plan was paused at the Task 4 checkpoint, the orchestrator fixed several app-wide defects that made the trainer shell renderable: the root `QueryClientProvider` was missing (now mounted in `src/app/_layout.tsx`), RNFB v24 makes `DocumentSnapshot.exists` a **method** not a property (fixed across auth + services), undefined values are now stripped before Firestore writes, and save-error alerts were added. These are documented in commits `bb7ae20`, `acf6e50`, `552feca`, `270028e`, `98cd763`, `a2de4d1`. They do not alter the routine-builder code delivered here and were not redone.

## Next Phase Readiness

- Plan 02-05 (programs/assignment) can `useRoutines()` to populate the program day picker.
- `GestureHandlerRootView` + `BottomSheetModalProvider` are mounted at root — Plan 02-05's program builder sheets work without further root changes.
- **Pending before sign-off:** Task 4 on-device drag + bottom-sheet UAT, and the Firestore rules emulator run (Java required).

## Self-Check: PASSED

All 16 created/modified files exist on disk. All 4 task commits (85b152e, 947d93d, 2167c3a, c366f48) are present in git history.

---
*Phase: 02-trainer-content-creation*
*Completed: 2026-06-02*
