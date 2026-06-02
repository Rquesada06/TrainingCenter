/**
 * Create Client form validation schema — Phase 02 Plan 03 (CLNT-01)
 *
 * Validates the trainer's add-client form before calling the
 * createClientAccount Cloud Function.
 *
 * Zod v4 API (CLAUDE.md): z.string().email() for email validation.
 * Temporary password minimum 6 chars matches Firebase Auth minimum.
 */

import { z } from 'zod';

export const createClientSchema = z.object({
  /** Client's display name — shown in the client list */
  name: z.string().min(1, 'Name is required'),
  /** Client's email — becomes their Firebase Auth login */
  email: z.string().email('Must be a valid email address'),
  /**
   * Temporary password set by the trainer.
   * Firebase Auth requires minimum 6 characters.
   * The client should be prompted to change this on first login (Phase 4 — PROF-01).
   */
  temporaryPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;
