/**
 * Zustand authStore — Phase 01 Plan 02
 *
 * Holds derived auth state from Firebase onAuthStateChanged.
 * Native Firebase SDK owns the actual session; this store is a read layer.
 *
 * Uses Zustand v5 API:
 * - `useShallow` instead of v4 `shallow` comparator
 * - State is immutable; only `set` and `clear` actions mutate it
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { UserRole } from '@/types/user';

// ────────────────────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────────────────────

interface AuthState {
  /** Firebase Auth uid, null when signed out */
  uid: string | null;
  /** Role read from Firestore USERS doc on each auth event */
  role: UserRole | null;
  /** For clients: their trainer's uid; null for trainers and signed-out users */
  trainerId: string | null;
  /**
   * Becomes true after the FIRST onAuthStateChanged event fires.
   * SplashScreen guard holds the native splash until this is true.
   * Also true after clear() — signed-out is a known/loaded state (AUTH-05).
   */
  isLoaded: boolean;
  /** Merge partial auth state (called by initAuthListener on sign-in) */
  set: (state: Partial<Omit<AuthState, 'set' | 'clear'>>) => void;
  /** Reset identity to null and mark as loaded (called on sign-out) */
  clear: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((setFn) => ({
  uid: null,
  role: null,
  trainerId: null,
  isLoaded: false,

  set: (partial) => setFn(partial),

  /**
   * Sign-out clear: identity fields → null, isLoaded → true.
   * isLoaded MUST remain true after sign-out so the root layout does not
   * re-show the native splash screen on the sign-out path (AUTH-05).
   */
  clear: () =>
    setFn({
      uid: null,
      role: null,
      trainerId: null,
      isLoaded: true,
    }),
}));

// ────────────────────────────────────────────────────────────────────────────
// Convenience hook
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reads { uid, role, isLoaded } from authStore with shallow equality.
 * useShallow prevents re-renders when unrelated state (trainerId) changes.
 */
export const useAuth = () =>
  useAuthStore(useShallow((s) => ({ uid: s.uid, role: s.role, isLoaded: s.isLoaded })));
