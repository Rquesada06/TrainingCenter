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
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
});

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
    try {
      const ref = firestore().collection('users').doc(firebaseUser.uid);
      const snap = await ref.get();
      let data = snap.data();

      // First Google sign-in: no USERS doc exists yet → create as trainer
      if (!snap.exists) {
        const newUser = {
          role: 'trainer' as const,
          trainerId: null,
          name: firebaseUser.displayName ?? '',
          email: firebaseUser.email ?? '',
          createdAt: firestore.FieldValue.serverTimestamp(),
        };
        await ref.set(newUser);
        data = newUser;
      }

      const role = data?.role;
      useAuthStore.getState().set({
        uid: firebaseUser.uid,
        role: (role === 'trainer' || role === 'client') ? role : null,
        trainerId: data?.trainerId ?? null,
        isLoaded: true,
      });
    } catch {
      // Firestore unreachable — sign out so the user lands on the sign-in screen
      // rather than freezing on the splash screen indefinitely.
      await auth().signOut();
    }
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

/**
 * Sign in with Google.
 * Gets a Google ID token via native Google Sign-In, then exchanges it for
 * a Firebase credential. Triggers onAuthStateChanged on success.
 * The auth listener reads the USERS doc — if no doc exists yet (first Google
 * sign-in for a trainer), the caller must create it via Firestore.
 */
export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google Sign-In did not return an ID token.');
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  await auth().signInWithCredential(googleCredential);
}
