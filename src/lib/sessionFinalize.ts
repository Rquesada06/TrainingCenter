/**
 * sessionFinalize — Phase 05 Plan 02 (LOG-04/D-07/D-08/HIST-04)
 *
 * Pure functions for deriving completedExerciseIds from logged sets and building
 * the finalized session payload for Firestore. No React, no Firebase.
 *
 * HIST-04 invariant (≥1-set rule):
 *   An exercise is counted complete if and only if it has at least one checked
 *   set (D-08). This is how `completedExerciseIds` is derived — NOT from the
 *   v1.0 per-exercise toggle.
 *
 * Pitfall 5 / T-05-03 (null-not-undefined):
 *   Unlogged set fields (`weight`, `reps`, `rpe`) are coerced to `null` explicitly.
 *   `undefined` would be stripped by `stripUndefinedDeep` in createSession, causing
 *   the key to vanish and Phase 6 readers to break.
 */

import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { LoggedExercise, LoggedSet, Session } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// deriveCompletedExerciseIds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the list of completed exercise IDs from logged exercises (HIST-04/D-08).
 *
 * An exercise is considered complete if it has at least one set with
 * `completed === true`. This replaces the v1.0 per-exercise toggle.
 *
 * @param logged - Array of per-exercise logged data from the session store.
 * @returns Array of exercise IDs for exercises with ≥1 completed set.
 */
export function deriveCompletedExerciseIds(logged: LoggedExercise[]): string[] {
  return (logged ?? [])
    .filter((ex) => ex.sets.some((s) => s.completed))
    .map((ex) => ex.exerciseId);
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveSessionState — shape of state needed from sessionStore
// ─────────────────────────────────────────────────────────────────────────────

export interface FinalizeSessionState {
  clientId: string;
  trainerId: string;
  assignmentId: string;
  date: string;
  weekIndex: number;
  dayIndex: number;
  mode: 'gym' | 'home';
  startedAt: string;
  completedAt: string;
  routineName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFinalizedSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Firestore-ready session payload from live session state.
 *
 * - `completedExerciseIds` is derived from logged sets (HIST-04/D-08 invariant).
 * - `totalExercises` = resolvedExercises.length (snapshot exercise count).
 * - Unlogged set fields are explicitly coerced to `null` — never `undefined`
 *   (Pitfall 5 / T-05-03: `stripUndefinedDeep` would drop `undefined` keys).
 * - Null-guards all array inputs with `?? []` like sessionDetail.ts.
 *
 * @param liveState - Core session metadata from the session store.
 * @param resolvedExercises - The snapshot exercises for this session's day.
 * @param loggedExercises - Per-exercise logged actuals from the session store.
 * @returns `Omit<Session, 'id'>` — ready for `createSession(data)`.
 */
export function buildFinalizedSession(
  liveState: FinalizeSessionState,
  resolvedExercises: AssignmentSnapshotExercise[],
  loggedExercises: LoggedExercise[],
): Omit<Session, 'id'> {
  const exercises = resolvedExercises ?? [];
  const logged = loggedExercises ?? [];

  // Build a map of logged exercises for O(1) lookup.
  const loggedMap = new Map<string, LoggedExercise>(
    logged.map((ex) => [ex.exerciseId, ex])
  );

  // Build the loggedExercises payload, ensuring null (not undefined) on unlogged fields.
  const finalizedLoggedExercises: LoggedExercise[] = exercises.map((ex) => {
    const loggedEx = loggedMap.get(ex.exerciseId);
    const sets: LoggedSet[] = Array.from(
      { length: ex.sets },
      (_, i): LoggedSet => {
        const loggedSet = loggedEx?.sets?.[i];
        return {
          setNumber: i + 1,
          weight: loggedSet?.weight ?? null,
          reps: loggedSet?.reps ?? null,
          rpe: loggedSet?.rpe ?? null,
          completed: loggedSet?.completed ?? false,
        };
      }
    );
    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      timed: ex.timed,
      sets,
    };
  });

  const completedExerciseIds = deriveCompletedExerciseIds(finalizedLoggedExercises);

  return {
    clientId: liveState.clientId,
    trainerId: liveState.trainerId,
    assignmentId: liveState.assignmentId,
    date: liveState.date,
    weekIndex: liveState.weekIndex,
    dayIndex: liveState.dayIndex,
    mode: liveState.mode,
    startedAt: liveState.startedAt,
    completedAt: liveState.completedAt,
    routineName: liveState.routineName,
    completedExerciseIds,
    totalExercises: exercises.length,
    loggedExercises: finalizedLoggedExercises,
  };
}
