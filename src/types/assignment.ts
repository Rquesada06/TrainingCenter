/**
 * Assignment type contracts — Phase 02 Plan 01
 *
 * Single source of truth for the ASSIGNMENTS Firestore collection.
 *
 * An assignment is an immutable SNAPSHOT of a program at the moment it was
 * assigned to a client. The snapshot fully denormalises routines and exercises
 * so the client never needs cross-collection reads and so later edits to the
 * trainer's source program/routine/exercise never mutate an active assignment
 * (CONTEXT.md Decision 4). Snapshot fields use `null` (not `undefined`) because
 * Firestore stores `null` but drops `undefined`.
 */

import type { LocationType } from '@/types/exercise';

/**
 * Lifecycle status of an assignment.
 */
export type AssignmentStatus = 'active' | 'completed';

/**
 * Snapshot of a single exercise as it appeared when the program was assigned.
 * `alternativeExercise` is a nested one-level snapshot of the substitute (if any).
 */
export interface AssignmentSnapshotExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number | null;
  duration: number | null;
  rest: number;
  notes: string | null;
  locationTypes: LocationType[];
  videoUrl: string | null;
  imageUrl: string | null;
  alternativeExerciseId: string | null;
  alternativeExercise: AssignmentSnapshotExercise | null;
}

/**
 * Snapshot of a single program day.
 * - type 'rest'    → rest day, routine is null
 * - type 'routine' → routine is the denormalised routine snapshot
 * - type null      → unassigned day
 */
export interface AssignmentSnapshotDay {
  type: 'rest' | 'routine' | null;
  routineId: string | null;
  routine: {
    name: string;
    exercises: AssignmentSnapshotExercise[];
  } | null;
}

/**
 * Snapshot of one program week (7 days).
 */
export interface AssignmentSnapshotWeek {
  days: AssignmentSnapshotDay[];
}

/**
 * Full immutable snapshot of the assigned program.
 */
export interface AssignmentSnapshot {
  name: string;
  description: string;
  durationWeeks: number;
  weeks: AssignmentSnapshotWeek[];
}

/**
 * ASSIGNMENTS collection document shape.
 * `startDate` is a YYYY-MM-DD string (date-only, no timezone).
 */
export interface Assignment {
  id: string;
  trainerId: string;
  clientId: string;
  programId: string;
  status: AssignmentStatus;
  /** YYYY-MM-DD */
  startDate: string;
  createdAt: unknown;
  snapshot: AssignmentSnapshot;
}

/**
 * Input contract for the createAssignment Cloud Function (implemented in Plan 02-04).
 */
export interface CreateAssignmentInput {
  programId: string;
  clientId: string;
  /** YYYY-MM-DD */
  startDate: string;
}

/**
 * Result contract returned by the createAssignment Cloud Function.
 */
export interface CreateAssignmentResult {
  assignmentId: string;
}
