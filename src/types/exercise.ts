/**
 * Exercise type contracts — Phase 02 Plan 01
 *
 * Single source of truth for the EXERCISES Firestore collection.
 * Downstream Phase 2 plans MUST import these types, never redefine them.
 */

/**
 * Exercise category — drives filtering (EXER-04) and form selection (EXER-01).
 * Kept in sync with EXERCISE_CATEGORIES tuple in src/validation/exercise.schema.ts.
 */
export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'functional'
  | 'hypertrophy'
  | 'HIIT'
  | 'mobility';

/**
 * Where an exercise can be performed.
 * 'both' means it is valid for gym AND home — filter logic treats it as a wildcard.
 */
export type LocationType = 'gym' | 'home' | 'both';

/**
 * EXERCISES collection document shape.
 * Timestamp fields are `unknown` per the user.ts precedent (native Firestore Timestamp).
 */
export interface Exercise {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  category: ExerciseCategory;
  locationTypes: LocationType[];
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultRest?: number;
  videoUrl?: string;
  imageUrl?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

/**
 * Input contract for creating an exercise.
 * Server fills id/trainerId/timestamps.
 */
export type CreateExerciseInput = Omit<
  Exercise,
  'id' | 'trainerId' | 'createdAt' | 'updatedAt'
>;
