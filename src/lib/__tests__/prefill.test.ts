/**
 * Unit tests for prefill — Phase 05 Plan 02 (LOG-03/D-09/D-02)
 *
 * Pure function tests — no mocks required.
 * Tests cover:
 *   - resolvePrefill: returns last session's actual weight/reps for each set
 *   - resolvePrefill: falls back to snapshot target (repsMin or legacy reps) on first session
 *   - resolvePrefill: does not crash on old v1.0 sessions with no loggedExercises
 *   - resolvePrefill: carry-down within exercise (set N+1 seeds from set N values) — D-02
 */

import { resolvePrefill } from '../prefill';
import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { Session } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeSnapshotExercise(overrides?: Partial<AssignmentSnapshotExercise>): AssignmentSnapshotExercise {
  return {
    exerciseId: 'ex-1',
    name: 'Back Squat',
    sets: 3,
    reps: 8,
    duration: null,
    rest: 90,
    notes: null,
    locationTypes: [],
    videoUrl: null,
    imageUrl: null,
    alternativeExerciseId: null,
    alternativeExercise: null,
    repsMin: null,
    repsMax: null,
    targetRpe: null,
    timed: false,
    ...overrides,
  };
}

function makeSession(
  assignmentId: string,
  loggedExercises?: Session['loggedExercises'],
  dateStr: string = '2026-06-01'
): Session {
  return {
    id: `session-${dateStr}`,
    clientId: 'client-1',
    trainerId: 'trainer-1',
    assignmentId,
    date: dateStr,
    weekIndex: 0,
    dayIndex: 0,
    mode: 'gym',
    completedExerciseIds: ['ex-1'],
    totalExercises: 1,
    startedAt: `${dateStr}T10:00:00.000Z`,
    completedAt: `${dateStr}T11:00:00.000Z`,
    routineName: null,
    loggedExercises,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrefill — last-session actuals
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePrefill — last-session actuals', () => {
  it('returns actual weight/reps from the most recent session for each set', () => {
    const exercise = makeSnapshotExercise({ sets: 3 });
    const priorSession = makeSession('asgn-1', [
      {
        exerciseId: 'ex-1',
        name: 'Back Squat',
        timed: false,
        sets: [
          { setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true },
          { setNumber: 2, weight: 95, reps: 5, rpe: 7.5, completed: true },
          { setNumber: 3, weight: 90, reps: 6, rpe: 7, completed: true },
        ],
      },
    ]);

    const result = resolvePrefill(exercise, [priorSession]);

    expect(result).toHaveLength(3);
    expect(result[0].weight).toBe(100);
    expect(result[0].reps).toBe(5);
    expect(result[1].weight).toBe(95);
    expect(result[1].reps).toBe(5);
    expect(result[2].weight).toBe(90);
    expect(result[2].reps).toBe(6);
  });

  it('uses the most recent session when multiple sessions exist', () => {
    const exercise = makeSnapshotExercise({ sets: 2 });
    const olderSession = makeSession('asgn-1', [
      {
        exerciseId: 'ex-1',
        name: 'Back Squat',
        timed: false,
        sets: [
          { setNumber: 1, weight: 80, reps: 8, rpe: 7, completed: true },
          { setNumber: 2, weight: 80, reps: 8, rpe: 7, completed: true },
        ],
      },
    ], '2026-06-01');

    const newerSession = makeSession('asgn-1', [
      {
        exerciseId: 'ex-1',
        name: 'Back Squat',
        timed: false,
        sets: [
          { setNumber: 1, weight: 90, reps: 6, rpe: 8, completed: true },
          { setNumber: 2, weight: 90, reps: 6, rpe: 8, completed: true },
        ],
      },
    ], '2026-06-04');

    const result = resolvePrefill(exercise, [olderSession, newerSession]);
    // Should pick the newer session (2026-06-04)
    expect(result[0].weight).toBe(90);
    expect(result[0].reps).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrefill — target fallback (first session)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePrefill — target fallback on first session', () => {
  it('falls back to repsMin when no prior sessions exist', () => {
    const exercise = makeSnapshotExercise({ sets: 3, repsMin: 6, repsMax: 8 });
    const result = resolvePrefill(exercise, []);
    expect(result).toHaveLength(3);
    expect(result[0].reps).toBe(6); // uses repsMin as target
    expect(result[0].weight).toBeNull(); // no prior weight → null
  });

  it('falls back to legacy reps when repsMin is null', () => {
    const exercise = makeSnapshotExercise({ sets: 2, reps: 10, repsMin: null });
    const result = resolvePrefill(exercise, []);
    expect(result[0].reps).toBe(10); // uses legacy reps
    expect(result[0].weight).toBeNull();
  });

  it('sets weight to null on first session (no prior weight info)', () => {
    const exercise = makeSnapshotExercise({ sets: 2, repsMin: 8 });
    const result = resolvePrefill(exercise, []);
    result.forEach((set) => {
      expect(set.weight).toBeNull();
    });
  });

  it('marks all sets as not completed (prefill seeds only)', () => {
    const exercise = makeSnapshotExercise({ sets: 3, repsMin: 8 });
    const result = resolvePrefill(exercise, []);
    result.forEach((set) => {
      expect(set.completed).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrefill — v1.0 back-compat (old sessions without loggedExercises)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePrefill — v1.0 back-compat (no loggedExercises)', () => {
  it('does not crash when session has no loggedExercises (old v1.0 session)', () => {
    const exercise = makeSnapshotExercise({ sets: 3, repsMin: 8 });
    // v1.0 session — no loggedExercises field
    const oldSession = makeSession('asgn-1', undefined);
    // Should NOT crash — falls back to target
    expect(() => resolvePrefill(exercise, [oldSession])).not.toThrow();
  });

  it('falls back to target when old session has no loggedExercises', () => {
    const exercise = makeSnapshotExercise({ sets: 2, repsMin: 5, repsMax: 8 });
    const oldSession = makeSession('asgn-1', undefined);
    const result = resolvePrefill(exercise, [oldSession]);
    expect(result).toHaveLength(2);
    expect(result[0].reps).toBe(5); // repsMin
    expect(result[0].weight).toBeNull();
  });

  it('falls back to target when old session loggedExercises is empty array', () => {
    const exercise = makeSnapshotExercise({ sets: 2, repsMin: 8 });
    const sessionWithEmptyLogged = makeSession('asgn-1', []);
    const result = resolvePrefill(exercise, [sessionWithEmptyLogged]);
    expect(result[0].reps).toBe(8); // repsMin fallback
  });

  it('falls back to target when exercise not found in prior session', () => {
    const exercise = makeSnapshotExercise({ exerciseId: 'ex-99', sets: 2, repsMin: 10 });
    const sessionForDifferentExercise = makeSession('asgn-1', [
      {
        exerciseId: 'ex-1', // different exercise id
        name: 'Other',
        timed: false,
        sets: [{ setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true }],
      },
    ]);
    const result = resolvePrefill(exercise, [sessionForDifferentExercise]);
    expect(result[0].reps).toBe(10); // falls back to repsMin
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePrefill — carry-down (D-02)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePrefill — carry-down within exercise (D-02)', () => {
  it('set numbers are sequential starting at 1', () => {
    const exercise = makeSnapshotExercise({ sets: 3, repsMin: 8 });
    const result = resolvePrefill(exercise, []);
    expect(result[0].setNumber).toBe(1);
    expect(result[1].setNumber).toBe(2);
    expect(result[2].setNumber).toBe(3);
  });

  it('all sets share the same seed values from last session (carry-down baseline)', () => {
    // When there's a prior session with only 1 set logged but the exercise has 3 sets,
    // the unlogged sets should carry the last available logged values down.
    const exercise = makeSnapshotExercise({ sets: 3 });
    const priorSession = makeSession('asgn-1', [
      {
        exerciseId: 'ex-1',
        name: 'Back Squat',
        timed: false,
        sets: [
          { setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true },
        ],
      },
    ]);

    const result = resolvePrefill(exercise, [priorSession]);
    // Set 1 gets the logged values directly
    expect(result[0].weight).toBe(100);
    // Sets 2 and 3 should carry-down from set 1 (D-02)
    expect(result[1].weight).toBe(100);
    expect(result[2].weight).toBe(100);
  });
});
