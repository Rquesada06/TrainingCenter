/**
 * timer — Phase 05 Plan 02 (TIMR-03)
 *
 * Pure functions for countdown timer math. No React, no Firebase.
 * All computations use an absolute `endsAt` timestamp (epoch ms) so that
 * re-mounting or backgrounding the app does not accumulate tick errors (D-06).
 *
 * Mirror workoutDayComputer.ts style: small named exports, Math.max clamps,
 * doc-comment header citing requirement IDs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core timer math
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remaining milliseconds until `endsAt`, clamped at 0 (never negative).
 * Computed from an absolute epoch so drift from re-mounts is impossible (D-06).
 *
 * @param endsAt - Absolute epoch timestamp (ms) when the timer expires
 * @param now    - Current epoch timestamp (ms) — typically `Date.now()`
 * @returns Integer-precision remaining ms, minimum 0
 */
export const remainingMs = (endsAt: number, now: number): number =>
  Math.max(0, endsAt - now);

/**
 * Extend a timer's end time by 15 seconds (+15s button).
 *
 * @param endsAt - Current absolute expiry timestamp (ms)
 * @returns New absolute expiry timestamp 15_000 ms later
 */
export const addFifteen = (endsAt: number): number => endsAt + 15_000;

/**
 * Whether a timer has expired.
 * Returns true at exactly endsAt === now and when endsAt < now.
 *
 * @param endsAt - Absolute epoch timestamp (ms) when the timer expires
 * @param now    - Current epoch timestamp (ms)
 * @returns true if the timer has elapsed or just hit 0
 */
export const isExpired = (endsAt: number, now: number): boolean =>
  endsAt - now <= 0;

// ─────────────────────────────────────────────────────────────────────────────
// Display formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format milliseconds as "M:SS" for timer display (e.g. 90_000 → "1:30").
 * Floors to whole seconds (no fractional display).
 *
 * @param ms - Milliseconds to format (non-negative)
 * @returns Formatted string in "M:SS" format
 */
export function formatMmSs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
