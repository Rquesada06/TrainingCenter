---
phase: 05-per-set-logging-prescription-timers
plan: "03"
subsystem: client-workout-ui
tags: [tdd, components, per-set-logging, prefill, finalize, session-screen]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [SetRow, RpeStepper, session.tsx-per-set-wiring]
  affects: [05-05, 05-06]
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for SetRow + RpeStepper components
    - TDD RED/GREEN for session.tsx wiring acceptance test
    - 5-column flex-weight grid (SET 0.9/PESO 2.6/REPS 2.0/RPE 2.2/STATUS 1.6) with gap:8
    - Value-color rule (#888888 prefilled unconfirmed → #FFFFFF once edited/checked)
    - Done-check 28×28 circle adapted from ExerciseRow.tsx:144-159, hitSlop ≥44pt
    - RpeStepper clamp 1.0–10.0 step 0.5; starts from 5 on first + press from null
    - seedExercise + seededExercisesRef guard for exactly-once prefill on first expand
    - buildFinalizedSession replaces inline sessionRecord build (LOG-04)
    - withSaveFeedback wrapper unchanged (S2 pattern)
    - useQuery(fetchSessionsForAssignment) for prefill source — plain Session[], not paginated
    - D-08 ≥1-set rule: checkedCount > 0 → isCompleted; left-edge #00FF66 accent
    - Null-guard: storeLoggedSets[id] ?? [] for old v1.0 sessions
key_files:
  created:
    - src/components/workout/SetRow.tsx
    - src/components/workout/RpeStepper.tsx
    - src/components/workout/__tests__/SetRow.test.tsx
    - src/app/client/workout/__tests__/session.wiring.test.ts
  modified:
    - src/app/client/workout/session.tsx (additive: useQuery prefill, SetRow rows, buildFinalizedSession, left-edge accent, progress caption)
decisions:
  - "SetRow manages its own weightEdited/repsEdited local state for the value-color rule — avoids needing a separate store field for 'edited' tracking per set"
  - "RpeStepper starts at 5 (RPE_DEFAULT_START) when + pressed from null — gives a sensible mid-range starting point without blocking the user"
  - "seededExercisesRef (a useRef Set) tracks which exercises have been seeded; guarantees exactly-once seedExercise call per exercise per session render lifecycle"
  - "The session.tsx render drops ExerciseRow for weighted exercises entirely — replaces with inline SetRow table; timed exercises retain ExerciseRow for now (WorkTimerControl in Plan 05)"
  - "resolvedExercises is computed inline in handleFinish closure using the same resolveVariant pattern to avoid stale closure issues"
metrics:
  duration: "~11 minutes"
  completed: "2026-06-05"
  tasks: 2
  files: 5
---

# Phase 05 Plan 03: SetRow + RpeStepper + session.tsx Wiring Summary

Per-set logging UI end-to-end: `SetRow` (5-column weight/reps/RPE/done grid) and `RpeStepper` (compact 1-10 0.5-step picker) built TDD-first; `session.tsx` wired with prefill seeding on first expand, per-set `setSetValue`/`toggleSet` store actions, and `buildFinalizedSession` single-write finalize replacing the v1.0 inline `sessionRecord` build.

## What Was Built

### Task 1: SetRow + RpeStepper components

**src/components/workout/SetRow.tsx** (new):
- 5-column flex grid matching UI-SPEC A2 (SET 0.9 / PESO (KG) 2.6 / REPS 2.0 / RPE 2.2 / STATUS 1.6, gap 8).
- PESO + REPS cells: `TextInput` with `keyboardType="number-pad"`, focused-cell `border #00FF66`, placeholder `–` in `#444444`.
- Value color rule: `#888888` when `isPrefilled && !completed && !edited`; `#FFFFFF` otherwise (per-cell editedState tracked locally).
- Done-check: 28×28 circle (adapted from ExerciseRow.tsx:144-159); unchecked `border-2 border-[#444444]`; checked `bg-[#00FF66]` + Ionicons `checkmark` 16px `#0E0E0E`; `hitSlop` → ≥44pt; `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`.
- RPE cell: tappable, opens `RpeStepper` inline; collapsed shows the RPE value or `–`.
- Row highlight: `border border-[#00FF66]` when the set is checked (subtle completion signal).
- NO `textDecorationLine: 'line-through'` — v1.0 strikethrough dropped (Phase 5).

**src/components/workout/RpeStepper.tsx** (new):
- `[ − ] {value} [ + ]` + "Clear" affordance.
- Buttons 32×32 `border border-[#444444] rounded-lg`, Ionicons `remove`/`add` 16px `#FFFFFF`.
- Value mono 16/600 `#FFFFFF`; blank shows `–` (`#444444`).
- Clamp 1.0–10.0, step 0.5; `Math.round(x * 10) / 10` prevents floating-point drift.
- First `+` from null starts at 5 (RPE_DEFAULT_START — mid-range; not blocking).
- Clear → `onChange(null)`, only visible when value is set.
- `accessibilityRole="adjustable"` on container; − / + buttons have "Decrease/Increase RPE" labels.

**Tests:** 19 green (SetRow: 9, RpeStepper: 10).

### Task 2: session.tsx wiring

**src/app/client/workout/session.tsx** (modified):

**Prefill (LOG-03/D-09):**
- `useQuery({ queryKey: ['priorSessions', uid, assignment?.id], queryFn: fetchSessionsForAssignment })` — fetches all prior sessions once on mount. `staleTime: Infinity` (immutable for screen lifetime).
- `handleToggleExpand` calls `resolvePrefill(exercise, priorSessions)` + `seedExercise(exerciseId, seeds)` on first expand of a weighted exercise. `seededExercisesRef: Set<string>` prevents re-seeding on re-render.

**Per-set rows (LOG-01/02):**
- `storeLoggedSets`, `setSetValue`, `toggleSet`, `seedExercise` added from `useSessionStore`.
- Expanded weighted exercise renders `SetTableHeader` + `Array.from({ length: exercise.sets })` of `SetRow` components.
- Each `SetRow` sourced from `liveSets[i]` with `onChangeWeight/Reps/Rpe → setSetValue`, `onToggleDone → toggleSet`.
- Timed exercises retain the `ExerciseRow` path (WorkTimerControl added in Plan 05).

**Collapsed card (D-08, UI-SPEC A1):**
- `checkedCount = liveSets.filter(s => s.completed).length`.
- `isCompleted = checkedCount > 0` (D-08 ≥1-set rule — replaces v1.0 completedExerciseIds.includes).
- Progress caption: `"{checkedCount}/{exercise.sets} sets logged"` (weighted) / `"Hold {duration}s"` (timed). Caption color `#00FF66` when `checkedCount ≥ 1`, else `#888888`.
- Left-edge accent: `borderLeftWidth: 3, borderLeftColor: '#00FF66'` when complete (replaces v1.0 strikethrough).

**Finalize (LOG-04):**
- `buildFinalizedSession(liveState, resolvedExerciseList, loggedExercisesInput)` replaces the inline `sessionRecord` build (lines 253-266 v1.0). The `withSaveFeedback` wrapper (lines 268-284 v1.0) is UNCHANGED.
- `loggedExercisesInput` built from `storeLoggedSets` with null-guard `?? []`.
- `completedCount` + `total` now come from the finalized record's derived `completedExerciseIds` / `totalExercises`.
- Incomplete-confirm copy per UI-SPEC A5: "Finish session?" / "You've logged N of M exercises…".

**Old session null-guard:** `storeLoggedSets[exId] ?? []` — v1.0 sessions with no `loggedExercises` load without crashing.

**Tests:** 2 new wiring tests; total RN suite 259 green.

## Verification

- `npx jest --selectProjects react-native` — **259 tests, all green** (30 suites, 1 pre-existing skip in firestore-rules)
- `npx tsc --noEmit` — clean for `src/` (pre-existing errors in `functions/` directory only)
- Acceptance criteria:
  - `SetRow.tsx` contains `onToggleDone` and `accessibilityRole="checkbox"`; no rendered `textDecorationLine: 'line-through'` ✓
  - `RpeStepper.tsx` contains `Clear` and `accessibilityRole="adjustable"` ✓
  - `session.tsx` contains `buildFinalizedSession` + `SetRow` + `setSetValue|toggleSet` ✓
  - `withSaveFeedback` single-write finalize retained (still references `finishMutation` + `clearSession`) ✓

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 RED: SetRow + RpeStepper tests | eb1fab0 | src/components/workout/__tests__/SetRow.test.tsx |
| 1 GREEN: SetRow + RpeStepper impl | 23840bb | src/components/workout/SetRow.tsx, src/components/workout/RpeStepper.tsx, src/components/workout/__tests__/SetRow.test.tsx |
| 2 RED: session.tsx wiring tests | 9d5b0e7 | src/app/client/workout/__tests__/session.wiring.test.ts |
| 2 GREEN: session.tsx wiring | b6af1eb | src/app/client/workout/session.tsx, src/app/client/workout/__tests__/session.wiring.test.ts |

## Deviations from Plan

### Implementation Notes (not deviations)

**1. [Rule 2 - Missing functionality] seededExercisesRef guard for exactly-once seedExercise**
- Found during: Task 2 — seedExercise called on expand toggle; React re-renders could call it on every render.
- Fix: Added `seededExercisesRef: useRef<Set<string>>(new Set())` to guard first-expand seeding.
- This is not a plan deviation — it's a required implementation detail to meet LOG-03's "on first expand" requirement.

**2. RPE value-color is always #FFFFFF (never prefilled)**
- RPE is always user-entered (not carried down from prior sessions per D-02/prefill design).
- Therefore `isPrefilled` color rule applies only to weight/reps, not RPE. RPE cells are always `#FFFFFF` when set.

**3. resolvedExercises used inline in handleFinish via closure**
- `resolvedExercises` is computed from `exercises.map(resolveVariant(ex, mode))` at render time.
- In `handleFinish`, the same `resolvedExercises` array is used (it's in scope). This avoids stale closure risk by computing inside the effect.

## Known Stubs

None — all cells wire to live sessionStore state; SetRow receives real values from `storeLoggedSets[exId]`; finalize builds real loggedExercises payload.

## Threat Surface Scan

No new network endpoints or auth paths. The `fetchSessionsForAssignment` call is the same Firestore read already used in the session history features. The single-write finalize path (T-05-05/T-05-06) is routed through `buildFinalizedSession` (null coercion, Wave-0 tested) then `stripUndefinedDeep` in the existing `createSession`. No per-set Firestore writes introduced.

## Self-Check: PASSED
