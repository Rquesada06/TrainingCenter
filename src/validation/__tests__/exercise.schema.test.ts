/**
 * Exercise schema validation tests — Phase 02 Plan 01 (EXER-01).
 * Covers threat T-02-06: reject invalid category / negative numerics at form boundary.
 */

import { exerciseSchema } from '@/validation/exercise.schema';

const validMinimal = {
  name: 'Back Squat',
  category: 'strength',
  locationTypes: ['gym'],
};

describe('exerciseSchema', () => {
  test('rejects missing name (empty string)', () => {
    const result = exerciseSchema.safeParse({ ...validMinimal, name: '' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid category not in enum (T-02-06)', () => {
    const result = exerciseSchema.safeParse({
      ...validMinimal,
      category: 'powerlifting',
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty locationTypes array (min 1)', () => {
    const result = exerciseSchema.safeParse({
      ...validMinimal,
      locationTypes: [],
    });
    expect(result.success).toBe(false);
  });

  test('rejects negative numeric fields', () => {
    expect(
      exerciseSchema.safeParse({ ...validMinimal, defaultSets: -1 }).success
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validMinimal, defaultReps: -5 }).success
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validMinimal, defaultDuration: -10 }).success
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validMinimal, defaultRest: -3 }).success
    ).toBe(false);
  });

  test('coerces numeric strings to numbers ("5" -> 5)', () => {
    const result = exerciseSchema.safeParse({
      ...validMinimal,
      defaultSets: '5',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultSets).toBe(5);
    }
  });

  test('rejects malformed videoUrl but accepts empty string and valid url', () => {
    expect(
      exerciseSchema.safeParse({ ...validMinimal, videoUrl: 'not-a-url' }).success
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validMinimal, videoUrl: '' }).success
    ).toBe(true);
    expect(
      exerciseSchema.safeParse({
        ...validMinimal,
        videoUrl: 'https://youtube.com/watch?v=abc',
      }).success
    ).toBe(true);
  });

  test('accepts a minimal valid exercise (name + category + locationTypes)', () => {
    const result = exerciseSchema.safeParse(validMinimal);
    expect(result.success).toBe(true);
  });
});
