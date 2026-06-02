/**
 * Exercise service — Phase 02 Plan 02 (EXER-01..06)
 *
 * Pure async CRUD functions for the 'exercises' Firestore collection.
 * No React, no hooks — UI layer consumes via TanStack Query hooks.
 *
 * Security (EXER-06 / T-02-01):
 *   - `listExercises` MUST include `where('trainerId', '==', uid)` — without it,
 *     Firestore rules deny the entire query (defense-in-depth with rules).
 *   - `createExercise` sets `trainerId` from the caller (authStore uid), NOT from
 *     form input — preventing Threat T-02-04 (forged trainerId).
 */

import firestore from '@react-native-firebase/firestore';
import { exercisesCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Exercise, CreateExerciseInput } from '@/types/exercise';

// ────────────────────────────────────────────────────────────────────────────
// Read
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all exercises owned by a trainer, sorted by name A-Z.
 *
 * The `where('trainerId', '==', uid)` filter is REQUIRED — firestore.rules
 * verifies ownership server-side, but a query without this filter is rejected
 * with permission-denied (RESEARCH.md Pitfall 3).
 */
export async function listExercises(uid: string): Promise<Exercise[]> {
  const snap = await exercisesCollection()
    .where('trainerId', '==', uid)
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((d) => {
    const { id: _omit, ...rest } = d.data() as Exercise;
    void _omit; // unused — id comes from doc.id not doc.data()
    return { id: d.id, ...rest } as Exercise;
  });
}

/**
 * Fetches a single exercise document by id.
 *
 * Returns null if the document does not exist (clean handling for deleted exercises
 * and defense-in-depth for T-02-02: caller catches permission-denied separately).
 */
export async function getExercise(id: string): Promise<Exercise | null> {
  const snap = await exercisesCollection().doc(id).get();
  if (!snap.exists()) return null; // RNFB v24: exists is a method, not a property
  const { id: _omit, ...rest } = snap.data()! as Exercise;
  void _omit; // id comes from snap.id, not snap.data()
  return { id: snap.id, ...rest } as Exercise;
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new exercise document in Firestore.
 *
 * trainerId is set server-side from the caller's uid (not from form input).
 * Returns the new document's id.
 */
export async function createExercise(args: {
  trainerId: string;
  input: CreateExerciseInput;
}): Promise<string> {
  const { trainerId, input } = args;
  const ref = await exercisesCollection().add({
    ...stripUndefinedDeep(input),
    trainerId,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  } as Exercise);
  return ref.id;
}

/**
 * Updates an exercise document with the provided partial fields.
 * Always refreshes `updatedAt` with a server timestamp.
 */
export async function updateExercise(
  id: string,
  partial: Partial<CreateExerciseInput>
): Promise<void> {
  await exercisesCollection()
    .doc(id)
    .update({
      ...stripUndefinedDeep(partial),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Permanently deletes an exercise document.
 * Firestore rules deny deletion if the document does not belong to the caller.
 */
export async function deleteExercise(id: string): Promise<void> {
  await exercisesCollection().doc(id).delete();
}
