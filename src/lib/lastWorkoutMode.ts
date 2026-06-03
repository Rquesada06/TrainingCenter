/**
 * lastWorkoutMode — Phase 03 Plan 02 (D-09)
 *
 * Across-session persistence of the last-used gym/home mode. Kept in a SEPARATE
 * AsyncStorage key from sessionStore so it survives `clearSession()` (and thus
 * day roll-overs / finishing a workout) — the next workout should default to the
 * mode the client last used, not reset to 'gym' every day.
 *
 * Default is 'gym': returns 'home' only when the stored value is exactly 'home'.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_MODE_KEY = 'laufit:lastWorkoutMode';

export type WorkoutMode = 'gym' | 'home';

/** Reads the last-used mode. Returns 'home' iff stored === 'home', else 'gym'. */
export async function getLastMode(): Promise<WorkoutMode> {
  const stored = await AsyncStorage.getItem(LAST_MODE_KEY);
  return stored === 'home' ? 'home' : 'gym';
}

/** Persists the last-used mode for the next session. */
export async function setLastMode(mode: WorkoutMode): Promise<void> {
  await AsyncStorage.setItem(LAST_MODE_KEY, mode);
}
