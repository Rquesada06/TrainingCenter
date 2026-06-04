/**
 * sessionDetail — Phase 04 (HIST-02)
 *
 * Pure function for resolving which exercises were completed vs skipped
 * in a session, re-deriving names from the assignment snapshot (Option A).
 * No React, no Firebase — consumed by the session detail screen.
 *
 * Option A rationale: the assignment snapshot is fully denormalised and already
 * cached by TanStack Query. Re-deriving from the snapshot requires zero schema
 * changes and no migration of Phase 3 session data (RESEARCH.md § Pattern 5).
 */

import type {
  AssignmentSnapshotDay,
  AssignmentSnapshotExercise,
} from '@/types/assignment';

/**
 * Result of partitioning exercises from an assignment snapshot day into
 * those completed and those skipped during a session.
 */
export interface ResolvedSessionExercises {
  completed: AssignmentSnapshotExercise[];
  skipped: AssignmentSnapshotExercise[];
}

/**
 * Partition exercises from an assignment snapshot day into completed and skipped.
 *
 * @param day                - The AssignmentSnapshotDay for the session's weekIndex/dayIndex.
 *                             Accepts null or undefined (e.g. missing snapshot data) — returns empty arrays.
 * @param completedExerciseIds - Exercise IDs from the session's `completedExerciseIds` field.
 * @returns { completed, skipped } — both arrays contain AssignmentSnapshotExercise objects.
 *
 * An exercise is "completed" if its `exerciseId` is in the `completedExerciseIds` set.
 * All others are "skipped".
 */
export function resolveSessionExercises(
  day: AssignmentSnapshotDay | null | undefined,
  completedExerciseIds: string[]
): ResolvedSessionExercises {
  // Null/undefined day or rest day (no routine) → nothing to resolve.
  const exercises = day?.routine?.exercises ?? [];

  if (exercises.length === 0) {
    return { completed: [], skipped: [] };
  }

  const completedSet = new Set(completedExerciseIds);

  const completed: AssignmentSnapshotExercise[] = [];
  const skipped: AssignmentSnapshotExercise[] = [];

  for (const exercise of exercises) {
    if (completedSet.has(exercise.exerciseId)) {
      completed.push(exercise);
    } else {
      skipped.push(exercise);
    }
  }

  return { completed, skipped };
}
