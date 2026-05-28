/**
 * Shared user type contracts consumed by all Phase 1+ plans.
 * Interface-first ordering: defined here, imported everywhere else.
 */

/**
 * The two roles in the LauFit system.
 * - 'trainer': Creates programs, manages clients, creates routines.
 * - 'client': Executes programs assigned by their trainer.
 */
export type UserRole = 'trainer' | 'client';

/**
 * Firestore USERS collection document shape.
 * Written by createClientAccount Cloud Function (for clients) and
 * read by the auth listener to hydrate the authStore.
 */
export interface User {
  uid: string;
  role: UserRole;
  trainerId: string | null;
  name: string;
  email: string;
  /**
   * Firestore server timestamp. Type is `unknown` here because
   * the Firestore Timestamp type is imported from @react-native-firebase/firestore
   * which is a native module — plan 04 will refine this if needed.
   */
  createdAt?: unknown;
}

/**
 * Input contract for the createClientAccount Cloud Function.
 * Called by the trainer's UI to create a new client account.
 */
export interface CreateClientAccountInput {
  name: string;
  email: string;
  temporaryPassword: string;
}

/**
 * Result contract returned by the createClientAccount Cloud Function.
 * The uid is the Firebase Auth uid of the newly created client.
 */
export interface CreateClientAccountResult {
  uid: string;
}
