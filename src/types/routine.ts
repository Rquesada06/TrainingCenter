/**
 * Routine type contracts — Phase 02 Plan 01
 *
 * Single source of truth for the ROUTINES Firestore collection.
 * A routine is an ordered list of exercises (with prescribed sets/reps).
 */

/**
 * One exercise entry inside a routine.
 * `name` is denormalised from the source Exercise for fast rendering without joins.
 * `order` is the explicit sort position used by the drag-reorder UI (ROUT-04).
 *
 * Phase 05 Plan 01 (PRES-01/02/03): added prescription fields.
 * Legacy `reps?` is retained for v1.0 back-compat (D-10).
 * `timed?: boolean` — missing means weighted (NEVER infer from field presence — D-11).
 */
export interface RoutineExercise {
  exerciseId: string;
  /** Denormalised exercise name — snapshot at the time it was added to the routine. */
  name: string;
  sets: number;
  /** Legacy reps field — kept for v1.0 back-compat. Prefer repsMin/repsMax for new prescriptions. */
  reps?: number;
  duration?: number;
  rest: number;
  notes?: string;
  alternativeExerciseId?: string;
  order: number;
  /** Rep range lower bound (PRES-01). Must be ≤ repsMax when both are set. */
  repsMin?: number;
  /** Rep range upper bound (PRES-01). Must be ≥ repsMin when both are set. */
  repsMax?: number;
  /** Target RPE 1–10, 0.5 step (PRES-02). Optional. */
  targetRpe?: number;
  /** True if this is a timed/duration exercise (PRES-03). Missing means weighted (D-11). */
  timed?: boolean;
}

/**
 * ROUTINES collection document shape.
 */
export interface Routine {
  id: string;
  trainerId: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: unknown;
  updatedAt: unknown;
}

/**
 * Input contract for creating a routine. Server fills id/trainerId/timestamps.
 */
export type CreateRoutineInput = Omit<
  Routine,
  'id' | 'trainerId' | 'createdAt' | 'updatedAt'
>;
