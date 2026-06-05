/**
 * Unit tests for sessionFinalize — Phase 05 Plan 02 (LOG-04/D-07/D-08/HIST-04)
 *
 * Pure function tests — no mocks required.
 * Tests cover:
 *   - deriveCompletedExerciseIds: ≥1 checked set → included, 0 checked → excluded (D-08)
 *   - buildFinalizedSession: null-not-undefined for unlogged fields (Pitfall 5 / T-05-03)
 *   - buildFinalizedSession: totalExercises = resolvedExercises.length
 *   - buildFinalizedSession: completedExerciseIds derived from logged sets
 *   - Null-guard: empty/missing inputs do not throw
 */

import { deriveCompletedExerciseIds, buildFinalizedSession } from '../sessionFinalize';
import type { LoggedExercise } from '@/types/session';
import type { AssignmentSnapshotExercise } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeLoggedExercise(
  exerciseId: string,
  completedSets: boolean[],
): LoggedExercise {
  return {
    exerciseId,
    name: `Exercise ${exerciseId}`,
    timed: false,
    sets: completedSets.map((completed, i) => ({
      setNumber: i + 1,
      weight: completed ? 60 : null,
      reps: completed ? 8 : null,
      rpe: completed ? 7 : null,
      completed,
    })),
  };
}

function makeSnapshotExercise(exerciseId: string): AssignmentSnapshotExercise {
  return {
    exerciseId,
    name: `Exercise ${exerciseId}`,
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
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// deriveCompletedExerciseIds
// ─────────────────────────────────────────────────────────────────────────────

describe('deriveCompletedExerciseIds', () => {
  it('includes an exercise with at least 1 completed set (D-08)', () => {
    const logged: LoggedExercise[] = [
      makeLoggedExercise('ex-1', [true, false, false]),
    ];
    const result = deriveCompletedExerciseIds(logged);
    expect(result).toContain('ex-1');
  });

  it('excludes an exercise with 0 completed sets (D-08)', () => {
    const logged: LoggedExercise[] = [
      makeLoggedExercise('ex-1', [false, false, false]),
    ];
    const result = deriveCompletedExerciseIds(logged);
    expect(result).not.toContain('ex-1');
  });

  it('correctly partitions mixed exercises', () => {
    const logged: LoggedExercise[] = [
      makeLoggedExercise('ex-1', [true, true, false]),  // ≥1 done → included
      makeLoggedExercise('ex-2', [false, false, false]), // 0 done → excluded
      makeLoggedExercise('ex-3', [false, false, true]),  // ≥1 done → included
    ];
    const result = deriveCompletedExerciseIds(logged);
    expect(result).toContain('ex-1');
    expect(result).not.toContain('ex-2');
    expect(result).toContain('ex-3');
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input (null-guard)', () => {
    expect(deriveCompletedExerciseIds([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildFinalizedSession
// ─────────────────────────────────────────────────────────────────────────────

const BASE_LIVE_STATE = {
  clientId: 'client-1',
  trainerId: 'trainer-1',
  assignmentId: 'assignment-1',
  date: '2026-06-05',
  weekIndex: 0,
  dayIndex: 1,
  mode: 'gym' as const,
  startedAt: '2026-06-05T10:00:00.000Z',
  completedAt: '2026-06-05T11:00:00.000Z',
  routineName: 'Leg Day',
};

describe('buildFinalizedSession', () => {
  it('sets totalExercises to resolvedExercises.length', () => {
    const exercises = [
      makeSnapshotExercise('ex-1'),
      makeSnapshotExercise('ex-2'),
    ];
    const logged: LoggedExercise[] = [];
    const result = buildFinalizedSession(BASE_LIVE_STATE, exercises, logged);
    expect(result.totalExercises).toBe(2);
  });

  it('derives completedExerciseIds from logged sets (≥1 checked set rule — HIST-04)', () => {
    const exercises = [makeSnapshotExercise('ex-1'), makeSnapshotExercise('ex-2')];
    const logged: LoggedExercise[] = [
      makeLoggedExercise('ex-1', [true, false, false]),
      makeLoggedExercise('ex-2', [false, false, false]),
    ];
    const result = buildFinalizedSession(BASE_LIVE_STATE, exercises, logged);
    expect(result.completedExerciseIds).toContain('ex-1');
    expect(result.completedExerciseIds).not.toContain('ex-2');
  });

  it('coerces unlogged set fields to null, never undefined (Pitfall 5 / T-05-03)', () => {
    const exercises = [makeSnapshotExercise('ex-1')];
    const logged: LoggedExercise[] = [
      {
        exerciseId: 'ex-1',
        name: 'Exercise ex-1',
        timed: false,
        sets: [{ setNumber: 1, weight: null, reps: null, rpe: null, completed: false }],
      },
    ];
    const result = buildFinalizedSession(BASE_LIVE_STATE, exercises, logged);
    const set = result.loggedExercises?.[0]?.sets?.[0];
    expect(set?.weight).toBe(null);
    expect(set?.reps).toBe(null);
    expect(set?.rpe).toBe(null);
    expect(set?.completed).toBe(false);
  });

  it('JSON-serialized payload contains no undefined keys (stripUndefinedDeep compat)', () => {
    const exercises = [makeSnapshotExercise('ex-1')];
    const logged: LoggedExercise[] = [makeLoggedExercise('ex-1', [false, false, false])];
    const result = buildFinalizedSession(BASE_LIVE_STATE, exercises, logged);
    const serialized = JSON.stringify(result);
    const parsed = JSON.parse(serialized);
    // All loggedSet fields must be present and not undefined in the payload
    const set = parsed.loggedExercises?.[0]?.sets?.[0];
    expect('weight' in set).toBe(true);
    expect('reps' in set).toBe(true);
    expect('rpe' in set).toBe(true);
    expect(set.weight).not.toBeUndefined();
    expect(set.reps).not.toBeUndefined();
    expect(set.rpe).not.toBeUndefined();
  });

  it('does not throw on empty logged array (null-guard)', () => {
    const exercises = [makeSnapshotExercise('ex-1')];
    expect(() =>
      buildFinalizedSession(BASE_LIVE_STATE, exercises, [])
    ).not.toThrow();
  });

  it('does not throw on empty exercises array (null-guard)', () => {
    expect(() =>
      buildFinalizedSession(BASE_LIVE_STATE, [], [])
    ).not.toThrow();
  });
});
