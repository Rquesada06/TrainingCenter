---
phase: 05-per-set-logging-prescription-timers
plan: "02"
subsystem: session-logging-core
tags: [tdd, pure-libs, zustand, zod, session-finalize, prefill, timer, logged-sets]
dependency_graph:
  requires: [05-01]
  provides: [sessionFinalize, prefill, timer, loggedExercise.schema, sessionStore.loggedSets]
  affects: [05-03, 05-04, 05-05, 05-06]
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for all five units (3 pure libs + 1 zod validator + 1 store extension)
    - Immutable-update pattern for Zustand (mirrors toggleExercise style)
    - null-not-undefined coercion for Firestore-safe payloads (Pitfall 5/T-05-03)
    - Custom Zustand persist merge for pre-Phase-5 blob back-compat
    - Absolute-endsAt timer math (D-06 — no tick accumulation)
    - last-session-actual → trainer-target prefill fallback (D-09)
    - carry-down seeding (D-02) for set N+1 from set N
key_files:
  created:
    - src/lib/sessionFinalize.ts
    - src/lib/__tests__/sessionFinalize.test.ts
    - src/lib/prefill.ts
    - src/lib/__tests__/prefill.test.ts
    - src/lib/timer.ts
    - src/lib/__tests__/timer.test.ts
    - src/validation/loggedExercise.schema.ts
    - src/validation/__tests__/loggedExercise.schema.test.ts
  modified:
    - src/types/session.ts (additive: LoggedSet + LoggedExercise + Session.loggedExercises?)
    - src/stores/sessionStore.ts (additive: loggedSets + setSetValue/toggleSet/seedExercise + partialize + merge)
    - src/stores/__tests__/sessionStore.test.ts (12 new tests for loggedSets)
decisions:
  - "Custom Zustand persist merge (not default Object.assign) ensures loggedSets={} on pre-Phase-5 blob hydration — prevents undefined bleeding into the per-set render path"
  - "startSession explicitly resets loggedSets:{} so a resumed session from a previous day starts clean (not carrying stale per-set data)"
  - "sessionFinalize maps over resolvedExercises (not loggedExercises) to build the final payload — ensures all exercises appear even if the client skipped some sets"
  - "RPE is not carried down in prefill (D-02) — RPE is subjective and should not be pre-populated from prior effort values"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-05"
  tasks: 3
  files: 11
---

# Phase 05 Plan 02: Pure Libs + Store Extension (Wave-0 Test-First) Summary

Five tested Wave-0 units built test-first: `sessionFinalize.ts` (HIST-04 >=1-set derivation + null-not-undefined finalize), `prefill.ts` (last-session-actual → target fallback + carry-down), `timer.ts` (absolute-endsAt math), `loggedExercise.schema.ts` (nullable zod v4), and `sessionStore.ts` extended with `loggedSets` crash-safe live state.

## What Was Built

### Task 1: Session types + sessionFinalize.ts + loggedExercise zod schema

**src/types/session.ts** (additive):
- Added `LoggedSet { setNumber, weight|null, reps|null, rpe|null, completed }` and `LoggedExercise { exerciseId, name, timed, sets }` interfaces above `Session`.
- Added `loggedExercises?: LoggedExercise[]` to `Session` (optional for v1.0 back-compat; `completedExerciseIds`/`totalExercises` preserved).

**src/lib/sessionFinalize.ts** (new, pure):
- `deriveCompletedExerciseIds(logged)`: exercises with `sets.some(s => s.completed)` mapped to IDs — the HIST-04 ≥1-set rule.
- `buildFinalizedSession(liveState, resolvedExercises, loggedExercises)`: maps over `resolvedExercises` (not `loggedExercises`) so all exercises appear in the payload; coerces unlogged fields to `null` explicitly (never `undefined` — T-05-03/Pitfall 5); null-guards all inputs with `?? []`.

**src/validation/loggedExercise.schema.ts** (new, zod v4):
- `loggedSetSchema`: `weight/reps/rpe` use `.nullable()` not `.optional()` — `null` persists through `stripUndefinedDeep`; `undefined` would be dropped.
- `loggedExerciseSchema`: exercises with `exerciseId`, `name`, `timed`, `sets[]`.

**Tests:** 25 green (sessionFinalize: 10, loggedExercise.schema: 15).

### Task 2: prefill.ts + timer.ts

