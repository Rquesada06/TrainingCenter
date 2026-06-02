import { stripUndefinedDeep } from '@/lib/firestoreWrite';

describe('stripUndefinedDeep', () => {
  it('removes top-level undefined keys (the optional-blank-field case)', () => {
    expect(stripUndefinedDeep({ name: 'Squat', videoUrl: undefined, defaultSets: undefined }))
      .toEqual({ name: 'Squat' });
  });

  it('preserves null and empty strings — only undefined is dropped', () => {
    expect(stripUndefinedDeep({ a: null, b: '', c: 0, d: false, e: undefined }))
      .toEqual({ a: null, b: '', c: 0, d: false });
  });

  it('strips undefined inside nested objects', () => {
    expect(stripUndefinedDeep({ meta: { reps: 10, notes: undefined } }))
      .toEqual({ meta: { reps: 10 } });
  });

  it('strips undefined inside array items (routine exercises case)', () => {
    expect(
      stripUndefinedDeep({
        exercises: [
          { exerciseId: 'a', sets: 3, alternativeId: undefined },
          { exerciseId: 'b', notes: undefined, reps: 12 },
        ],
      }),
    ).toEqual({
      exercises: [
        { exerciseId: 'a', sets: 3 },
        { exerciseId: 'b', reps: 12 },
      ],
    });
  });

  it('returns primitives unchanged', () => {
    expect(stripUndefinedDeep('x')).toBe('x');
    expect(stripUndefinedDeep(5)).toBe(5);
  });
});
