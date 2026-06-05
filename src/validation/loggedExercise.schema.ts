/**
 * Logged exercise validation schema — Phase 05 Plan 02 (LOG-04)
 *
 * Zod v4 API. Validates per-set data recorded by the client during a workout.
 *
 * CRITICAL (Pitfall 5 / T-05-03):
 *   Use `.nullable()` NOT `.optional()` for weight/reps/rpe.
 *   `.nullable()` yields `null` for unlogged fields; `.optional()` yields
 *   `undefined` which is stripped by `stripUndefinedDeep` in createSession,
 *   causing the key to vanish in Firestore (breaks Phase 6 readers).
 */

import { z } from 'zod';

/**
 * Per-set log schema.
 * `weight`, `reps`, `rpe` are nullable (not optional) — null = unlogged.
 * `completed` is always required.
 */
export const loggedSetSchema = z.object({
  setNumber: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative().nullable(),   // null = unlogged, NOT optional/undefined
  reps: z.coerce.number().int().nonnegative().nullable(),
  rpe: z.coerce.number().min(1).max(10).nullable(),
  completed: z.boolean(),                                // always present
});

/**
 * Per-exercise log schema. Contains the exercise metadata and its set logs.
 */
export const loggedExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  timed: z.boolean(),
  sets: z.array(loggedSetSchema),
});

export type LoggedSetInput = z.infer<typeof loggedSetSchema>;
export type LoggedExerciseInput = z.infer<typeof loggedExerciseSchema>;
