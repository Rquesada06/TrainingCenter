/**
 * Exercise client-side filter — Phase 02 Plan 01 (EXER-04, EXER-05).
 *
 * Pure function applied to an already-fetched exercise list (the trainer's full
 * library is small enough to filter client-side; Firestore only scopes by trainerId).
 * All active filters combine with AND semantics.
 */

import type {
  Exercise,
  ExerciseCategory,
  LocationType,
} from '@/types/exercise';

export interface ExerciseFilters {
  search?: string;
  category?: ExerciseCategory;
  locationType?: LocationType;
}

export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters
): Exercise[] {
  const search = filters.search?.trim().toLowerCase();

  return exercises.filter((exercise) => {
    // Case-insensitive substring match on name.
    if (search && !exercise.name.toLowerCase().includes(search)) {
      return false;
    }

    // Exact category match.
    if (filters.category && exercise.category !== filters.category) {
      return false;
    }

    // locationType matches if the exercise lists it explicitly or is 'both' (wildcard).
    if (filters.locationType) {
      const matches =
        exercise.locationTypes.includes(filters.locationType) ||
        exercise.locationTypes.includes('both');
      if (!matches) {
        return false;
      }
    }

    return true;
  });
}
