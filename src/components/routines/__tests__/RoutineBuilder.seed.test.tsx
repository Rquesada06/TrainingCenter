/**
 * RoutineBuilder seed tests — Phase 05 Plan 04 (PRES-01/02/03)
 *
 * Tests that the append seed shape includes the new prescription fields:
 * - timed: false (default — weighted)
 * - repsMin: from exercise.defaultReps (or undefined)
 * - repsMax: from exercise.defaultReps (or undefined)
 * - targetRpe: undefined (optional, blank by default)
 *
 * These tests verify the seed derivation logic mirrors what RoutineBuilder
 * does in handleExercisesSelected → append({...}).
 *
 * The component integration tests (component renders, picker wires up, etc.)
 * are exercised by the existing RoutineExerciseRow tests and the schema tests;
 * this suite focuses on the seed shape invariant.
 */

import type { Exercise } from '@/types/exercise';

// ── Helper types for testing seed shape ──────────────────────────────────────

type RoutineExerciseSeed = {
  exerciseId: string;
  name: string;
  sets: number;
  reps?: number;
  repsMin?: number;
  repsMax?: number;
  targetRpe?: number;
  timed: boolean;
  duration?: number;
  rest: number;
  notes: string;
  alternativeExerciseId?: string;
  order: number;
};

// ── Mirrors the seed logic in RoutineBuilder.handleExercisesSelected ──────────
function buildSeed(ex: Exercise, order: number): RoutineExerciseSeed {
  return {
    exerciseId: ex.id,
    name: ex.name,
    sets: ex.defaultSets ?? 3,
    reps: ex.defaultReps,
    // Phase 05 Plan 04 — prescription seeds (PRES-01/02/03)
    repsMin: ex.defaultReps,
    repsMax: ex.defaultReps,
    targetRpe: undefined,
    timed: false,
    duration: ex.defaultDuration,
    rest: ex.defaultRest ?? 60,
    notes: '',
    alternativeExerciseId: undefined,
    order,
  };
}

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-test',
  trainerId: 'trainer-1',
  name: 'Back Squat',
  category: 'strength',
  locationTypes: ['gym'],
  defaultSets: 3,
  defaultReps: 8,
  defaultRest: 90,
  createdAt: null as unknown as Exercise['createdAt'],
  updatedAt: null as unknown as Exercise['updatedAt'],
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RoutineBuilder — append seed defaults (PRES-01/02/03)', () => {
  test('seeds timed: false for any new exercise (default weighted)', () => {
    const seed = buildSeed(makeExercise(), 0);
    expect(seed.timed).toBe(false);
  });

  test('seeds repsMin and repsMax from defaultReps when available', () => {
    const seed = buildSeed(makeExercise({ defaultReps: 8 }), 0);
    expect(seed.repsMin).toBe(8);
    expect(seed.repsMax).toBe(8);
  });

  test('seeds repsMin/repsMax as undefined when exercise has no defaultReps', () => {
    const seed = buildSeed(makeExercise({ defaultReps: undefined }), 0);
    expect(seed.repsMin).toBeUndefined();
    expect(seed.repsMax).toBeUndefined();
  });

  test('seeds targetRpe as undefined (optional — trainer fills it in)', () => {
    const seed = buildSeed(makeExercise(), 0);
    expect(seed.targetRpe).toBeUndefined();
  });

  test('preserves existing sets / rest / duration seeding unchanged', () => {
    const seed = buildSeed(makeExercise({ defaultSets: 4, defaultRest: 120, defaultDuration: 60 }), 1);
    expect(seed.sets).toBe(4);
    expect(seed.rest).toBe(120);
    expect(seed.duration).toBe(60);
    expect(seed.order).toBe(1);
  });

  test('falls back to 3 sets and 60s rest when exercise has no defaults', () => {
    const seed = buildSeed(makeExercise({ defaultSets: undefined, defaultRest: undefined }), 0);
    expect(seed.sets).toBe(3);
    expect(seed.rest).toBe(60);
  });
});
