/**
 * Program schema validation tests — Phase 02 Plan 01 (PROG-01).
 */

import { programSchema } from '@/validation/program.schema';

const validProgram = {
  name: '12 Week Strength',
  durationWeeks: 12,
};

describe('programSchema', () => {
  test('rejects empty name', () => {
    expect(
      programSchema.safeParse({ ...validProgram, name: '' }).success
    ).toBe(false);
  });

  test('rejects durationWeeks < 1', () => {
    expect(
      programSchema.safeParse({ ...validProgram, durationWeeks: 0 }).success
    ).toBe(false);
  });

  test('rejects durationWeeks > 26 (MVP cap)', () => {
    expect(
      programSchema.safeParse({ ...validProgram, durationWeeks: 27 }).success
    ).toBe(false);
  });

  test('coerces "8" -> 8 for durationWeeks', () => {
    const result = programSchema.safeParse({
      ...validProgram,
      durationWeeks: '8',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationWeeks).toBe(8);
    }
  });

  test('optional description accepted as empty string or absent', () => {
    expect(
      programSchema.safeParse({ ...validProgram, description: '' }).success
    ).toBe(true);
    expect(programSchema.safeParse(validProgram).success).toBe(true);
  });
});
