/**
 * workoutDayComputer — Phase 03 Plan 01 (WORK-01, D-01..D-05)
 *
 * Pure functions for date-only arithmetic and workout-day state derivation.
 * No React, no Firebase — consumed by useClientActiveAssignment + Home screen.
 *
 * CRITICAL: All date parsing uses the local-midnight constructor pattern
 * (new Date(y, m-1, d)) to avoid the UTC interpretation trap in ECMAScript
 * where date-only ISO strings parse as UTC midnight, causing off-by-one errors
 * in negative-UTC timezones (e.g. UTC-5 reads "2025-06-01" as May 31 locally).
 */

import type { Assignment, AssignmentSnapshotDay } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discriminated union of the six possible states for today's workout.
 * Produced by computeTodayWorkout; consumed by the Home screen (D-06).
 *
 * Note: `no_assignment` is produced by the caller when `assignment` is null —
 * `computeTodayWorkout` always receives a non-null Assignment.
 */
export type WorkoutDayResult =
  | { state: 'no_assignment' }
  | { state: 'starts_soon'; daysUntilStart: number }
  | { state: 'rest' }
  | { state: 'program_complete' }
  | { state: 'active'; weekIndex: number; dayIndex: number; day: AssignmentSnapshotDay };

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse "YYYY-MM-DD" as LOCAL midnight.
 *
 * ECMAScript spec: date-only ISO strings (without a time component) are parsed
 * as UTC midnight. Using `new Date(y, m-1, d)` forces local midnight instead,
 * preventing off-by-one errors in timezones behind UTC.
 *
 * @param yyyymmdd - Date string in "YYYY-MM-DD" format
 * @returns Date at local midnight for the given calendar date
 */
export function parseDateOnly(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight, NOT UTC
}

/**
 * Get today's date as a "YYYY-MM-DD" string in LOCAL time.
 *
 * MUST use getFullYear/getMonth/getDate — NOT toISOString().slice(0,10)
 * which returns the UTC date and will show the wrong day in non-UTC timezones.
 *
 * @returns Today's date in "YYYY-MM-DD" format (local time)
 */
export function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute the whole-day integer offset between two YYYY-MM-DD strings.
 *
 * DST safety: both dates are parsed as local midnight, so DST transitions
 * (±1 hour) cannot create a fractional-day error. Math.floor absorbs the jitter.
 *
 * @param startDateStr - Program start date "YYYY-MM-DD"
 * @param todayStr - Today's date "YYYY-MM-DD"
 * @returns Integer number of days (positive = today is after start, negative = before)
 */
export function dayOffset(startDateStr: string, todayStr: string): number {
  const start = parseDateOnly(startDateStr);
  const today = parseDateOnly(todayStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((today.getTime() - start.getTime()) / msPerDay);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core state machine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive today's workout state from an Assignment and the current date string.
 *
 * Implements the six-state machine (D-01..D-05, D-06):
 *  1. today < startDate         → starts_soon (D-02)
 *  2. offset >= durationWeeks*7 → program_complete (D-03, no loop/hold)
 *  3. day.type === 'rest'       → rest (D-04)
 *  4. day.type === null         → rest (D-04, unassigned day)
 *  5. week/day out of bounds    → rest (safe default)
 *  6. day.type === 'routine'    → active with weekIndex/dayIndex/day (D-05)
 *
 * @param assignment - Non-null active Assignment (caller handles null → no_assignment)
 * @param todayStr - Today's date "YYYY-MM-DD" (use localTodayString())
 */
export function computeTodayWorkout(
  assignment: Assignment,
  todayStr: string
): WorkoutDayResult {
  const offset = dayOffset(assignment.startDate, todayStr);
  const totalDays = assignment.snapshot.durationWeeks * 7;

  // D-02: Program hasn't started yet
  if (offset < 0) {
    return { state: 'starts_soon', daysUntilStart: -offset };
  }

  // D-03: Program is over (terminal state — no loop, no hold)
  if (offset >= totalDays) {
    return { state: 'program_complete' };
  }

  // D-01: Derive week/day indices
  const weekIndex = Math.floor(offset / 7);
  const dayIndex = offset % 7;

  // Resolve the snapshot day; use optional chaining for out-of-bounds safety
  const day = assignment.snapshot.weeks[weekIndex]?.days[dayIndex];

  // D-04: Rest day, null (unassigned), or out of bounds → rest
  if (!day || day.type === 'rest' || day.type === null) {
    return { state: 'rest' };
  }

  // D-05: Active workout day
  return { state: 'active', weekIndex, dayIndex, day };
}
