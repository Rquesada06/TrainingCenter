/**
 * Client service — Phase 02 Plan 03 (CLNT-02..05)
 *
 * Pure async functions for reading and updating trainer-owned client documents
 * from the 'users' Firestore collection, and for querying assignments.
 *
 * Security (T-02-03):
 *   - `listClients` MUST include both where('role','==','client') AND
 *     where('trainerId','==',uid) — without trainerId filter, a trainer
 *     could read clients belonging to other trainers (defense-in-depth with rules).
 *
 * Security (T-02-CLNT-EDIT):
 *   - `updateClientProfile` only accepts non-privileged fields (name).
 *     The Firestore rule (trainer-update-client, added in Task 3) enforces
 *     server-side that role/trainerId/email cannot be mutated via this path.
 */

import { usersCollection, assignmentsCollection } from '@/firebase/firestore';
import type { User } from '@/types/user';
import type { Assignment } from '@/types/assignment';

// ────────────────────────────────────────────────────────────────────────────
// Read
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all clients owned by a trainer, sorted by name A-Z.
 *
 * Both filters are REQUIRED:
 *   - where('role','==','client'): excludes other trainers from the result set
 *   - where('trainerId','==',trainerId): scopes to this trainer's clients only
 *     (Firestore rules enforce server-side, but the filter is defense-in-depth)
 *
 * The composite index (role ASC + trainerId ASC + name ASC) is in firestore.indexes.json.
 */
export async function listClients(trainerId: string): Promise<User[]> {
  const snap = await usersCollection()
    .where('role', '==', 'client')
    .where('trainerId', '==', trainerId)
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((d) => ({ ...d.data(), uid: d.id } as User));
}

/**
 * Fetches a single client document by uid.
 * Returns null if the document does not exist.
 */
export async function getClient(uid: string): Promise<User | null> {
  const snap = await usersCollection().doc(uid).get();
  if (!snap.exists()) return null; // RNFB v24: exists is a method, not a property
  return { ...snap.data()!, uid: snap.id } as User;
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Updates non-privileged profile fields on a client's user document.
 *
 * Only `name` is accepted for Phase 2 (photo upload is Phase 4 — PROF-02/03).
 * The server-side trainer-update-client Firestore rule (added in Plan 02-03 Task 3)
 * enforces that role, trainerId, and email cannot be changed via this path.
 *
 * Authorized only when the signed-in user is the client's owning trainer.
 */
export async function updateClientProfile(
  uid: string,
  partial: { name?: string }
): Promise<void> {
  await usersCollection().doc(uid).update(partial);
}

// ────────────────────────────────────────────────────────────────────────────
// Assignments
// ────────────────────────────────────────────────────────────────────────────

/**
 * Finds the active assignment for a given client, or returns null if none.
 *
 * Used by:
 *   - ClientListItem (CLNT-02/05): per-row active program label + no-program indicator
 *   - Plan 02-04 (ASGN-02): overwrite check before creating a new assignment
 *
 * The `where('trainerId','==',trainerId)` filter is REQUIRED — the assignments
 * read rule only allows a trainer to read docs where trainerId == their uid, so
 * a query without it is rejected with permission-denied (defense-in-depth).
 */
export async function findActiveAssignmentForClient(
  clientId: string,
  trainerId: string
): Promise<Assignment | null> {
  const snap = await assignmentsCollection()
    .where('trainerId', '==', trainerId)
    .where('clientId', '==', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.docs.length === 0) return null;
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Assignment;
}
