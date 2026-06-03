---
phase: 03-client-workout-execution
plan: "01"
subsystem: client-workout-foundation
tags: [types, firestore, pure-functions, date-math, tdd, wave-0]
dependency_graph:
  requires: [02-04]
  provides: [Session type, sessionsCollection ref, workoutDayComputer, variantResolver]
  affects: [03-02, 03-03, 03-04, 03-05]
tech_stack:
  added: []
  patterns:
    - pure-function module (no React, no Firebase) — mirrors exerciseFilter.ts discipline
    - local-midnight date parsing via new Date(y, m-1, d) — avoids ECMAScript UTC trap
    - discriminated union result type — WorkoutDayResult six states
    - TDD RED/GREEN cycle per task
key_files:
  created:
    - src/types/session.ts
    - src/lib/workoutDayComputer.ts
    - src/lib/__tests__/workoutDayComputer.test.ts
    - src/lib/__tests__/variantResolver.test.ts
    - src/lib/variantResolver.ts
  modified:
    - src/firebase/firestore.ts
decisions:
  - "parseDateOnly uses new Date(y, m-1, d) constructor — local midnight, not UTC"
  - "localTodayString uses getFullYear/getMonth/getDate — not toISOString which is UTC"
  - "dayOffset uses Math.floor(msDiff / msPerDay) — absorbs ±1h DST jitter safely"
  - "WorkoutDayResult no_assignment state produced by caller (when assignment is null), not by computeTodayWorkout itself"
  - "D-10 fallback: gym_only tag derived from primary.locationTypes[0] == 'gym' || 'both'; otherwise home_only"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-06-03"
  tasks_completed: 2
  files_changed: 6
---

# Phase 03 Plan 01: Foundation — Session Type, sessionsCollection, workoutDayComputer, variantResolver

**One-liner:** Local-midnight date math (parseDateOnly + localTodayString) + six-state computeTodayWorkout + gym/home resolveVariant — pure modules with 29 unit tests covering UTC-drift regression and the full gym/home/both/no-alt matrix.

---

## What Was Built

### Session type contract (`src/types/session.ts`)

New interface `Session` with 12 fields following the null-not-undefined Firestore discipline (matching `assignment.ts` conventions):
- `id`, `clientId`, `trainerId`, `assignmentId`, `date` (YYYY-MM-DD), `weekIndex`, `dayIndex`, `mode`, `completedExerciseIds`, `totalExercises`, `startedAt`, `completedAt`, `routineName`

### sessionsCollection typed ref (`src/firebase/firestore.ts`)

Added `import type { Session }` alongside existing type imports and appended `sessionsCollection(): CollectionReference<Session>` immediately after `assignmentsCollection()`, matching the exact existing ref pattern.

### workoutDayComputer (`src/lib/workoutDayComputer.ts`)

Pure module (no React, no Firebase) implementing:
- `parseDateOnly(yyyymmdd)` — parses YYYY-MM-DD as local midnight via `new Date(y, m-1, d)`
- `localTodayString()` — returns today as YYYY-MM-DD using `getFullYear/getMonth/getDate`
- `dayOffset(startDateStr, todayStr)` — `Math.floor((today - start) / msPerDay)` whole-day integer
- `WorkoutDayResult` — discriminated union of 5 tagged states (no_assignment produced by caller)
- `computeTodayWorkout(assignment, todayStr)` — 6-state machine implementing D-01..D-05

### variantResolver (`src/lib/variantResolver.ts`)

Pure module (no React, no Firebase) implementing:
- `WorkoutMode = 'gym' | 'home'`
- `ResolvedExercise { exercise, modeTag }`
- `resolveVariant(primary, mode)` — D-08 primary-fits/alt-swap, D-10 no-valid-variant fallback with gym_only/home_only tag; exercise is NEVER null

---

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `workoutDayComputer.test.ts` | 16 | parseDateOnly (3), localTodayString (2), dayOffset (3), computeTodayWorkout (8 — all 6 states) |
| `variantResolver.test.ts` | 13 | primary-fits (4), alt-swap (3), no-valid-variant (4), never-null (2) |
| **Total** | **29** | **All passing** |

UTC-drift regression: `parseDateOnly('2025-01-01').getDate()` must return `1` not `31` (catches UTC-5 bug).

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors in test fixture builder**

- **Found during:** Task 1 GREEN phase (TypeScript check)
- **Issue:** Initial test fixture used a function with inline type assertions that had narrowing issues: `type: 'rest' as const` was assigned to a slot typed as `'rest' | 'routine' | null`, and a nested import was placed inside a function body.
- **Fix:** Rewrote fixture as top-level named constants (`REST_DAY`, `NULL_DAY`, `ROUTINE_DAY`) and a `makeAssignment(startDate, durationWeeks, dayGrid?)` that accepts a typed `AssignmentSnapshotDay[][]` grid, eliminating all type narrowing issues.
- **Files modified:** `src/lib/__tests__/workoutDayComputer.test.ts`
- **Commit:** 761b65a (included in Task 1 commit)

---

## Known Stubs

None — this plan is types + pure functions. No data flows to UI rendering.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. The `sessionsCollection()` ref declares a typed collection handle; all ownership enforcement is server-side in `firestore.rules` (sessions block: `clientId == request.auth.uid`). No queries issued in this plan.

No new threat flags.

---

## Self-Check

Files exist:
- `src/types/session.ts` ✓
- `src/firebase/firestore.ts` ✓ (contains sessionsCollection)
- `src/lib/workoutDayComputer.ts` ✓
- `src/lib/__tests__/workoutDayComputer.test.ts` ✓
- `src/lib/variantResolver.ts` ✓
- `src/lib/__tests__/variantResolver.test.ts` ✓

Commits exist:
- 761b65a — feat(03-01): Session type + sessionsCollection ref + workoutDayComputer
- d3f5332 — feat(03-01): variantResolver pure function with tests

Tests: 29/29 passing
TypeScript: 0 errors

## Self-Check: PASSED
