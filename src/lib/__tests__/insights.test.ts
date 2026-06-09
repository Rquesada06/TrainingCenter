/**
 * insights pure-function tests — Phase 6 (INST-01/02).
 */

import {
  estimated1RM,
  sessionVolume,
  computePRs,
  volumeTrend,
  exerciseVolumeTrend,
} from '../insights';
import type { Session, LoggedSet } from '@/types/session';

const set = (
  setNumber: number,
  weight: number | null,
  reps: number | null,
  completed = true
): LoggedSet => ({ setNumber, weight, reps, rpe: null, completed });

function session(
  date: string,
  exercises: { exerciseId: string; name: string; timed?: boolean; sets: LoggedSet[] }[]
): Session {
  return {
    clientId: 'c1',
    trainerId: 't1',
    assignmentId: 'a1',
    date,
    weekIndex: 0,
    dayIndex: 0,
    mode: 'gym',
    startedAt: `${date}T10:00:00Z`,
    completedAt: `${date}T11:00:00Z`,
    completedExerciseIds: exercises.map((e) => e.exerciseId),
    totalExercises: exercises.length,
    loggedExercises: exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      timed: e.timed ?? false,
      sets: e.sets,
    })),
  } as unknown as Session;
}

describe('estimated1RM (Epley)', () => {
  it('returns the weight for a single rep', () => {
    expect(estimated1RM(100, 1)).toBe(100);
  });
  it('applies the Epley formula for multi-rep sets', () => {
    expect(estimated1RM(100, 10)).toBeCloseTo(133.33, 1); // 100 * (1 + 10/30)
  });
  it('returns 0 for non-positive inputs', () => {
    expect(estimated1RM(0, 5)).toBe(0);
    expect(estimated1RM(100, 0)).toBe(0);
  });
});

describe('sessionVolume', () => {
  it('sums weight×reps over completed weighted sets', () => {
    const s = session('2026-06-01', [
      { exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 5), set(2, 100, 5)] },
    ]);
    expect(sessionVolume(s.loggedExercises)).toBe(1000); // 100*5 + 100*5
  });
  it('ignores incomplete, blank, and timed sets', () => {
    const s = session('2026-06-01', [
      { exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 5), set(2, 100, 5, false), set(3, null, 5)] },
      { exerciseId: 'plank', name: 'Plank', timed: true, sets: [set(1, 0, 0)] },
    ]);
    expect(sessionVolume(s.loggedExercises)).toBe(500);
  });
  it('null-guards a v1.0 session with no loggedExercises', () => {
    expect(sessionVolume(undefined)).toBe(0);
  });
});

describe('computePRs', () => {
  const sessions = [
    session('2026-06-01', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 5)] }]),
    session('2026-06-08', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 110, 3), set(2, 120, 1)] }]),
  ];

  it('detects best estimated 1RM and heaviest weight per lift', () => {
    const prs = computePRs(sessions);
    expect(prs).toHaveLength(1);
    const pr = prs[0];
    // best 1RM: max(100*(1+5/30)=116.7, 110*(1+3/30)=121, 120) = 121 on 2026-06-08
    expect(pr.best1RM).toBeCloseTo(121, 1);
    expect(pr.best1RMDate).toBe('2026-06-08');
    expect(pr.heaviestWeight).toBe(120);
    expect(pr.heaviestWeightDate).toBe('2026-06-08');
  });

  it('flags isNew when the best 1RM is from the most recent session', () => {
    expect(computePRs(sessions)[0].isNew).toBe(true);
  });

  it('does NOT flag isNew when the PR is from an older session', () => {
    const s = [
      session('2026-06-01', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 150, 1)] }]),
      session('2026-06-08', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 1)] }]),
    ];
    expect(computePRs(s)[0].isNew).toBe(false);
  });

  it('omits lifts with no completed weighted set and timed exercises', () => {
    const s = [
      session('2026-06-01', [
        { exerciseId: 'plank', name: 'Plank', timed: true, sets: [set(1, 0, 0)] },
        { exerciseId: 'sq', name: 'Squat', sets: [set(1, null, null, false)] },
      ]),
    ];
    expect(computePRs(s)).toHaveLength(0);
  });
});

describe('volumeTrend', () => {
  it('returns overall volume per date, ascending', () => {
    const sessions = [
      session('2026-06-08', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 5)] }]),
      session('2026-06-01', [{ exerciseId: 'sq', name: 'Squat', sets: [set(1, 50, 5)] }]),
    ];
    expect(volumeTrend(sessions)).toEqual([
      { date: '2026-06-01', volume: 250 },
      { date: '2026-06-08', volume: 500 },
    ]);
  });
});

describe('exerciseVolumeTrend', () => {
  it('returns per-exercise volume per date for the chosen lift only', () => {
    const sessions = [
      session('2026-06-01', [
        { exerciseId: 'sq', name: 'Squat', sets: [set(1, 100, 5)] },
        { exerciseId: 'bp', name: 'Bench', sets: [set(1, 60, 5)] },
      ]),
    ];
    expect(exerciseVolumeTrend(sessions, 'sq')).toEqual([{ date: '2026-06-01', volume: 500 }]);
    expect(exerciseVolumeTrend(sessions, 'bp')).toEqual([{ date: '2026-06-01', volume: 300 }]);
  });
});
