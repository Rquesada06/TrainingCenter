/**
 * adherence — Phase 04 (HIST-04)
 *
 * Pure function for computing adherence % over the current active program.
 * No React, no Firebase — consumed by ClientListItem via useQuery.
 *
 * Reuses parseDateOnly, localTodayString, dayOffset from workoutDayComputer.ts
 * to avoid UTC-midnight off-by-one errors (same critical comment applies).
 *
 * D-01: Adherence = completed sessions / scheduled workout days elapsed.
 * D-02: Partial sessions count — any saved session for the assignment = completed.
 * D-03: Current active program only; resets on new assignment.
 */

import { parseDateOnly, localTodayString, dayOffset } from './workoutDayComputer';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';

/**
 * Compute adherence percentage (0–100) for the given assignment and sessions.
 *
 * Returns null when:
 *  - today < startDate (program hasn't started yet)
 *  - denominator === 0 (no routine days have elapsed yet — all rest days so far)
 *
 * Denominator: count of 'routine' days from startDate up to min(today, programEnd)
 * INCLUSIVE of day 0 (off-by-one guard: loop uses `offset <= capOffset`).
 *
 * Numerator: count of sessions filtered by `s.assignmentId === assignment.id`.
 * Partial sessions count toward the numerator (D-02 — no status/completion check).
 *
 * Program-end cap: when today > programEnd, denominator is frozen at program end.
 * ISO YYYY-MM-DD string comparison is correct and avoids the UTC-midnight trap.
 *
 * @param assignment - The active assignment (provides startDate + snapshot)
 * @param sessions   - All sessions to consider (caller should pass the assignment's sessions)
 * @param todayStr   - Today's date "YYYY-MM-DD" (defaults to localTodayString())
 * @returns Integer adherence % (0–100) or null
 */
export function computeAdherence(
  assignment: Assignment,
  sessions: Session[],
  todayStr: string = localTodayString()
): number | null {
  const { startDate, snapshot } = assignment;

  // Program hasn't started yet — no adherence to show.
  if (todayStr < startDate) return null;

  // Build programEndDate as YYYY-MM-DD string using local-midnight arithmetic.
  // parseDateOnly avoids the UTC-midnight trap; getFullYear/getMonth/getDate
  // extracts the local date so the end string is correct in all timezones.
  const startMs = parseDateOnly(startDate).getTime();
  const endMs = startMs + (snapshot.durationWeeks * 7 - 1) * 86_400_000;
  const endDate = new Date(endMs);
  const endDateStr = [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, '0'),
    String(endDate.getDate()).padStart(2, '0'),
  ].join('-');

  // Cap at min(today, programEnd) — ISO string lexicographic comparison is correct
  // for YYYY-MM-DD format (see RESEARCH.md § "Don't Hand-Roll").
  const capStr = todayStr < endDateStr ? todayStr : endDateStr;
  const capOffset = dayOffset(startDate, capStr);

  // Count routine days from offset 0 through capOffset INCLUSIVE.
  // Using `offset <= capOffset` ensures day 0 (startDate itself) is counted and
  // that the cap day is also included (RESEARCH.md § "Off-by-one guard").
  let denominator = 0;
  for (let offset = 0; offset <= capOffset; offset++) {
    const weekIndex = Math.floor(offset / 7);
    const dayIndex = offset % 7;
    // Optional chaining mirrors workoutDayComputer.ts line 125 — out-of-bounds safe.
    const day = snapshot.weeks[weekIndex]?.days[dayIndex];
    if (day?.type === 'routine') denominator++;
  }

  // No routine days elapsed yet (all rest days) — nothing to display.
  if (denominator === 0) return null;

  // Numerator: sessions belonging to this assignment (D-02: no completion check).
  const numerator = sessions.filter((s) => s.assignmentId === assignment.id).length;

  return Math.round((numerator / denominator) * 100);
}
