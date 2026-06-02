/**
 * Routine form validation schema — Phase 02 Plan 01 (ROUT-01).
 *
 * Zod v4 API. A routine has at least one exercise entry; each entry needs a
 * positive set count and a rest value. `reps` and `duration` are both optional —
 * a strength move uses reps, a timed hold uses duration.
 */

import { z } from 'zod';

export const routineExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  sets: z.coerce.number().int().positive(),
  reps: z.coerce.number().int().positive().optional(),
  duration: z.coerce.number().int().nonnegative().optional(),
  rest: z.coerce.number().int().nonnegative(),
  notes: z.string().optional(),
  alternativeExerciseId: z.string().optional(),
  order: z.coerce.number().int().nonnegative(),
});

export const routineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  exercises: z
    .array(routineExerciseSchema)
    .min(1, 'Add at least one exercise'),
});

export type RoutineFormValues = z.infer<typeof routineSchema>;
