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
 */
export interface RoutineExercise {
  exerciseId: string;
  /** Denormalised exercise name — snapshot at the time it was added to the routine. */
  name: string;
  sets: number;
  reps?: number;
  duration?: number;
  rest: number;
  notes?: string;
  alternativeExerciseId?: string;
  order: number;
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
