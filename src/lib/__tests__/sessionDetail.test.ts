/**
 * Unit tests for sessionDetail — Phase 04 (HIST-02)
 *
 * Pure function tests — no mocks required.
 * Tests cover: completed/skipped partition, null/undefined day fallback.
 */

import { resolveSessionExercises } from '../sessionDetail';
import type { AssignmentSnapshotDay, AssignmentSnapshotExercise } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeExercise(exerciseId: string): AssignmentSnapshotExercise {
  return {
    exerciseId,
    name: `Exercise ${exerciseId}`,
    sets: 3,
    reps: 10,
    duration: null,
    rest: 60,
    notes: null,
    locationTypes: ['gym'],
    videoUrl: null,
    imageUrl: null,
    alternativeExerciseId: null,
    alternativeExercise: null,
  };
}

function makeRoutineDay(exerciseIds: string[]): AssignmentSnapshotDay {
  return {
    type: 'routine',
    routineId: 'routine-1',
    routine: {
      name: 'Test Routine',
      exercises: exerciseIds.map(makeExercise),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveSessionExercises — partition
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveSessionExercises', () => {
  it('returns empty arrays for a null day', () => {
    const result = resolveSessionExercises(null, ['ex-1']);
    expect(result).toEqual({ completed: [], skipped: [] });
  });

  it('returns empty arrays for an undefined day', () => {
    const result = resolveSessionExercises(undefined, ['ex-1']);
    expect(result).toEqual({ completed: [], skipped: [] });
  });

  it('returns empty arrays for a rest day (no routine)', () => {
    const restDay: AssignmentSnapshotDay = {
      type: 'rest',
      routineId: null,
      routine: null,
    };
    const result = resolveSessionExercises(restDay, ['ex-1']);
    expect(result).toEqual({ completed: [], skipped: [] });
  });

  it('partitions exercises into completed and skipped based on completedExerciseIds set', () => {
    const day = makeRoutineDay(['ex-1', 'ex-2', 'ex-3']);
    const result = resolveSessionExercises(day, ['ex-1', 'ex-3']);

    expect(result.completed).toHaveLength(2);
    expect(result.completed.map((e) => e.exerciseId)).toEqual(['ex-1', 'ex-3']);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].exerciseId).toBe('ex-2');
  });

  it('puts all exercises in completed when all IDs are in the completed set', () => {
    const day = makeRoutineDay(['ex-1', 'ex-2']);
    const result = resolveSessionExercises(day, ['ex-1', 'ex-2']);

    expect(result.completed).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
  });

  it('puts all exercises in skipped when none are in the completed set', () => {
    const day = makeRoutineDay(['ex-1', 'ex-2']);
    const result = resolveSessionExercises(day, []);

    expect(result.completed).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
  });

  it('handles an empty exercises array in the routine', () => {
    const day: AssignmentSnapshotDay = {
      type: 'routine',
      routineId: 'routine-1',
      routine: { name: 'Empty Routine', exercises: [] },
    };
    const result = resolveSessionExercises(day, ['ex-1']);
    expect(result).toEqual({ completed: [], skipped: [] });
  });
});
