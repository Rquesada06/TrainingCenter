/**
 * Zustand sessionStore — Phase 03 Plan 02 (WORK-08, D-11/D-14)
 *
 * Crash-safe in-progress workout session state. This is the FIRST `persist`
 * usage in the codebase — it wraps the store with AsyncStorage-backed
 * persistence so a force-kill mid-workout can be resumed.
 *
 * Persistence discipline:
 *   - `partialize` persists ONLY data fields (never the action functions).
 *   - On a date roll-over the consumer (client/index.tsx) compares the persisted
 *     `date` to today's local date and calls `clearSession()` to drop stale state
 *     (D-14 / Pitfall 4). `clearSession` resets to INITIAL.
 *
 * Across-session preferences (the last gym/home mode, D-09) live in a SEPARATE
 * AsyncStorage key — see src/lib/lastWorkoutMode.ts — NOT in this store, because
 * they must outlive `clearSession`.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ────────────────────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────────────────────

export interface LocalSessionState {
  /** Authenticated client uid for the in-progress session; null when inactive */
  clientId: string | null;
  /** YYYY-MM-DD of the in-progress session (local date); null when inactive */
  date: string | null;
  /** Snapshot week index being worked */
  weekIndex: number | null;
  /** Snapshot day index being worked */
  dayIndex: number | null;
  /** Source assignment id */
  assignmentId: string | null;
  /** Current workout mode */
  mode: 'gym' | 'home';
  /** Exercise ids the client has marked complete */
  completedExerciseIds: string[];
  /** ISO timestamp when the session started; null when inactive */
  startedAt: string | null;
  /** True while a workout is in progress (drives the resume prompt) */
  isActive: boolean;
}

/** Fields supplied when starting a session (everything except mode/completed/isActive). */
export interface StartSessionParams {
  clientId: string;
  date: string;
  weekIndex: number;
  dayIndex: number;
  assignmentId: string;
  startedAt: string;
}

export interface SessionStoreActions {
  /** Begins a session: sets snapshot fields, isActive=true, clears completed ids. */
  startSession: (params: StartSessionParams) => void;
  /** Adds or removes an exercise id from completedExerciseIds. */
  toggleExercise: (id: string) => void;
  /** Sets the current gym/home mode. */
  setMode: (mode: 'gym' | 'home') => void;
  /** Resets all data fields back to INITIAL (roll-over + finish path). */
  clearSession: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────────────────────────────────────

export const INITIAL: LocalSessionState = {
  clientId: null,
  date: null,
  weekIndex: null,
  dayIndex: null,
  assignmentId: null,
  mode: 'gym',
  completedExerciseIds: [],
  startedAt: null,
  isActive: false,
};

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useSessionStore = create<LocalSessionState & SessionStoreActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      startSession: (params) =>
        set({
          ...params,
          isActive: true,
          completedExerciseIds: [],
        }),

      toggleExercise: (id) => {
        const { completedExerciseIds } = get();
        const next = completedExerciseIds.includes(id)
          ? completedExerciseIds.filter((x) => x !== id)
          : [...completedExerciseIds, id];
        set({ completedExerciseIds: next });
      },

      setMode: (mode) => set({ mode }),

      clearSession: () => set(INITIAL),
    }),
    {
      name: 'laufit:session',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist ONLY data fields — never the action functions.
      partialize: (s) => ({
        clientId: s.clientId,
        date: s.date,
        weekIndex: s.weekIndex,
        dayIndex: s.dayIndex,
        assignmentId: s.assignmentId,
        mode: s.mode,
        completedExerciseIds: s.completedExerciseIds,
        startedAt: s.startedAt,
        isActive: s.isActive,
      }),
    }
  )
);
