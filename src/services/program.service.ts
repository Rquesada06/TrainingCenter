/**
 * Program service — Phase 02 Plan 05 (PROG-01..06)
 *
 * Pure async CRUD functions for the 'programs' Firestore collection.
 * No React, no hooks — UI layer consumes via TanStack Query hooks.
 *
 * Security (PROG-06 / T-02-01):
 *   - `listPrograms` MUST include `where('trainerId', '==', uid)` — without it,
 *     Firestore rules deny the entire query (defense-in-depth with rules).
 *   - `createProgram` sets `trainerId` from the caller's uid (not from form input).
 *
 * PROG-04 default: `createProgram` auto-generates the `weeks` array if not provided.
 * Each week has 7 null day slots (null = unassigned; UI renders as REST per CONTEXT.md D-2).
 *
 * Mirrors routine.service.ts (Plan 02-04) exactly.
 */

import firestore from '@react-native-firebase/firestore';
import { programsCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Program, CreateProgramInput, ProgramDay, ProgramWeek } from '@/types/program';

// ────────────────────────────────────────────────────────────────────────────
// Read
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all programs owned by a trainer, sorted by name A-Z.
 *
 * The `where('trainerId', '==', uid)` filter is REQUIRED — Firestore rules
 * verify ownership server-side, but a query without this filter is rejected
 * with permission-denied (RESEARCH.md Pitfall 3).
 */
export async function listPrograms(uid: string): Promise<Program[]> {
  const snap = await programsCollection()
    .where('trainerId', '==', uid)
    .orderBy('name', 'asc')
    .get();

  return snap.docs.map((d) => {
    const { id: _omit, ...rest } = d.data() as Program;
    void _omit; // id comes from doc.id, not doc.data()
    return { id: d.id, ...rest } as Program;
  });
}

/**
 * Fetches a single program document by id.
 *
 * Returns null if the document does not exist or if Firestore rules deny access
 * (cross-trainer read attempt is caught as null, not thrown as an error — defense-in-depth).
 */
export async function getProgram(id: string): Promise<Program | null> {
  try {
    const snap = await programsCollection().doc(id).get();
    if (!snap.exists()) return null; // RNFB v24: exists is a method, not a property
    const { id: _omit, ...rest } = snap.data()! as Program;
    void _omit;
    return { id: snap.id, ...rest } as Program;
  } catch {
    return null; // permission-denied treated as not-found for cross-trainer defense
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new program document in Firestore.
 *
 * trainerId is set from the caller's uid (NOT from form input).
 *
 * PROG-04: if `input.weeks` is not provided, auto-generates an array of
 * `durationWeeks` weeks, each containing 7 null day slots. Null = unassigned;
 * the UI renders null and 'rest' identically per CONTEXT.md D-2.
 *
 * Returns the new document's id.
 */
export async function createProgram(args: {
  trainerId: string;
  input: Omit<CreateProgramInput, 'weeks'> & { weeks?: ProgramWeek[] };
}): Promise<string> {
  const { trainerId, input } = args;
  const weeks: ProgramWeek[] =
    input.weeks ?? Array.from({ length: input.durationWeeks }, () => ({
      days: Array(7).fill(null) as ProgramDay[],
    }));

  const ref = await programsCollection().add({
    ...stripUndefinedDeep({ name: input.name, description: input.description, durationWeeks: input.durationWeeks }),
    weeks,
    trainerId,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  } as Program);
  return ref.id;
}

/**
 * Updates a program document with the provided partial fields.
 * Always refreshes `updatedAt` with a server timestamp.
 */
export async function updateProgram(
  id: string,
  partial: Partial<CreateProgramInput>
): Promise<void> {
  await programsCollection()
    .doc(id)
    .update({
      ...stripUndefinedDeep(partial),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Permanently deletes a program document.
 * Active assignments keep their snapshot — the snapshot is immutable per ASGN-03.
 */
export async function deleteProgram(id: string): Promise<void> {
  await programsCollection().doc(id).delete();
}
