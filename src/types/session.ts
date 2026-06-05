/**
 * Session type contracts — Phase 03 Plan 01 + Phase 05 Plan 02 (LOG-01..04)
 *
 * Single source of truth for the SESSIONS Firestore collection.
 *
 * A session is a record of a client completing a workout day. It is written
 * once on finish and never mutated (CONTEXT.md D-12/D-13). Session fields use
 * `null` (not `undefined`) because Firestore stores `null` but drops `undefined`.
 *
 * Phase 05 additions: LoggedSet + LoggedExercise types; `loggedExercises` added
 * as optional to Session for v1.0 back-compat. Every reader must null-guard.
 * Unlogged set fields use `null` (never `undefined`) — Pitfall 5 / T-05-03.
 */

/**
 * Per-set data recorded by the client during a workout (LOG-01/LOG-02).
 * Unlogged fields are `null` (not `undefined`) for Firestore compatibility.
 */
export interface LoggedSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

/**
 * Per-exercise logged data recorded during a session (LOG-04).
 * `timed` mirrors the snapshot prescription (PRES-03/D-11).
 */
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  timed: boolean;
  sets: LoggedSet[];
}

/**
 * SESSIONS collection document shape.
 * `date` is a YYYY-MM-DD string (date-only, no timezone).
 * `startedAt` and `completedAt` are ISO 8601 timestamp strings set client-side.
 */
export interface Session {
  id: string;
  clientId: string;
  trainerId: string;
  assignmentId: string;
  /** YYYY-MM-DD */
  date: string;
  weekIndex: number;
  dayIndex: number;
  mode: 'gym' | 'home';
  completedExerciseIds: string[];
  totalExercises: number;
  startedAt: string;    // ISO timestamp string
  completedAt: string;  // ISO timestamp string
  /** Optional: routine name from snapshot for display in session history */
  routineName: string | null;
  /**
   * Per-exercise logged actuals (Phase 05 / LOG-04).
   * Optional for v1.0 back-compat — every reader must null-guard with `?? []`.
   * `completedExerciseIds` is derived from this on finalize (HIST-04 invariant).
   */
  loggedExercises?: LoggedExercise[];
}
