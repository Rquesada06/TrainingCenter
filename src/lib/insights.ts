/**
 * insights — pure training-analytics functions for Phase 6 (INST-01/02, COAV).
 *
 * No React, no Firebase. Consume `Session.loggedExercises` (Phase 5 per-set data).
 * Every reader null-guards loggedExercises (v1.0 back-compat) and ignores timed
 * exercises and incomplete/blank sets (weight/reps may be null).
 *
 * - estimated1RM: Epley formula — weight × (1 + reps/30); reps=1 → weight.
 * - PRs (INST-01): per lift, best estimated 1RM + heaviest single-set weight.
 * - Volume (INST-02): Σ weight×reps over completed weighted sets, overall or per lift.
 */

import type { Session, LoggedExercise } from '@/types/session';

/** Epley estimated one-rep max. Returns 0 for non-positive inputs. */
export function estimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Total volume (Σ weight×reps) of completed weighted sets in one session. */
export function sessionVolume(loggedExercises?: LoggedExercise[]): number {
  if (!loggedExercises) return 0;
  return loggedExercises.reduce((tot, ex) => {
    if (ex.timed) return tot;
    return (
      tot +
      ex.sets.reduce(
        (s, set) =>
          set.completed && set.weight != null && set.reps != null
            ? s + set.weight * set.reps
            : s,
        0
      )
    );
  }, 0);
}

export interface ExercisePR {
  exerciseId: string;
  name: string;
  /** Best Epley estimated 1RM across all logged sets. */
  best1RM: number;
  best1RMDate: string;
  /** Heaviest single-set weight lifted (any rep count). */
  heaviestWeight: number;
  heaviestWeightDate: string;
  /** True when the best 1RM was achieved in this lift's most recent session. */
  isNew: boolean;
}

/**
 * Auto-detected personal records per lift across a client's session history.
 * Sorted by exercise name. Lifts with no completed weighted set are omitted.
 */
export function computePRs(sessions: Session[]): ExercisePR[] {
  interface Acc {
    exerciseId: string;
    name: string;
    best1RM: number;
    best1RMDate: string;
    heaviestWeight: number;
    heaviestWeightDate: string;
    latestDate: string;
  }
  const map = new Map<string, Acc>();

  for (const sess of sessions) {
    const date = sess.date;
    for (const ex of sess.loggedExercises ?? []) {
      if (ex.timed) continue;
      let acc = map.get(ex.exerciseId);
      if (!acc) {
        acc = {
          exerciseId: ex.exerciseId,
          name: ex.name,
          best1RM: 0,
          best1RMDate: date,
          heaviestWeight: 0,
          heaviestWeightDate: date,
          latestDate: date,
        };
        map.set(ex.exerciseId, acc);
      }
      acc.name = ex.name; // prefer the most recently seen name
      if (date > acc.latestDate) acc.latestDate = date;
      for (const set of ex.sets) {
        if (!set.completed || set.weight == null || set.reps == null) continue;
        const e1rm = estimated1RM(set.weight, set.reps);
        if (e1rm > acc.best1RM) {
          acc.best1RM = e1rm;
          acc.best1RMDate = date;
        }
        if (set.weight > acc.heaviestWeight) {
          acc.heaviestWeight = set.weight;
          acc.heaviestWeightDate = date;
        }
      }
    }
  }

  return Array.from(map.values())
    .filter((a) => a.best1RM > 0)
    .map((a) => ({
      exerciseId: a.exerciseId,
      name: a.name,
      best1RM: a.best1RM,
      best1RMDate: a.best1RMDate,
      heaviestWeight: a.heaviestWeight,
      heaviestWeightDate: a.heaviestWeightDate,
      isNew: a.best1RMDate === a.latestDate,
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

export interface VolumePoint {
  date: string;
  volume: number;
}

/** Overall volume per session date, ascending by date (sessions on the same date sum). */
export function volumeTrend(sessions: Session[]): VolumePoint[] {
  const byDate = new Map<string, number>();
  for (const sess of sessions) {
    byDate.set(sess.date, (byDate.get(sess.date) ?? 0) + sessionVolume(sess.loggedExercises));
  }
  return Array.from(byDate.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Volume for one exercise per session date, ascending by date. */
export function exerciseVolumeTrend(sessions: Session[], exerciseId: string): VolumePoint[] {
  const byDate = new Map<string, number>();
  for (const sess of sessions) {
    const ex = (sess.loggedExercises ?? []).find(
      (e) => e.exerciseId === exerciseId && !e.timed
    );
    if (!ex) continue;
    const vol = ex.sets.reduce(
      (s, set) =>
        set.completed && set.weight != null && set.reps != null
          ? s + set.weight * set.reps
          : s,
      0
    );
    byDate.set(sess.date, (byDate.get(sess.date) ?? 0) + vol);
  }
  return Array.from(byDate.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
