/**
 * prefill — Phase 05 Plan 02 (LOG-03/D-09/D-02)
 *
 * Pure function for seeding per-set initial values before a workout.
 * No React, no Firebase — consumed by the workout session screen.
 *
 * D-09 (prefill strategy):
 *   1. Find the most-recent prior session that has `loggedExercises` for this
 *      exercise. Use those actuals (weight/reps per set) as seeds.
 *   2. If no prior session has data for this exercise (first ever session, or
 *      only old v1.0 sessions without `loggedExercises`), fall back to the
 *      snapshot target: `repsMin` (PRES-01) or legacy `reps`, weight: null.
 *
 * D-02 (carry-down):
 *   Set N+1 seeds from set N's values when N+1 has no explicit prior data.
 *   This ensures the client doesn't have to retype the same weight for every set.
 *
 * Null-guard for v1.0 back-compat:
 *   `loggedExercises` is optional on Session (added Phase 05). Missing →
 *   guard with `?? []` exactly like sessionDetail.ts line 43. Never throws.
 */

import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { LoggedSet, Session } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrefill
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve prefill seed values for all sets of an exercise.
 *
 * @param exercise      - The AssignmentSnapshotExercise defining set count + targets.
 * @param priorSessions - All prior sessions for this assignment (newest-first or any order).
 * @returns Array of `LoggedSet` seeds (setNumber 1..N, completed:false, actuals or target).
 */
export function resolvePrefill(
  exercise: AssignmentSnapshotExercise,
  priorSessions: Session[],
): LoggedSet[] {
  const setCount = exercise.sets;

  // ── 1. Find the most-recent session with data for this exercise ────────────
  // Sort sessions by date descending to get most-recent first.
  const sortedSessions = [...priorSessions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  let priorSets: LoggedSet[] | null = null;

  for (const session of sortedSessions) {
    // v1.0 back-compat: `loggedExercises` may be undefined — null-guard with ?? []
    const loggedExercises = session.loggedExercises ?? [];
    const match = loggedExercises.find(
      (ex) => ex.exerciseId === exercise.exerciseId
    );
    if (match && match.sets.length > 0) {
      priorSets = match.sets;
      break;
    }
  }

  // ── 2. Build seed array ────────────────────────────────────────────────────
  if (priorSets !== null) {
    // Last-session actuals path (D-09).
    // Use actual weight/reps per set; carry-down when N+1 has no explicit data (D-02).
    return buildSeedsFromPrior(setCount, priorSets);
  }

  // ── 3. Target fallback (first session or no logged data) ──────────────────
  // Use repsMin (PRES-01 prescription), or legacy reps, or null.
  const targetReps = exercise.repsMin ?? exercise.reps ?? null;
  return buildSeedsFromTarget(setCount, targetReps);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build set seeds from prior session actuals, with carry-down (D-02).
 * Set N+1 inherits from set N when N+1 has no explicit prior data.
 */
function buildSeedsFromPrior(setCount: number, priorSets: LoggedSet[]): LoggedSet[] {
  const seeds: LoggedSet[] = [];
  let lastWeight: number | null = null;
  let lastReps: number | null = null;

  for (let i = 0; i < setCount; i++) {
    const prior = priorSets[i];
    if (prior) {
      // Explicit data from prior session
      lastWeight = prior.weight;
      lastReps = prior.reps;
    }
    // If no explicit prior for this set index, carry-down from previous set (D-02)
    seeds.push({
      setNumber: i + 1,
      weight: lastWeight,
      reps: lastReps,
      rpe: null,    // RPE is not carried down (subjective effort varies)
      completed: false,
    });
  }

  return seeds;
}

/**
 * Build set seeds from the snapshot target (no prior session data).
 * All sets get the same target reps; weight is null (no prior info).
 */
function buildSeedsFromTarget(
  setCount: number,
  targetReps: number | null,
): LoggedSet[] {
  return Array.from({ length: setCount }, (_, i): LoggedSet => ({
    setNumber: i + 1,
    weight: null,
    reps: targetReps,
    rpe: null,
    completed: false,
  }));
}
