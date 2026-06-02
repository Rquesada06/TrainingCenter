/**
 * Exercise filter tests — Phase 02 Plan 01 (EXER-04, EXER-05).
 */

import { filterExercises } from '@/firebase/exerciseFilter';
import type { Exercise } from '@/types/exercise';

const make = (over: Partial<Exercise>): Exercise => ({
  id: 'id',
  trainerId: 't-1',
  name: 'Exercise',
  category: 'strength',
  locationTypes: ['gym'],
  createdAt: null,
  updatedAt: null,
  ...over,
});

const fixtures: Exercise[] = [
  make({ id: '1', name: 'Back Squat', category: 'strength', locationTypes: ['gym'] }),
  make({ id: '2', name: 'BACK SQUAT (Front)', category: 'strength', locationTypes: ['both'] }),
  make({ id: '3', name: 'Burpees', category: 'HIIT', locationTypes: ['home'] }),
  make({ id: '4', name: 'Treadmill Run', category: 'cardio', locationTypes: ['gym'] }),
  make({ id: '5', name: 'Mobility Flow', category: 'mobility', locationTypes: ['home'] }),
];

describe('filterExercises', () => {
  test('case-insensitive substring match on name', () => {
    const result = filterExercises(fixtures, { search: 'squat' });
    expect(result.map((e) => e.id).sort()).toEqual(['1', '2']);
  });

  test('filters by category exact match', () => {
    const result = filterExercises(fixtures, { category: 'cardio' });
    expect(result.map((e) => e.id)).toEqual(['4']);
  });

  test('locationType "gym" matches gym or both', () => {
    const result = filterExercises(fixtures, { locationType: 'gym' });
    // id 1 (gym), id 2 (both → wildcard), id 4 (gym)
    expect(result.map((e) => e.id).sort()).toEqual(['1', '2', '4']);
  });

  test('combined search + category + locationType (AND semantics)', () => {
    const result = filterExercises(fixtures, {
      search: 'squat',
      category: 'strength',
      locationType: 'gym',
    });
    expect(result.map((e) => e.id).sort()).toEqual(['1', '2']);
  });

  test('empty filter returns all exercises', () => {
    const result = filterExercises(fixtures, {});
    expect(result).toHaveLength(fixtures.length);
  });
});
