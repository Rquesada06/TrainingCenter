/**
 * Routine schema validation tests — Phase 02 Plan 01 (ROUT-01).
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
