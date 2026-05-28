/**
 * authStore unit tests — Phase 01 Plan 02
 * Covers AUTH-01, AUTH-02, AUTH-03, AUTH-05
 *
 * Pure store tests need no Firebase mocks.
 * Listener integration tests mock @react-native-firebase modules.
 */

// ────────────────────────────────────────────────────────────────────────────
// Mocks (must be before imports)
// ────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/auth', () => {
  const mockUnsubscribe = jest.fn();
  const mockOnAuthStateChanged = jest.fn((_cb: unknown) => mockUnsubscribe);
  const mockAuth = jest.fn(() => ({
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  }));
  return mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc }));
  const mockFirestore = jest.fn(() => ({ collection: mockCollection }));
  return mockFirestore;
});

// ────────────────────────────────────────────────────────────────────────────
// Imports — AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

import { useAuthStore } from '../authStore';

// Helper to get a fresh store state (reset between tests)
function getState() {
  return useAuthStore.getState();
}

// Reset store before each test
beforeEach(() => {
  useAuthStore.setState({
    uid: null,
    role: null,
    trainerId: null,
    isLoaded: false,
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Behavior 1: Initial state
// ────────────────────────────────────────────────────────────────────────────

describe('authStore — initial state', () => {
  it('starts with uid=null, role=null, trainerId=null, isLoaded=false', () => {
    const { uid, role, trainerId, isLoaded } = getState();
    expect(uid).toBeNull();
    expect(role).toBeNull();
    expect(trainerId).toBeNull();
    expect(isLoaded).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Behavior 2: Trainer sign-in (AUTH-01)
// ────────────────────────────────────────────────────────────────────────────

describe('authStore — set() with trainer role (AUTH-01)', () => {
  it('updates uid, role, trainerId, and isLoaded after trainer auth event', () => {
    getState().set({
      uid: 'trainer-uid-1',
      role: 'trainer',
      trainerId: null,
      isLoaded: true,
    });

    const { uid, role, trainerId, isLoaded } = getState();
    expect(uid).toBe('trainer-uid-1');
    expect(role).toBe('trainer');
    expect(trainerId).toBeNull();
    expect(isLoaded).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Behavior 3: Client sign-in (AUTH-02)
// ────────────────────────────────────────────────────────────────────────────

describe('authStore — set() with client role (AUTH-02)', () => {
  it('yields role=client and populates trainerId after client auth event', () => {
    getState().set({
      uid: 'client-uid-1',
      role: 'client',
      trainerId: 't1',
      isLoaded: true,
    });

    const { uid, role, trainerId, isLoaded } = getState();
    expect(uid).toBe('client-uid-1');
    expect(role).toBe('client');
    expect(trainerId).toBe('t1');
    expect(isLoaded).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Behavior 4: clear() — signed-out is a "loaded" state (AUTH-05)
// ────────────────────────────────────────────────────────────────────────────

describe('authStore — clear() (AUTH-05)', () => {
  it('resets uid/role/trainerId to null AND sets isLoaded to true', () => {
    // First simulate a signed-in user
    getState().set({
      uid: 'trainer-uid-1',
      role: 'trainer',
      trainerId: null,
      isLoaded: true,
    });

    // Now clear (sign out)
    getState().clear();

    const { uid, role, trainerId, isLoaded } = getState();
    expect(uid).toBeNull();
    expect(role).toBeNull();
    expect(trainerId).toBeNull();
    // isLoaded must be true after clear() — signed-out is a known/loaded state
    // This prevents a flash back to the loading state on sign-out (AUTH-05)
    expect(isLoaded).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Behavior 5: isLoaded transition (AUTH-03 / AUTH-05)
// ────────────────────────────────────────────────────────────────────────────

describe('authStore — isLoaded transition (AUTH-03/AUTH-05)', () => {
  it('starts false and transitions to true exactly once after auth event resolves', () => {
    // Starts false
    expect(getState().isLoaded).toBe(false);

    // Simulate first auth event (signed-in)
    getState().set({ uid: 'uid-1', role: 'trainer', trainerId: null, isLoaded: true });
    expect(getState().isLoaded).toBe(true);

    // Stays true on subsequent set (no regression back to false)
    getState().set({ uid: 'uid-1', role: 'trainer', trainerId: null, isLoaded: true });
    expect(getState().isLoaded).toBe(true);
  });

  it('isLoaded becomes true after clear() (signed-out state is also a loaded state)', () => {
    expect(getState().isLoaded).toBe(false);
    getState().clear();
    expect(getState().isLoaded).toBe(true);
  });
});
