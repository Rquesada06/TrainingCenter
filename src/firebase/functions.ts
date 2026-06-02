/**
 * Firebase Cloud Functions client-side caller.
 *
 * Uses v1-style httpsCallable (function name, not URL).
 * Calling by name is correct for v1 functions.https.onCall.
 *
 * DO NOT use httpsCallableFromURL — that is the v2 path and requires
 * knowing the full Cloud Run URL. v1 functions are identified by name.
 *
 * Reference: RESEARCH Pattern 4, Pitfall 5
 * T-04-05 mitigation: v1 onCall ensures context.auth propagates correctly
 * when called via @react-native-firebase/functions httpsCallable('name').
 */

import functions from '@react-native-firebase/functions';
import type { CreateClientAccountInput, CreateClientAccountResult } from '@/types/user';
import type { CreateAssignmentInput, CreateAssignmentResult } from '@/types/assignment';

/**
 * Callable reference for the createClientAccount Cloud Function.
 * The function is identified by name — v1 onCall is deployed and
 * called by name via httpsCallable('createClientAccount').
 */
export const createClientAccountCallable = functions().httpsCallable<
  CreateClientAccountInput,
  CreateClientAccountResult
>('createClientAccount');

/**
 * Callable reference for the createAssignment Cloud Function (Phase 02 Plan 05).
 * Uses v1 onCall — same pattern as createClientAccount (Pitfall 5, STATE.md).
 *
 * Input: { programId, clientId, startDate: YYYY-MM-DD }
 * Output: { assignmentId: string }
 */
export const createAssignmentCallable = functions().httpsCallable<
  CreateAssignmentInput,
  CreateAssignmentResult
>('createAssignment');

/**
 * Typed wrapper for calling createAssignment.
 * Unwraps result.data from the httpsCallable envelope.
 */
export async function callCreateAssignment(
  input: CreateAssignmentInput
): Promise<CreateAssignmentResult> {
  const result = await createAssignmentCallable(input);
  return result.data;
}
