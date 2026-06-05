/**
 * Zustand sessionStore — Phase 03 Plan 02 (WORK-08, D-11/D-14)
 *                       + Phase 05 Plan 02 (LOG-01/LOG-02)
 *
 * Crash-safe in-progress workout session state. This is the FIRST `persist`
 * usage in the codebase — it wraps the store with AsyncStorage-backed
 * persistence so a force-kill mid-workout can be resumed.
 *
 * Phase 05 Plan 02 additions:
 *   - `loggedSets: Record<string, LoggedSet[]>` — per-exercise per-set live state
 *   - `setSetValue` — immutable-update for a single set field (weight/reps/rpe)
 *   - `toggleSet` — flips a set's `completed` flag
 *   - `seedExercise` — seeds loggedSets[exerciseId] from prefill resolver output
 *   - `loggedSets` added to `partialize` for crash-safe persistence
 *   - `clearSession` already calls `set(INITIAL)` → resets loggedSets to {} automatically
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
 *
 * Back-compat: pre-Phase-5 persisted blobs have no `loggedSets` key. The custom
 * `merge` function provides `{}` as the default so hydration never yields undefined.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoggedSet } from '@/types/session';

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
  /**
   * Per-exercise per-set live state (LOG-01/02 — Phase 05 Plan 02).
   * Key: exerciseId, Value: ordered array of LoggedSet for that exercise.
   * INITIAL: {} — a pre-Phase-5 hydrated blob may have this undefined;
   * the custom `merge` function ensures it defaults to {} on hydration.
   */
  loggedSets: Record<string, LoggedSet[]>;
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
  /**
   * Sets a single field on a specific set for an exercise (LOG-01).
   * Immutable update — mirrors toggleExercise style.
   */
  setSetValue: (
    exerciseId: string,
    setNumber: number,
    field: 'weight' | 'reps' | 'rpe',
    value: number | null
  ) => void;
  /**
   * Flips a set's `completed` flag (LOG-02).
   * Immutable update — does not alter weight/reps/rpe.
   */
  toggleSet: (exerciseId: string, setNumber: number) => void;
  /**
   * Seeds loggedSets[exerciseId] from a prefill resolver result (LOG-01).
   * Called once per exercise on first expand (avoids re-seeding on re-render).
   */
  seedExercise: (exerciseId: string, seeds: LoggedSet[]) => void;
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
  loggedSets: {},
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
          loggedSets: {},
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

      setSetValue: (exerciseId, setNumber, field, value) => {
        const { loggedSets } = get();
        const currentSets = loggedSets[exerciseId] ?? [];
        const updatedSets = currentSets.map((s) =>
          s.setNumber === setNumber ? { ...s, [field]: value } : s
        );
        set({ loggedSets: { ...loggedSets, [exerciseId]: updatedSets } });
      },

      toggleSet: (exerciseId, setNumber) => {
        const { loggedSets } = get();
        const currentSets = loggedSets[exerciseId] ?? [];
        const updatedSets = currentSets.map((s) =>
          s.setNumber === setNumber ? { ...s, completed: !s.completed } : s
        );
        set({ loggedSets: { ...loggedSets, [exerciseId]: updatedSets } });
      },

      seedExercise: (exerciseId, seeds) => {
        const { loggedSets } = get();
        set({ loggedSets: { ...loggedSets, [exerciseId]: seeds } });
      },
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
        loggedSets: s.loggedSets,  // crash-safe: survives force-kill mid-workout (LOG-01/02)
      }),
      // Custom merge: ensures loggedSets from pre-Phase-5 blobs (no key) defaults to {}
      // rather than being left undefined (Zustand's default merge is Object.assign).
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<LocalSessionState>),
        loggedSets: (persisted as Partial<LocalSessionState>)?.loggedSets ?? {},
      }),
    }
  )
);
