/**
 * Sign-in form validation schema — Phase 01 Plan 03
 *
 * Threat model T-03-01: validates email format + non-empty password at the
 * form boundary before any Firebase Auth call (ASVS V5 Input Validation).
 */

import { z } from 'zod';

export const signInSchema = z.object({
  /** Must be a valid email address format */
  email: z.string().email(),
  /** Must be non-empty — Firebase handles password correctness */
  password: z.string().min(1),
});

export type SignInValues = z.infer<typeof signInSchema>;
