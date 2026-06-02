/**
 * Program type contracts — Phase 02 Plan 01
 *
 * Single source of truth for the PROGRAMS Firestore collection.
 * A program is a Week × Day grid where each day points to a routine, is a rest
 * day, or is unassigned.
 */

/**
 * One day slot in a program week.
 * - a routineId string  → that routine is scheduled
 * - 'rest'              → explicit rest day
 * - null                → unassigned (empty slot)
 *
 * Per CONTEXT.md Decision 2.
 */
export type ProgramDay = string | 'rest' | null;

/**
 * A single week of a program. `days` always has length 7 (Day 1–7).
 */
export interface ProgramWeek {
  days: ProgramDay[];
}

/**
 * PROGRAMS collection document shape.
 */
export interface Program {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  durationWeeks: number;
  weeks: ProgramWeek[];
  createdAt: unknown;
  updatedAt: unknown;
}

/**
 * Input contract for creating a program. Server fills id/trainerId/timestamps.
 */
export type CreateProgramInput = Omit<
  Program,
  'id' | 'trainerId' | 'createdAt' | 'updatedAt'
>;
