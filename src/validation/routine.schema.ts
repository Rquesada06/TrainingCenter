/**
 * Routine form validation schema — Phase 02 Plan 01 (ROUT-01) + Phase 05 Plan 01 (PRES-01/02/03).
 *
 * Zod v4 API. A routine has at least one exercise entry; each entry needs a
 * positive set count and a rest value. `reps` and `duration` are both optional —
 * a strength move uses reps, a timed hold uses duration.
 *
 * Phase 05 Plan 01 additions:
 *   - repsMin/repsMax: optional integer range with refine (repsMin ≤ repsMax — PRES-01/D-10)
 *   - targetRpe: optional 1–10 float, 0.5 step (PRES-02)
 *   - timed: optional boolean; missing means weighted (PRES-03/D-11)
 */

import { z } from 'zod';

export const routineExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    name: z.string().min(1),
    sets: z.coerce.number().int().positive(),
    reps: z.coerce.number().int().positive().optional(),
    duration: z.coerce.number().int().nonnegative().optional(),
    rest: z.coerce.number().int().nonnegative(),
    notes: z.string().optional(),
    alternativeExerciseId: z.string().optional(),
    order: z.coerce.number().int().nonnegative(),
    // Phase 05 Plan 01 — prescription fields (PRES-01/02/03)
    repsMin: z.coerce.number().int().positive().optional(),
    repsMax: z.coerce.number().int().positive().optional(),
    targetRpe: z.coerce.number().min(1).max(10).optional(),
    timed: z.boolean().optional(),
  })
  .refine(
    (d) => d.repsMin == null || d.repsMax == null || d.repsMin <= d.repsMax,
    { message: 'Min must be ≤ max', path: ['repsMax'] }
  );

export const routineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  exercises: z
    .array(routineExerciseSchema)
    .min(1, 'Add at least one exercise'),
});

export type RoutineFormValues = z.infer<typeof routineSchema>;
