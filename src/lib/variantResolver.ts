/**
 * variantResolver — Phase 03 Plan 01 (WORK-05, D-08, D-10)
 *
 * Pure function: given a snapshot exercise and a workout mode, returns the
 * correct exercise variant to display plus an optional mode-tag.
 * No React, no Firebase — consumed by workout/session.tsx + sessionStore.
 *
 * D-08: If primary fits mode → use primary. If primary doesn't fit but
 *        alternative does → swap to alternative. Both cases: modeTag = null.
 * D-10: If no valid variant exists for the chosen mode → keep the primary and
 *        set a modeTag ('gym_only' | 'home_only'). Trainer work is never dropped.
 *
 * LocationType 'both' counts as valid for BOTH gym and home.
 */

import type { AssignmentSnapshotExercise } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────

/** The client's chosen workout environment for a session. */
export type WorkoutMode = 'gym' | 'home';

/**
 * Result of resolving an exercise variant for a given mode.
 *
 * `exercise` — the exercise to display (primary or swapped alternative).
 *              NEVER null; trainer work is always shown (D-10).
 * `modeTag`  — null when the chosen mode is fully supported by the returned
 *              exercise; 'gym_only' or 'home_only' when no valid variant exists
 *              (D-10 fallback path).
 */
export interface ResolvedExercise {
  exercise: AssignmentSnapshotExercise;
  modeTag: 'gym_only' | 'home_only' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve which exercise variant to show given the current workout mode.
 *
 * Resolution order (D-08):
 *  1. If primary fits `mode` (has the mode in locationTypes, or has 'both') → return primary.
 *  2. Else if alternative exists and fits `mode` → return alternative.
 *  3. Else → return primary with a modeTag indicating the constraint (D-10).
 *
 * @param primary - The primary exercise from the assignment snapshot
 * @param mode    - The client's current session mode ('gym' | 'home')
 * @returns ResolvedExercise with the appropriate exercise and optional mode tag
 */
export function resolveVariant(
  primary: AssignmentSnapshotExercise,
  mode: WorkoutMode
): ResolvedExercise {
  // Determine if an exercise fits the chosen mode.
  // 'both' locationTypes means valid for gym AND home (wildcard).
  const fits = (exercise: AssignmentSnapshotExercise): boolean =>
    exercise.locationTypes.includes(mode) || exercise.locationTypes.includes('both');

  // D-08 path 1: Primary fits → return primary, no tag needed
  if (fits(primary)) {
    return { exercise: primary, modeTag: null };
  }

  // D-08 path 2: Primary doesn't fit; check alternative
  const alt = primary.alternativeExercise;
  if (alt && fits(alt)) {
    return { exercise: alt, modeTag: null };
  }

  // D-10 fallback: No valid variant for the chosen mode.
  // Always show primary; derive the tag from what the primary CAN do.
  // A primary with 'gym' or 'both' is gym-capable → tag is 'gym_only'.
  // A primary with only 'home' → tag is 'home_only'.
  const isGymCapable =
    primary.locationTypes.includes('gym') || primary.locationTypes.includes('both');
  const modeTag: 'gym_only' | 'home_only' = isGymCapable ? 'gym_only' : 'home_only';

  return { exercise: primary, modeTag };
}
