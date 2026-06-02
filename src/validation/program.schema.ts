/**
 * Program form validation schema — Phase 02 Plan 01 (PROG-01).
 *
 * Zod v4 API. `durationWeeks` is capped at 26 (RESEARCH.md Pitfall 6) to keep the
 * assignment snapshot document under the Firestore 1 MiB limit for MVP.
 */

import { z } from 'zod';

export const programSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  durationWeeks: z.coerce.number().int().min(1).max(26),
});

export type ProgramFormValues = z.infer<typeof programSchema>;
