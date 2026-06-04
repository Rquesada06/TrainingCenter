/**
 * Unit tests for adherence — Phase 04 (HIST-04)
 *
 * Pure function tests — no mocks required.
 * Tests cover: null guards (before program start, zero denominator),
 * mid-program %, program-end cap, off-by-one (day-0 included),
 * partial-session counting (D-02), and the RESEARCH.md 50% reference case.
 */

import { computeAdherence } from '../adherence';
import type { Assignment, AssignmentSnapshotDay } from '@/types/assignment';
import type { Session } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const REST_DAY: AssignmentSnapshotDay = {
  type: 'rest',
  routineId: null,
  routine: null,
};

const ROUTINE_DAY: AssignmentSnapshotDay = {
  type: 'routine',
  routineId: 'routine-1',
  routine: {
    name: 'Test Routine',
    exercises: [],
  },
};

/** Build a minimal Assignment with explicit day grids per week. */
function makeAssignment(
  startDate: string,
  durationWeeks: number,
  dayGrid?: AssignmentSnapshotDay[][]
): Assignment {
  const weeks = Array.from({ length: durationWeeks }, (_, w) => ({
    days: Array.from({ length: 7 }, (__, d): AssignmentSnapshotDay => {
      return dayGrid?.[w]?.[d] ?? REST_DAY;
    }),
  }));

  return {
    id: 'assignment-1',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    programId: 'program-1',
    status: 'active',
    startDate,
    createdAt: null,
    snapshot: {
      name: 'Test Program',
      description: 'A test program',
      durationWeeks,
      weeks,
    },
  };
}

