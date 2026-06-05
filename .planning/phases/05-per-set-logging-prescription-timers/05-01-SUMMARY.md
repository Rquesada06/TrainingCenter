---
phase: 05-per-set-logging-prescription-timers
plan: "01"
subsystem: types-schema-cloud-function
tags: [prescription, schema, cloud-function, tdd, types, pres-01, pres-02, pres-03]
dependency_graph:
  requires: []
  provides:
    - repsMin/repsMax/targetRpe/timed on RoutineExercise
    - repsMin/repsMax/targetRpe/timed on AssignmentSnapshotExercise
    - rep-range refine + RPE bounds + timed boolean on routineExerciseSchema
    - buildSnapshotExercise copies new fields (main + alternative branch)
  affects:
    - functions/src/index.ts (buildSnapshotExercise + SnapshotExercise interface)
    - src/types/routine.ts (RoutineExercise)
    - src/types/assignment.ts (AssignmentSnapshotExercise)
    - src/validation/routine.schema.ts (routineExerciseSchema)
tech_stack:
  added: []
  patterns:
    - "Zod v4 .refine() on object for cross-field validation (repsMin <= repsMax)"
    - "Cloud Function field copy: (routineEx.field as T | undefined) ?? null/false"
    - "null-not-undefined for Firestore snapshot fields (T | null convention)"
    - "Additive type extension keeping legacy reps? for v1.0 back-compat"
key_files:
  created: []
  modified:
    - src/types/routine.ts
    - src/types/assignment.ts
    - src/validation/routine.schema.ts
    - src/validation/__tests__/routine.schema.test.ts
    - functions/src/index.ts
    - functions/src/__tests__/createAssignment.test.ts
    - src/lib/__tests__/sessionDetail.test.ts
    - src/lib/__tests__/variantResolver.test.ts
    - src/lib/__tests__/workoutDayComputer.test.ts
decisions:
  - "Use zod v4 .issues (not .errors) for error inspection in tests — v4 API change"
  - "timed field uses boolean (not boolean | null) on AssignmentSnapshotExercise since it always has a value on new snapshots (defaults false)"
  - "Alternative exercise branch uses defaults (null/null/null/false) — per-alt prescription not supported in v1.1"
metrics:
  duration: "8 minutes"
  completed_date: "2026-06-05"
  tasks: 2
  files_modified: 9
---

# Phase 05 Plan 01: Prescription Schema Foundation Summary

Five-tier prescription schema (PRES-01/02/03) with repsMin/repsMax/targetRpe/timed propagated through types, zod schema (rep-range refine + RPE bounds), and Cloud Function snapshot builder.

## What Was Built

This plan implements the Wave-0 foundation layer for trainer prescription fields. New trainer-set fields are silently invisible to clients unless they traverse all five tiers — this plan covers four of the five (the builder UI is Plan 04). Without the Cloud Function tier, Plan 04's builder fields would never reach the workout screen.

### Task 1: Types + Schema

- **`RoutineExercise`** (src/types/routine.ts) — Extended with `repsMin?: number`, `repsMax?: number`, `targetRpe?: number`, `timed?: boolean`. Legacy `reps?` retained for D-10 back-compat.
- **`AssignmentSnapshotExercise`** (src/types/assignment.ts) — Mirrored with `repsMin: number | null`, `repsMax: number | null`, `targetRpe: number | null`, `timed: boolean`. Uses null-not-undefined per Firestore convention; `timed` defaults `false` (always present on new snapshots).
- **`routineExerciseSchema`** (src/validation/routine.schema.ts) — Added prescription fields with `.refine(d => d.repsMin == null || d.repsMax == null || d.repsMin <= d.repsMax, { message: 'Min must be ≤ max', path: ['repsMax'] })`. `targetRpe` bounded 1–10 (0.5 step allowed). Zod v4 API throughout.

### Task 2: Cloud Function Snapshot (TIER 4)

