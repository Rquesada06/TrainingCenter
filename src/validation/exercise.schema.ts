/**
 * Exercise form validation schema — Phase 02 Plan 01 (EXER-01).
 *
 * Zod v4 API (project pins zod ^4.4.3):
 *   - z.enum([...] as const) for closed value sets (the deprecated v3 nativeEnum is NOT used)
 *   - z.coerce.number() for numeric form fields (inputs arrive as strings)
 *   - z.url() for URL validation (NOT z.string().url())
 *
 * Threat T-02-06: rejects invalid category/locationType and negative numerics
 * at the form boundary before any Firestore write (ASVS V5 Input Validation).
 */

import { z } from 'zod';

/** Closed set of exercise categories — kept in sync with ExerciseCategory in src/types/exercise.ts. */
export const EXERCISE_CATEGORIES = [
  'strength',
  'cardio',
  'functional',
  'hypertrophy',
  'HIIT',
  'mobility',
] as const;

/** Closed set of location types — kept in sync with LocationType in src/types/exercise.ts. */
export const LOCATION_TYPES = ['gym', 'home', 'both'] as const;

/** Optional URL: a valid http(s) URL, or an empty string (cleared field). */
const optionalUrl = z.url().optional().or(z.literal(''));

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(EXERCISE_CATEGORIES),
  locationTypes: z
    .array(z.enum(LOCATION_TYPES))
    .min(1, 'Select at least one location'),
  defaultSets: z.coerce.number().int().positive().optional(),
  defaultReps: z.coerce.number().int().positive().optional(),
  defaultDuration: z.coerce.number().int().nonnegative().optional(),
  defaultRest: z.coerce.number().int().nonnegative().optional(),
  videoUrl: optionalUrl,
  imageUrl: optionalUrl,
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
