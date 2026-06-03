/**
 * Firebase Cloud Functions client-side caller.
 *
 * Uses v1-style httpsCallable (function name, not URL).
 * Calling by name is correct for v1 functions.https.onCall.
 *
 * DO NOT use httpsCallableFromURL — that is the v2 path and requires
 * knowing the full Cloud Run URL. v1 functions are identified by name.
 *
 * IMPORTANT — lazy callable creation:
 *   The httpsCallable reference is created INSIDE each call, not at module
 *   scope. Expo Router eager-loads route modules at startup, so a module-scope
 *   `functions().httpsCallable(...)` ref can be created before Firebase Auth has
 *   a current user. That stale ref invokes the function WITHOUT an auth token,
 *   and the onCall handler rejects it with `unauthenticated` even though the
 *   user is signed in. Creating the callable per-invocation attaches the current
 *   ID token. (Reference: RESEARCH Pattern 4, Pitfall 5 / T-04-05.)
 */

import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import type { CreateClientAccountInput, CreateClientAccountResult } from '@/types/user';
import type { CreateAssignmentInput, CreateAssignmentResult } from '@/types/assignment';

/**
 * Ensures a signed-in user with a fresh ID token before a callable invocation.
 * If `auth().currentUser` is null, the callable would reach the function without
 * a token → `unauthenticated`. Force-refreshing the token surfaces a clear error
 * and guarantees the SDK has a valid token to attach.
 */
async function requireFreshAuth(): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error(
      'You appear to be signed out (no active session). Please sign out and sign in again.',
    );
  }
  await user.getIdToken(true);
}

/**
 * Calls the createClientAccount Cloud Function (v1 onCall, by name).
 * Returns the raw httpsCallable result envelope (callers read `.data`).
 */
export async function createClientAccountCallable(input: CreateClientAccountInput) {
  await requireFreshAuth();
  return functions().httpsCallable<CreateClientAccountInput, CreateClientAccountResult>(
    'createClientAccount',
  )(input);
}

/**
 * Calls the createAssignment Cloud Function (v1 onCall, by name).
 * Returns the raw httpsCallable result envelope (callers read `.data`).
 */
export async function createAssignmentCallable(input: CreateAssignmentInput) {
  await requireFreshAuth();
  return functions().httpsCallable<CreateAssignmentInput, CreateAssignmentResult>(
    'createAssignment',
  )(input);
}

/**
 * Typed wrapper for calling createAssignment.
 * Unwraps result.data from the httpsCallable envelope.
 */
export async function callCreateAssignment(
  input: CreateAssignmentInput,
): Promise<CreateAssignmentResult> {
  const result = await createAssignmentCallable(input);
  return result.data;
}