**src/lib/timer.ts** (new, pure):
- `remainingMs(endsAt, now) = Math.max(0, endsAt - now)` — clamps at 0.
- `addFifteen(endsAt) = endsAt + 15_000` — +15s button.
- `isExpired(endsAt, now) = endsAt - now <= 0` — true at boundary.
- `formatMmSs(ms)` — "M:SS" display formatter.

**src/lib/prefill.ts** (new, pure):
- `resolvePrefill(exercise, priorSessions)`: sorts sessions by date descending; finds the most-recent one with `loggedExercises` for the exercise; seeds each set from actual `weight`/`reps`.
- Fallback: `repsMin ?? reps ?? null` target from snapshot, `weight: null`.
- Carry-down (D-02): set N+1 inherits from set N when N+1 has no explicit prior data.
- v1.0 back-compat: `session.loggedExercises ?? []` — never throws on old sessions.
- RPE is not carried down (subjective; cleared between sessions).

**Tests:** 26 green (timer: 12, prefill: 14).

### Task 3: sessionStore loggedSets extension

**src/stores/sessionStore.ts** (extended):
- `loggedSets: Record<string, LoggedSet[]>` added to `LocalSessionState` + `INITIAL: {}`.
- `setSetValue(exerciseId, setNumber, field, value)`: immutable-update for weight/reps/rpe.
- `toggleSet(exerciseId, setNumber)`: flips `completed` without mutating other fields.
- `seedExercise(exerciseId, seeds)`: initializes `loggedSets[exerciseId]` from prefill output.
- `loggedSets` added to `partialize` — crash-safe (survives force-kill mid-workout).
- Custom `merge` function: `loggedSets: persisted?.loggedSets ?? {}` — pre-Phase-5 hydrated blobs default to `{}` not `undefined`.
- `startSession` explicitly resets `loggedSets: {}` for clean per-day state.
- `clearSession` calls `set(INITIAL)` → resets `loggedSets` automatically.

**Tests:** 17 green (5 existing preserved + 12 new loggedSets tests).

## Verification

- `npx jest src/lib/__tests__/sessionFinalize.test.ts src/lib/__tests__/prefill.test.ts src/lib/__tests__/timer.test.ts src/validation/__tests__/loggedExercise.schema.test.ts src/stores/__tests__/sessionStore.test.ts` — **68 tests, all green**
- `npx tsc --noEmit` — clean for `src/` (pre-existing errors in `functions/` directory only — firebase-admin/firebase-functions package resolution, not caused by this plan)

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1: Session types + sessionFinalize + zod schema | 61ef428 | src/types/session.ts, src/lib/sessionFinalize.ts, src/lib/__tests__/sessionFinalize.test.ts, src/validation/loggedExercise.schema.ts, src/validation/__tests__/loggedExercise.schema.test.ts |
| 2: prefill.ts + timer.ts | 7ee0c70 | src/lib/prefill.ts, src/lib/__tests__/prefill.test.ts, src/lib/timer.ts, src/lib/__tests__/timer.test.ts |
| 3: sessionStore loggedSets extension | 1b1ce34 | src/stores/sessionStore.ts, src/stores/__tests__/sessionStore.test.ts |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Notes (not deviations)

**1. buildFinalizedSession maps over resolvedExercises, not loggedExercises**
- The plan's action said to build `loggedExercises` from liveState logged data.
- Implemented by mapping over `resolvedExercises` (the snapshot list) and looking up each in a `loggedMap`. This ensures all exercises appear in the finalize payload even if the client logged zero sets — consistent with the null-not-undefined requirement.

**2. RPE not carried down in prefill (by design)**
- D-02 says carry-down applies to weight/reps. RPE is subjective per-session effort and not carried. This matches the plan's intent ("set N+1's seed derives from set N's edited values") which refers to the objective load values (weight/reps), not subjective RPE.

**3. Custom Zustand merge for back-compat**
- Added `merge:` option to the persist config to guarantee `loggedSets = {}` on pre-Phase-5 blob hydration. This is strictly additive and required for correctness (Rule 2 — missing critical functionality: without it, `s.loggedSets` could be `undefined` for returning users with a cached session).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what is documented in the plan's threat model (T-05-03: mitigated by `null` coercion in `buildFinalizedSession`; T-05-04: accepted, existing rules unchanged).

## Self-Check: PASSED
