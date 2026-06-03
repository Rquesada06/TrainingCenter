/**
 * Session type contracts — Phase 03 Plan 01
 *
 * Single source of truth for the SESSIONS Firestore collection.
 *
 * A session is a record of a client completing a workout day. It is written
 * once on finish and never mutated (CONTEXT.md D-12/D-13). Session fields use
 * `null` (not `undefined`) because Firestore stores `null` but drops `undefined`.
 */

/**
 * SESSIONS collection document shape.
 * `date` is a YYYY-MM-DD string (date-only, no timezone).
 * `startedAt` and `completedAt` are ISO 8601 timestamp strings set client-side.
 */
export interface Session {
  id: string;
  clientId: string;
  trainerId: string;
  assignmentId: string;
  /** YYYY-MM-DD */
  date: string;
  weekIndex: number;
  dayIndex: number;
  mode: 'gym' | 'home';
  completedExerciseIds: string[];
  totalExercises: number;
  startedAt: string;    // ISO timestamp string
  completedAt: string;  // ISO timestamp string
  /** Optional: routine name from snapshot for display in session history */
  routineName: string | null;
}
