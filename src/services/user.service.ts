/**
 * User service — consumed by the trainer UI in Phase 2.
 *
 * Provides a typed async function that wraps the createClientAccount
 * Cloud Function callable. The service layer abstracts the Firebase
 * callable API from the UI layer.
 */

import type { CreateClientAccountInput, CreateClientAccountResult } from '@/types/user';
import { createClientAccountCallable } from '@/firebase/functions';

/**
 * Creates a new client account by calling the createClientAccount Cloud Function.
 *
 * The function creates both a Firebase Auth user and a Firestore USERS doc
 * with role: 'client' and trainerId set to the calling trainer's uid.
 *
 * @param input - { name, email, temporaryPassword }
 * @returns { uid } — the Firebase Auth uid of the newly created client
 * @throws Firebase HttpsError on permission-denied, unauthenticated, already-exists
 */
export async function createClientAccount(
  input: CreateClientAccountInput
): Promise<CreateClientAccountResult> {
  const result = await createClientAccountCallable(input);
  return result.data;
}
