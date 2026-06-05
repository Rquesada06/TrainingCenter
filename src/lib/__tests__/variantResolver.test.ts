/**
 * Unit tests for variantResolver — Phase 03 Plan 01
 *
 * Pure function tests — no mocks required.
 * Tests cover the full gym/home/both/no-alt matrix (D-08, D-10).
 */

import { resolveVariant } from '../variantResolver';
import type { AssignmentSnapshotExercise } from '@/types/assignment';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

// Phase 05 Plan 01 — default prescription fields for existing test fixtures (PRES-01/02/03)
const DEFAULT_PRESCRIPTION = {
  repsMin: null,
  repsMax: null,
  targetRpe: null,
  timed: false,
} as const;

function makeExercise(
  locationTypes: ('gym' | 'home' | 'both')[],
  alternative: AssignmentSnapshotExercise | null = null
): AssignmentSnapshotExercise {
  return {
    exerciseId: 'ex-1',
    name: 'Test Exercise',
    sets: 3,
    reps: 10,
    duration: null,
    rest: 60,
    notes: null,
    locationTypes,
    videoUrl: null,
    imageUrl: null,
    alternativeExerciseId: alternative ? 'ex-2' : null,
    alternativeExercise: alternative,
    ...DEFAULT_PRESCRIPTION,
  };
}

const GYM_EXERCISE = makeExercise(['gym']);
const HOME_EXERCISE = makeExercise(['home']);
const BOTH_EXERCISE = makeExercise(['both']);

const ALT_GYM_EXERCISE: AssignmentSnapshotExercise = {
  exerciseId: 'ex-2',
  name: 'Alt Gym Exercise',
  sets: 3,
  reps: 12,
  duration: null,
  rest: 60,
  notes: null,
  locationTypes: ['gym'],
  videoUrl: null,
  imageUrl: null,
  alternativeExerciseId: null,
  alternativeExercise: null,
  ...DEFAULT_PRESCRIPTION,
};

const ALT_HOME_EXERCISE: AssignmentSnapshotExercise = {
  exerciseId: 'ex-2',
  name: 'Alt Home Exercise',
  sets: 3,
  reps: 12,
  duration: null,
  rest: 60,
  notes: null,
  locationTypes: ['home'],
  videoUrl: null,
  imageUrl: null,
  alternativeExerciseId: null,
  alternativeExercise: null,
  ...DEFAULT_PRESCRIPTION,
};

// ─────────────────────────────────────────────────────────────────────────────
// Matrix: primary fits mode
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveVariant — primary fits mode', () => {
  it('returns primary with null modeTag when primary is gym and mode is gym (D-08)', () => {
    const result = resolveVariant(GYM_EXERCISE, 'gym');
    expect(result.exercise).toBe(GYM_EXERCISE);
    expect(result.modeTag).toBeNull();
  });

  it('returns primary with null modeTag when primary is home and mode is home (D-08)', () => {
    const result = resolveVariant(HOME_EXERCISE, 'home');
    expect(result.exercise).toBe(HOME_EXERCISE);
    expect(result.modeTag).toBeNull();
  });

  it('returns primary with null modeTag when primary is both and mode is gym (D-08 — both counts as fitting)', () => {
    const result = resolveVariant(BOTH_EXERCISE, 'gym');
    expect(result.exercise).toBe(BOTH_EXERCISE);
    expect(result.modeTag).toBeNull();
  });

  it('returns primary with null modeTag when primary is both and mode is home (D-08 — both counts as fitting)', () => {
    const result = resolveVariant(BOTH_EXERCISE, 'home');
    expect(result.exercise).toBe(BOTH_EXERCISE);
    expect(result.modeTag).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Matrix: primary does NOT fit, alternative fits — swap (D-08)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveVariant — alternative swap', () => {
  it('swaps to home alternative when primary is gym-only and mode is home (D-08)', () => {
    const primary = makeExercise(['gym'], ALT_HOME_EXERCISE);
    const result = resolveVariant(primary, 'home');
    expect(result.exercise).toBe(ALT_HOME_EXERCISE);
    expect(result.modeTag).toBeNull();
  });

  it('swaps to gym alternative when primary is home-only and mode is gym (D-08)', () => {
    const primary = makeExercise(['home'], ALT_GYM_EXERCISE);
    const result = resolveVariant(primary, 'gym');
    expect(result.exercise).toBe(ALT_GYM_EXERCISE);
    expect(result.modeTag).toBeNull();
  });

  it('swaps to alternative with both locationTypes when mode is gym', () => {
    const altBoth: AssignmentSnapshotExercise = { ...ALT_HOME_EXERCISE, locationTypes: ['both'] };
    const primary = makeExercise(['gym'], altBoth);
    // primary fits gym → returns primary; set primary to home-only instead
    const homeOnlyPrimary = makeExercise(['home'], altBoth);
    const result = resolveVariant(homeOnlyPrimary, 'gym');
    expect(result.exercise).toBe(altBoth);
    expect(result.modeTag).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Matrix: neither fits — show primary with mode tag (D-10)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveVariant — no valid variant (D-10)', () => {
  it('shows gym-only primary with gym_only tag when mode is home and no alternative', () => {
    const result = resolveVariant(GYM_EXERCISE, 'home');
    expect(result.exercise).toBe(GYM_EXERCISE);
    expect(result.modeTag).toBe('gym_only');
  });

  it('shows home-only primary with home_only tag when mode is gym and no alternative', () => {
    const result = resolveVariant(HOME_EXERCISE, 'gym');
    expect(result.exercise).toBe(HOME_EXERCISE);
    expect(result.modeTag).toBe('home_only');
  });

  it('shows primary with gym_only tag when primary is gym, alternative is also gym, mode is home (D-10)', () => {
    const primary = makeExercise(['gym'], ALT_GYM_EXERCISE);
    const result = resolveVariant(primary, 'home');
    expect(result.exercise).toBe(primary);
    expect(result.modeTag).toBe('gym_only');
  });

  it('shows primary with home_only tag when primary is home, alternative is also home, mode is gym (D-10)', () => {
    const altHome2: AssignmentSnapshotExercise = { ...ALT_HOME_EXERCISE };
    const primary = makeExercise(['home'], altHome2);
    const result = resolveVariant(primary, 'gym');
    expect(result.exercise).toBe(primary);
    expect(result.modeTag).toBe('home_only');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Safety: exercise is never null (D-10)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveVariant — exercise never null (D-10)', () => {
  it('always returns a non-null exercise, even when nothing fits', () => {
    const result = resolveVariant(GYM_EXERCISE, 'home');
    expect(result.exercise).not.toBeNull();
    expect(result.exercise).toBeDefined();
  });

  it('always returns a non-null exercise when alternative is null and primary fits', () => {
    const result = resolveVariant(BOTH_EXERCISE, 'gym');
    expect(result.exercise).not.toBeNull();
  });
});
