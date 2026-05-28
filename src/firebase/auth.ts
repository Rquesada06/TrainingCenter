/**
 * Firebase auth listener + sign-in/sign-out helpers — Phase 01 Plan 02
 *
 * Follows RESEARCH Pattern 2: initAuthListener registers onAuthStateChanged,
 * reads the USERS Firestore doc on sign-in, and populates authStore.
 *
 * Design decisions per RESEARCH:
 * - NO custom AsyncStorage token caching — @react-native-firebase persists
 *   sessions natively; hand-rolled token storage breaks token refresh (AUTH-03)
 * - sendPasswordReset uses plain email — Firebase Dynamic Links was
 *   shut down August 25, 2025; no deep link config needed for MVP
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useAuthStore } from '@/stores/authStore';

// ────────────────────────────────────────────────────────────────────────────
// Auth listener
// ────────────────────────────────────────────────────────────────────────────

/**
 * Starts the Firebase onAuthStateChanged listener.
 * Call once from root _layout.tsx useEffect.
 * Returns the unsubscribe function — pass it as the useEffect cleanup.
 *
 * On signed-out: clears authStore (isLoaded → true, AUTH-05)
 * On signed-in:  reads USERS/{uid} from Firestore, then sets store
 *                with role + trainerId from the document (AUTH-01, AUTH-02)
 */
export function initAuthListener(): () => void {
  return auth().onAuthStateChanged(async (firebaseUser) => {
    if (!firebaseUser) {
      // Signed out — clear store; signed-out is a "loaded" state (AUTH-05)
      useAuthStore.getState().clear();
      return;
    }

    // Signed in — read role from Firestore USERS doc (one read per auth event)
    const snap = await firestore().collection('users').doc(firebaseUser.uid).get();
    const data = snap.data() as { role?: string; trainerId?: string } | undefined;

    useAuthStore.getState().set({
      uid: firebaseUser.uid,
      role: (data?.role as 'trainer' | 'client') ?? null,
      trainerId: data?.trainerId ?? null,
      isLoaded: true,
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ────────────────────────────────────────────────────────────────────────────

/** Sign in with email and password. Triggers onAuthStateChanged on success. */
export const signIn = (email: string, password: string) =>
  auth().signInWithEmailAndPassword(email, password);

/** Sign out the current user. Triggers onAuthStateChanged → authStore.clear(). */
export const signOut = () => auth().signOut();

/**
 * Send a password reset email.
 * No deep link config — Firebase Dynamic Links is shut down (Aug 2025).
 * Firebase-hosted web handler is used; user resets on web and returns to app.
 */
export const sendPasswordReset = (email: string) =>
  auth().sendPasswordResetEmail(email);
