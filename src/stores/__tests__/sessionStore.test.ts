/**
 * sessionStore unit tests — Phase 03 Plan 02 (WORK-08)
 *
 * Covers the crash-safe in-progress session store (Zustand v5 + persist +
 * AsyncStorage):
 *   - startSession sets the snapshot fields + isActive=true + clears completed ids
 *   - toggleExercise adds/removes an exercise id
 *   - setMode swaps gym/home
 *   - clearSession resets to INITIAL (the stale-date / roll-over reset path):
 *     date → null, isActive → false
 *
 * persist middleware needs AsyncStorage — mocked below. The store is reset to
 * INITIAL between tests via setState.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { useSessionStore, INITIAL } from '../sessionStore';

function getState() {
  return useSessionStore.getState();
}

beforeEach(() => {
  // Reset to INITIAL but keep the action functions (setState merges).
  useSessionStore.setState(INITIAL);
});

// ────────────────────────────────────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────────────────────────────────────

describe('sessionStore — initial state', () => {
  it('starts inactive, gym mode, empty completed ids, null date', () => {
    const s = getState();
    expect(s.isActive).toBe(false);
    expect(s.mode).toBe('gym');
    expect(s.completedExerciseIds).toEqual([]);
    expect(s.date).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// startSession
// ────────────────────────────────────────────────────────────────────────────

describe('sessionStore — startSession', () => {
  it('sets snapshot fields, isActive=true, and clears completedExerciseIds', () => {
    // Pre-dirty the completed ids to prove startSession clears them.
    useSessionStore.setState({ completedExerciseIds: ['stale'] });

    getState().startSession({
      clientId: 'client-1',
      date: '2026-06-03',
      weekIndex: 0,
      dayIndex: 1,
      assignmentId: 'assignment-1',
      startedAt: '2026-06-03T10:00:00.000Z',
    });

    const s = getState();
    expect(s.clientId).toBe('client-1');
    expect(s.date).toBe('2026-06-03');
    expect(s.weekIndex).toBe(0);
    expect(s.dayIndex).toBe(1);
    expect(s.assignmentId).toBe('assignment-1');
    expect(s.startedAt).toBe('2026-06-03T10:00:00.000Z');
    expect(s.isActive).toBe(true);
    expect(s.completedExerciseIds).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// toggleExercise
// ────────────────────────────────────────────────────────────────────────────

describe('sessionStore — toggleExercise', () => {
  it('adds an id when absent and removes it when present', () => {
    getState().toggleExercise('e1');
    expect(getState().completedExerciseIds).toEqual(['e1']);

    getState().toggleExercise('e2');
    expect(getState().completedExerciseIds).toEqual(['e1', 'e2']);

    getState().toggleExercise('e1');
    expect(getState().completedExerciseIds).toEqual(['e2']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setMode
// ────────────────────────────────────────────────────────────────────────────

describe('sessionStore — setMode', () => {
  it('swaps between gym and home', () => {
    getState().setMode('home');
    expect(getState().mode).toBe('home');
    getState().setMode('gym');
    expect(getState().mode).toBe('gym');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// clearSession — stale-date / roll-over reset (WORK-08)
// ────────────────────────────────────────────────────────────────────────────

describe('sessionStore — clearSession (stale-date reset)', () => {
  it('resets to INITIAL: date back to null, isActive false, completed ids empty', () => {
    // Simulate a persisted in-progress session from a previous day.
    getState().startSession({
      clientId: 'client-1',
      date: '2026-06-02', // yesterday
      weekIndex: 0,
      dayIndex: 1,
      assignmentId: 'assignment-1',
      startedAt: '2026-06-02T10:00:00.000Z',
    });
    getState().toggleExercise('e1');
    getState().setMode('home');

    // Consumer-side stale-date guard calls clearSession on roll-over.
    getState().clearSession();

    const s = getState();
    expect(s.date).toBeNull();
    expect(s.isActive).toBe(false);
    expect(s.completedExerciseIds).toEqual([]);
    expect(s.clientId).toBeNull();
    expect(s.mode).toBe('gym');
  });
});