- **`SnapshotExercise`** interface in `functions/src/index.ts` — Extended with the four prescription fields.
- **`buildSnapshotExercise`** main return — Copies prescription fields from routineEx with safe defaults: `(routineEx.repsMin as number | undefined) ?? null`, `timed: (routineEx.timed as boolean | undefined) ?? false`.
- **`buildSnapshotExercise` alternative branch** — Defaults: `repsMin: null, repsMax: null, targetRpe: null, timed: false` (no per-alt prescription in v1.1).
- T-05-01 mitigation applied: only named fields are copied (no spread of arbitrary client keys into the snapshot).

## Tests

| Suite | Tests | Status |
|-------|-------|--------|
| src/validation/__tests__/routine.schema.test.ts | 12 | GREEN |
| functions/src/__tests__/createAssignment.test.ts | 11 | GREEN |
| All RN tests | 161 | GREEN |
| TypeScript | — | CLEAN |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zod v4 .issues API in test**
- **Found during:** Task 1 RED → GREEN transition
- **Issue:** Test used `result.error.errors.find(...)` (zod v3 API). In zod v4, the property is `result.error.issues` (an array), not `.errors`. `.errors` was `undefined`, causing TypeError at runtime.
- **Fix:** Changed test to use `result.error.issues.find(...)` per zod v4 API (CLAUDE.md documents zod ^4.4.3).
- **Files modified:** `src/validation/__tests__/routine.schema.test.ts`
- **Commit:** 3cf2049

**2. [Rule 2 - Missing critical functionality] Updated existing test fixtures to include new required fields**
- **Found during:** Task 2 GREEN — `npx tsc --noEmit` reported 5 errors in existing test files
- **Issue:** `AssignmentSnapshotExercise` now requires `repsMin, repsMax, targetRpe, timed` fields (non-optional per null-not-undefined convention). Three existing test files (sessionDetail, variantResolver, workoutDayComputer) constructed fixture objects without these fields.
- **Fix:** Added `repsMin: null, repsMax: null, targetRpe: null, timed: false` to all affected fixtures. Used spread `...DEFAULT_PRESCRIPTION` in variantResolver to avoid repetition.
- **Files modified:** `src/lib/__tests__/sessionDetail.test.ts`, `src/lib/__tests__/variantResolver.test.ts`, `src/lib/__tests__/workoutDayComputer.test.ts`
- **Commit:** 4b08b44

## Operations Note (for Plan 06)

The Cloud Function changes require redeployment before they take effect for new assignments:

```bash
firebase deploy --only functions
```

If redeployment returns a 403 error (as documented in project memory), re-run:

```bash
node scripts/grant-invoker.mjs
```

This is a known pattern from Phase 2 (MEMORY.md: "re-run scripts/grant-invoker.mjs after functions redeploy (403 fix)"). Existing assignment snapshots are immutable — the new fields only appear in assignments created after redeployment. This is exercised on-device in Plan 06 (integration verification).

## Known Stubs

None — all four fields are fully typed and wired through the schema and Cloud Function. The builder UI (tier 3) is deferred to Plan 04 by design.

## Threat Flags

No new threat surface beyond what was documented in the plan's threat model. T-05-01 (field injection) and T-05-02 (schema bypass) are both mitigated:
- T-05-01: `buildSnapshotExercise` copies only named fields with explicit type casts, never spreads `routineEx`.
- T-05-02: `.refine(repsMin <= repsMax)` + `.max(10)` RPE bounds reject malformed prescriptions before write.

## TDD Gate Compliance

- RED commit: `f2bb71a test(05-01): add failing tests for prescription fields` (Task 1)
- GREEN commit: `3cf2049 feat(05-01): extend types and routine schema with prescription fields`
- RED commit: `8d0b616 test(05-01): add failing tests for snapshot prescription field propagation`
- GREEN commit: `4b08b44 feat(05-01): propagate prescription fields through Cloud Function snapshot builder`

Both TDD gates satisfied.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/types/routine.ts | FOUND |
| src/types/assignment.ts | FOUND |
| src/validation/routine.schema.ts | FOUND |
| functions/src/index.ts | FOUND |
| 05-01-SUMMARY.md | FOUND |
| Commit f2bb71a (RED Task 1) | FOUND |
| Commit 3cf2049 (GREEN Task 1) | FOUND |
| Commit 8d0b616 (RED Task 2) | FOUND |
| Commit 4b08b44 (GREEN Task 2) | FOUND |
