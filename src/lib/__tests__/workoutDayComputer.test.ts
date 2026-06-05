/**
 * Unit tests for workoutDayComputer — Phase 03 Plan 01
 *
 * Pure function tests — no mocks required.
 * Tests cover all six computeTodayWorkout states + UTC-drift regression.
 */

import {
  parseDateOnly,
  localTodayString,
  dayOffset,
  computeTodayWorkout,
} from '../workoutDayComputer';
import type { Assignment, AssignmentSnapshotDay } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const REST_DAY: AssignmentSnapshotDay = {
  type: 'rest',
  routineId: null,
  routine: null,
};

const NULL_DAY: AssignmentSnapshotDay = {
  type: null,
  routineId: null,
  routine: null,
};

const ROUTINE_DAY: AssignmentSnapshotDay = {
  type: 'routine',
  routineId: 'routine-1',
  routine: {
    name: 'Test Routine',
    exercises: [
      {
        exerciseId: 'ex-1',
        name: 'Push-up',
        sets: 3,
        reps: 10,
        duration: null,
        rest: 60,
        notes: null,
        locationTypes: ['home'],
        videoUrl: null,
        imageUrl: null,
        alternativeExerciseId: null,
        alternativeExercise: null,
        // Phase 05 Plan 01 — prescription fields (PRES-01/02/03)
        repsMin: null,
        repsMax: null,
        targetRpe: null,
        timed: false,
      },
    ],
  },
};

/** Build a minimal Assignment with the given startDate, durationWeeks, and explicit day grids. */
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

// ─────────────────────────────────────────────────────────────────────────────
// parseDateOnly — UTC drift prevention
// ─────────────────────────────────────────────────────────────────────────────

describe('parseDateOnly', () => {
  it('returns local midnight (not UTC midnight) for YYYY-MM-DD input', () => {
    const d = parseDateOnly('2025-06-03');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // June = 5 (0-indexed)
    expect(d.getDate()).toBe(3);  // local date, not UTC
  });

  it('UTC-regression: getDate() matches the day in the string, regardless of timezone offset', () => {
    // This test catches the bug: new Date('2025-01-01') in UTC-5 returns Dec 31 locally.
    // parseDateOnly('2025-01-01').getDate() must return 1, not 31.
    const d = parseDateOnly('2025-01-01');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0); // January = 0
    expect(d.getDate()).toBe(1);
  });

  it('parses December correctly', () => {
    const d = parseDateOnly('2024-12-31');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11); // December = 11
    expect(d.getDate()).toBe(31);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// localTodayString — local date (not UTC)
// ─────────────────────────────────────────────────────────────────────────────

describe('localTodayString', () => {
  it('returns a YYYY-MM-DD string', () => {
    const today = localTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches getFullYear/getMonth/getDate of new Date() (not toISOString UTC slice)', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(localTodayString()).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dayOffset
// ─────────────────────────────────────────────────────────────────────────────

describe('dayOffset', () => {
  it('returns 0 when start equals today', () => {
    expect(dayOffset('2025-06-01', '2025-06-01')).toBe(0);
  });

  it('returns positive offset when today is after start', () => {
    expect(dayOffset('2025-06-01', '2025-06-08')).toBe(7);
    expect(dayOffset('2025-06-01', '2025-06-02')).toBe(1);
  });

  it('returns negative offset when today is before start', () => {
    expect(dayOffset('2025-06-10', '2025-06-08')).toBe(-2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTodayWorkout — six state machine cases
// ─────────────────────────────────────────────────────────────────────────────

describe('computeTodayWorkout', () => {
  // State 1: starts_soon — today < startDate
  it('returns starts_soon when today is before startDate', () => {
    const assignment = makeAssignment('2025-06-10', 4);
    const result = computeTodayWorkout(assignment, '2025-06-07');
    expect(result.state).toBe('starts_soon');
    if (result.state === 'starts_soon') {
      expect(result.daysUntilStart).toBe(3);
    }
  });

  // State 2: program_complete — dayOffset >= durationWeeks * 7
  it('returns program_complete when today is after program end', () => {
    // 2-week program starting 2025-06-01 → ends after day 13 (offset 0..13)
    const assignment = makeAssignment('2025-06-01', 2);
    // day 14 is past program
    const result = computeTodayWorkout(assignment, '2025-06-15');
    expect(result.state).toBe('program_complete');
  });

  it('returns program_complete exactly at offset == durationWeeks*7', () => {
    // 1-week program (days 0..6); offset 7 is past end
    const assignment = makeAssignment('2025-06-01', 1);
    const result = computeTodayWorkout(assignment, '2025-06-08');
    expect(result.state).toBe('program_complete');
  });

  // State 3: rest — day.type === 'rest'
  it('returns rest when the day is a rest day', () => {
    // All rest days by default; offset 0 = week 0 day 0 = rest
    const assignment = makeAssignment('2025-06-01', 2);
    const result = computeTodayWorkout(assignment, '2025-06-01');
    expect(result.state).toBe('rest');
  });

  // State 4: rest — day.type === null
  it('returns rest when the day type is null (unassigned)', () => {
    // Override week 0, day 0 to null
    const grid: AssignmentSnapshotDay[][] = [[NULL_DAY]];
    const assignment = makeAssignment('2025-06-01', 2, grid);
    const result = computeTodayWorkout(assignment, '2025-06-01');
    expect(result.state).toBe('rest');
  });

  // State 5: rest — missing week/day index (out of bounds within range)
  it('returns rest when week/day index is out of bounds within range', () => {
    // Assignment with durationWeeks=2 but empty weeks array (corrupted snapshot)
    const assignment: Assignment = {
      id: 'assignment-1',
      trainerId: 'trainer-1',
      clientId: 'client-1',
      programId: 'program-1',
      status: 'active',
      startDate: '2025-06-01',
      createdAt: null,
      snapshot: {
        name: 'Test Program',
        description: 'A test program',
        durationWeeks: 2,
        weeks: [], // empty — simulates out-of-bounds
      },
    };
    const result = computeTodayWorkout(assignment, '2025-06-01');
    expect(result.state).toBe('rest');
  });

  // State 6: active — day.type === 'routine' with exercises
  it('returns active with weekIndex/dayIndex/day when the day is a routine day', () => {
    // Override week 0, day 2 to be a routine day; today = offset 2 (2025-06-03)
    const grid: AssignmentSnapshotDay[][] = [
      [REST_DAY, REST_DAY, ROUTINE_DAY],
    ];
    const assignment = makeAssignment('2025-06-01', 2, grid);
    const result = computeTodayWorkout(assignment, '2025-06-03');
    expect(result.state).toBe('active');
    if (result.state === 'active') {
      expect(result.weekIndex).toBe(0);
      expect(result.dayIndex).toBe(2);
      expect(result.day.type).toBe('routine');
      expect(result.day.routine).not.toBeNull();
    }
  });

  it('calculates weekIndex and dayIndex correctly for week 1', () => {
    // Week 1, day 1 = offset 8 (7 + 1); today = startDate + 8
    const week1: AssignmentSnapshotDay[] = [
      REST_DAY, ROUTINE_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY,
    ];
    const grid: AssignmentSnapshotDay[][] = [
      // week 0: all rest
      [REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY, REST_DAY],
      // week 1: routine on day index 1
      week1,
    ];
    const assignment = makeAssignment('2025-06-01', 3, grid);
    const result = computeTodayWorkout(assignment, '2025-06-09');
    expect(result.state).toBe('active');
    if (result.state === 'active') {
      expect(result.weekIndex).toBe(1);
      expect(result.dayIndex).toBe(1);
    }
  });
});
