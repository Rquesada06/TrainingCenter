/**
 * Unit tests for loggedExercise.schema — Phase 05 Plan 02 (LOG-04)
 *
 * Tests cover:
 *   - loggedSetSchema accepts null weight/reps/rpe (Pitfall 5 / nullable not optional)
 *   - loggedSetSchema requires completed: boolean
 *   - loggedSetSchema rejects undefined for nullable fields (T-05-03 / stripUndefinedDeep)
 *   - loggedExerciseSchema: validates full exercise object
 */

import { loggedSetSchema, loggedExerciseSchema } from '@/validation/loggedExercise.schema';

// ─────────────────────────────────────────────────────────────────────────────
// loggedSetSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('loggedSetSchema', () => {
  const validSet = {
    setNumber: 1,
    weight: 60,
    reps: 8,
    rpe: 7.5,
    completed: true,
  };

  test('accepts a fully-populated set', () => {
    const result = loggedSetSchema.safeParse(validSet);
    expect(result.success).toBe(true);
  });

  test('accepts null weight (unlogged field — nullable not optional)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, weight: null });
    expect(result.success).toBe(true);
  });

  test('accepts null reps (unlogged field)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, reps: null });
    expect(result.success).toBe(true);
  });

  test('accepts null rpe (unlogged field)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, rpe: null });
    expect(result.success).toBe(true);
  });

  test('accepts all nulled unlogged fields with completed:false (default unlogged set)', () => {
    const result = loggedSetSchema.safeParse({
      setNumber: 1,
      weight: null,
      reps: null,
      rpe: null,
      completed: false,
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing completed field (required)', () => {
    const { completed: _, ...withoutCompleted } = validSet;
    const result = loggedSetSchema.safeParse(withoutCompleted);
    expect(result.success).toBe(false);
  });

  test('rejects non-positive setNumber', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, setNumber: 0 });
    expect(result.success).toBe(false);
  });

  test('rejects negative weight (nonnegative)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, weight: -5 });
    expect(result.success).toBe(false);
  });

  test('rejects rpe > 10', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, rpe: 11 });
    expect(result.success).toBe(false);
  });

  test('rejects rpe < 1 (when provided)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, rpe: 0.5 });
    expect(result.success).toBe(false);
  });

  test('rejects negative reps (nonnegative)', () => {
    const result = loggedSetSchema.safeParse({ ...validSet, reps: -1 });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loggedExerciseSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('loggedExerciseSchema', () => {
  const validExercise = {
    exerciseId: 'ex-1',
    name: 'Back Squat',
    timed: false,
    sets: [
      { setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true },
      { setNumber: 2, weight: null, reps: null, rpe: null, completed: false },
    ],
  };

  test('accepts a valid logged exercise', () => {
    const result = loggedExerciseSchema.safeParse(validExercise);
    expect(result.success).toBe(true);
  });

  test('accepts timed:true', () => {
    const result = loggedExerciseSchema.safeParse({ ...validExercise, timed: true });
    expect(result.success).toBe(true);
  });

  test('rejects missing exerciseId', () => {
    const { exerciseId: _, ...without } = validExercise;
    const result = loggedExerciseSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  test('rejects missing sets array', () => {
    const { sets: _, ...without } = validExercise;
    const result = loggedExerciseSchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});