/** Build a session record for the given assignment. */
function makeSession(assignmentId: string = 'assignment-1'): Session {
  return {
    id: 'session-1',
    clientId: 'client-1',
    trainerId: 'trainer-1',
    assignmentId,
    date: '2026-06-01',
    weekIndex: 0,
    dayIndex: 0,
    mode: 'gym',
    completedExerciseIds: [],
    totalExercises: 0,
    startedAt: '2026-06-01T10:00:00.000Z',
    completedAt: '2026-06-01T11:00:00.000Z',
    routineName: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Null guards
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — null guards', () => {
  it('returns null when today is before program startDate', () => {
    // Program starts tomorrow; today has no elapsed days yet.
    const assignment = makeAssignment('2026-06-10', 2);
    const result = computeAdherence(assignment, [], '2026-06-09');
    expect(result).toBeNull();
  });

  it('returns null when denominator is 0 (all rest days elapsed so far)', () => {
    // 2-week program, all rest days. On day 3 the denominator is still 0.
    const assignment = makeAssignment('2026-06-01', 2); // defaults to all REST_DAY
    const result = computeAdherence(assignment, [], '2026-06-03');
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mid-program %
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — mid-program', () => {
  it('returns 100% when all routine days so far have sessions', () => {
    // 1-week program, Mon is routine (day index 0), rest of week is rest.
    // today = startDate (offset 0, the first routine day).
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const sessions = [makeSession()];
    const result = computeAdherence(assignment, sessions, '2026-06-01');
    expect(result).toBe(100);
  });

  it('returns 0% when no sessions completed yet for elapsed routine days', () => {
    // 1-week program with a routine day on offset 0; today = offset 0.
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const result = computeAdherence(assignment, [], '2026-06-01');
    expect(result).toBe(0);
  });

  it('returns 50% for 1 session out of 2 routine days elapsed', () => {
    // M/W/F pattern (offsets 0/2/4); today = offset 3 (Thu, 2026-06-04); 2 routine days due.
    // startDate = 2026-06-01 (Mon), so offset 0=Mon, 2=Wed, 4=Fri.
    // today = 2026-06-04 → offsets 0..3; routine at 0 and 2 → denominator=2.
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, ROUTINE_DAY, REST_DAY, ROUTINE_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const sessions = [makeSession()]; // 1 session
    const result = computeAdherence(assignment, sessions, '2026-06-04');
    // denominator: offset 0 (routine) + offset 2 (routine) = 2
    // numerator: 1 session; result = Math.round(1/2*100) = 50
    expect(result).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Program-end cap
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — program-end cap', () => {
  it('caps denominator at programEnd when today is past the end', () => {
    // 1-week program with 3 routine days (Mon/Wed/Fri). Today is 2 weeks later.
    // Denominator must be 3 (not 6 or more from future days).
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, ROUTINE_DAY, REST_DAY, ROUTINE_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const sessions = [makeSession(), makeSession(), makeSession()];
    // today is far past end (end = 2026-06-07 for 1-week program starting 2026-06-01)
    const result = computeAdherence(assignment, sessions, '2026-07-01');
    expect(result).toBe(100); // 3 / 3 = 100
  });

  it('returns correct % on the last day of the program', () => {
    // 1-week program, only day 6 (Sun) is routine.
    const days = [REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, ROUTINE_DAY];
    const grid: AssignmentSnapshotDay[][] = [days];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    // end = 2026-06-07 (offset 6); today = 2026-06-07
    const result = computeAdherence(assignment, [], '2026-06-07');
    // denominator = 1 (only offset 6 is routine); numerator = 0
    expect(result).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Off-by-one: day 0 included in denominator
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — off-by-one guard', () => {
  it('includes day 0 (startDate) in denominator', () => {
    // Routine only on day 0; today = startDate.
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const sessions = [makeSession()];
    // offset 0 must be counted; denominator = 1
    const result = computeAdherence(assignment, sessions, '2026-06-01');
    expect(result).toBe(100);
  });

  it('does not include days beyond capOffset', () => {
    // 2-week program, routine every day. today = day 0 (only 1 day elapsed).
    const week = [ROUTINE_DAY, ROUTINE_DAY, ROUTINE_DAY, ROUTINE_DAY, ROUTINE_DAY, ROUTINE_DAY, ROUTINE_DAY];
    const grid: AssignmentSnapshotDay[][] = [week, week];
    const assignment = makeAssignment('2026-06-01', 2, grid);
    const sessions: Session[] = [];
    // today = 2026-06-01 (offset 0): only 1 routine day due, denominator = 1
    const result = computeAdherence(assignment, sessions, '2026-06-01');
    expect(result).toBe(0); // 0/1 = 0%
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Partial sessions count (D-02)
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — partial sessions count', () => {
  it('counts a partial session (any completedExerciseIds count) as completed (D-02)', () => {
    // 1 routine day; 1 session for the assignment — no completedExercises check.
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const partialSession: Session = {
      ...makeSession(),
      completedExerciseIds: ['ex-1'], // only 1 of N — still counts
      totalExercises: 5,
    };
    const result = computeAdherence(assignment, [partialSession], '2026-06-01');
    expect(result).toBe(100); // 1/1 = 100 — partial still counts
  });

  it('ignores sessions from other assignments', () => {
    // 1 routine day; the session is for a different assignment.
    const grid: AssignmentSnapshotDay[][] = [
      [ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
    ];
    const assignment = makeAssignment('2026-06-01', 1, grid);
    const otherSession = makeSession('other-assignment');
    const result = computeAdherence(assignment, [otherSession], '2026-06-01');
    expect(result).toBe(0); // 0/1 = 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH.md reference case — 2-week M/W/F, startDate 2026-06-02 (Tue)
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAdherence — RESEARCH.md reference case', () => {
  it('returns 50 for 1 session / 2 routine days elapsed (M/W/F, startDate Tue, today Mon)', () => {
    /**
     * 2-week M/W/F program. startDate = 2026-06-02 (Tuesday).
     * Day index 0 = Tue, 1 = Wed, 2 = Thu, 3 = Fri, 4 = Sat, 5 = Sun, 6 = Mon.
     *
     * Routine days per RESEARCH.md: Wed (offset 1) and Fri (offset 3) in week 1.
     * today = 2026-06-08 (Monday) → offset = 6.
     * Loop 0..6: offset 0=Tue(rest), 1=Wed(routine), 2=Thu(rest), 3=Fri(routine), 4=Sat(rest), 5=Sun(rest), 6=Mon(rest)
     * denominator = 2; numerator = 1 session → Math.round(1/2*100) = 50.
     */
    const week: AssignmentSnapshotDay[] = [
      REST_DAY,    // 0 Tue — not a routine day
      ROUTINE_DAY, // 1 Wed
      REST_DAY,    // 2 Thu
      ROUTINE_DAY, // 3 Fri
      REST_DAY,    // 4 Sat
      REST_DAY,    // 5 Sun
      REST_DAY,    // 6 Mon
    ];
    const grid: AssignmentSnapshotDay[][] = [week, week];
    const assignment = makeAssignment('2026-06-02', 2, grid);
    const sessions = [makeSession()];

    const result = computeAdherence(assignment, sessions, '2026-06-08');

    expect(result).toBe(50);
  });
});
