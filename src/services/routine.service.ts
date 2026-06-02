/**
 * Routine service — Phase 02 Plan 04 (ROUT-01..07)
 *
 * Pure async CRUD functions for the 'routines' Firestore collection.
 * No React, no hooks — UI layer consumes via TanStack Query hooks.
 *
 * Security (ROUT-07 / T-02-01):
 *   - `listRoutines` MUST include `where('trainerId', '==', uid)` — without it,
 *     Firestore rules deny the entire query (defense-in-depth with rules).
 *   - `createRoutine` sets `trainerId` from the caller (authStore uid), NOT from
 *     form input — preventing a forged trainerId attack.
 *
 * Mirrors exercise.service.ts (Plan 02-02) exactly.
 */

import firestore from '@react-native-firebase/firestore';
import { routinesCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Routine, CreateRoutineInput } from '@/types/routine';

// ────────────────────────────────────────────────────────────────────────────
// Read
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all routines owned by a trainer, sorted by name A-Z.
 *
 * The `where('trainerId', '==', uid)` filter is REQUIRED — firestore.rules
 * verifies ownership server-side, but a query without this filter is rejected
 * with permission-denied (RESEARCH.md Pitfall 3).
 */
export async function listRoutines(uid: string): Promise<Routine[]> {
  const snap = await routinesCollection()
    .where('trainerId', '==', uid)
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((d) => {
    const { id: _omit, ...rest } = d.data() as Routine;
    void _omit; // id comes from doc.id not doc.data()
    return { id: d.id, ...rest } as Routine;
  });
}

/**
 * Fetches a single routine document by id.
 *
 * Returns null if the document does not exist.
 */
export async function getRoutine(id: string): Promise<Routine | null> {
  const snap = await routinesCollection().doc(id).get();
  if (!snap.exists) return null;
  const { id: _omit, ...rest } = snap.data()! as Routine;
  void _omit; // id comes from snap.id, not snap.data()
  return { id: snap.id, ...rest } as Routine;
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new routine document in Firestore.
 *
 * trainerId is set server-side from the caller's uid (not from form input).
 * Returns the new document's id.
 */
export async function createRoutine(args: {
  trainerId: string;
  input: CreateRoutineInput;
}): Promise<string> {
  const { trainerId, input } = args;
  const ref = await routinesCollection().add({
    ...stripUndefinedDeep(input),
    trainerId,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  } as Routine);
  return ref.id;
}

/**
 * Updates a routine document with the provided partial fields.
 * Always refreshes `updatedAt` with a server timestamp.
 */
export async function updateRoutine(
  id: string,
  partial: Partial<CreateRoutineInput>
): Promise<void> {
  await routinesCollection()
    .doc(id)
    .update({
      ...stripUndefinedDeep(partial),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Permanently deletes a routine document.
 * Firestore rules deny deletion if the document does not belong to the caller.
 */
export async function deleteRoutine(id: string): Promise<void> {
  await routinesCollection().doc(id).delete();
}
