/**
 * Routine schema validation tests — Phase 02 Plan 01 (ROUT-01) + Phase 05 Plan 01 (PRES-01/02/03).
 */

import { routineSchema } from '@/validation/routine.schema';

const validEntry = {
  exerciseId: 'ex-1',
  name: 'Back Squat',
  sets: 3,
  reps: 10,
  rest: 90,
  order: 0,
};

const validRoutine = {
  name: 'Leg Day',
  exercises: [validEntry],
};

describe('routineSchema', () => {
  test('rejects routine with empty exercises array (min 1)', () => {
    const result = routineSchema.safeParse({ ...validRoutine, exercises: [] });
    expect(result.success).toBe(false);
  });

  test('rejects routine entry with non-positive sets', () => {
    const result = routineSchema.safeParse({
      ...validRoutine,
      exercises: [{ ...validEntry, sets: 0 }],
    });
    expect(result.success).toBe(false);
  });

  test('accepts entry with reps OR duration (either sufficient)', () => {
    const withReps = routineSchema.safeParse({
      ...validRoutine,
      exercises: [{ exerciseId: 'ex-1', name: 'Squat', sets: 3, reps: 8, rest: 60, order: 0 }],
    });
    const withDuration = routineSchema.safeParse({
      ...validRoutine,
      exercises: [{ exerciseId: 'ex-2', name: 'Plank', sets: 3, duration: 45, rest: 30, order: 0 }],
    });
    expect(withReps.success).toBe(true);
    expect(withDuration.success).toBe(true);
  });

  test('accepts optional notes and alternativeExerciseId', () => {
    const result = routineSchema.safeParse({
      ...validRoutine,
      exercises: [
        { ...validEntry, notes: 'Go deep', alternativeExerciseId: 'ex-99' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 05 Plan 01 — PRES-01/02/03: rep range, targetRpe, timed flag
// ─────────────────────────────────────────────────────────────────────────────

describe('routineSchema — prescription fields (PRES-01/02/03)', () => {
  const baseEntry = {
    exerciseId: 'ex-2',
    name: 'Deadlift',
    sets: 3,
    rest: 90,
    order: 0,
  };

  test('rejects repsMin > repsMax with message "Min must be <= max" on path repsMax', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry, repsMin: 10, repsMax: 8 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // zod v4 uses .issues (not .errors)
      const repMaxError = result.error.issues.find(
        (e) => e.path.includes('repsMax') && e.message === 'Min must be ≤ max'
      );
      expect(repMaxError).toBeDefined();
    }
  });

  test('accepts valid rep range repsMin <= repsMax', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry, repsMin: 8, repsMax: 10 }],
    });
    expect(result.success).toBe(true);
  });

  test('rejects targetRpe > 10', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry, targetRpe: 11 }],
    });
    expect(result.success).toBe(false);
  });

  test('accepts targetRpe: 8.5 (half-step allowed)', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry, targetRpe: 8.5 }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts omitted targetRpe (optional)', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts timed: true', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry, timed: true }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts omitting timed (v1.0 back-compat — missing means weighted)', () => {
    const result = routineSchema.safeParse({
      name: 'Pull Day',
      exercises: [{ ...baseEntry }],
    });
    expect(result.success).toBe(true);
  });

  test('accepts v1.0 legacy exercise with only reps field (back-compat)', () => {
    const result = routineSchema.safeParse({
      name: 'Leg Day',
      exercises: [{ exerciseId: 'ex-1', name: 'Squat', sets: 3, reps: 8, rest: 60, order: 0 }],
    });
    expect(result.success).toBe(true);
  });
});
