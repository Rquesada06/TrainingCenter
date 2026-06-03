/**
 * Session service — Phase 03 Plan 02 (WORK-06/07/08/09)
 *
 * Pure async functions for the SESSIONS + (client-scoped) ASSIGNMENTS reads.
 * No React, no hooks — the UI layer consumes via TanStack Query hooks.
 *
 * Security (relies on firestore.rules, not client checks):
 *   - findMyActiveAssignment / findTodaySession filter `clientId == self`. The
 *     read rules (`isClient() && resource.data.clientId == request.auth.uid`)
 *     block other clients' data server-side even if the filter were tampered
 *     (Threat T-03-04).
 *   - createSession sets `clientId` from the caller's session data; the sessions
 *     write rule enforces `request.resource.data.clientId == request.auth.uid`,
 *     so a forged clientId is rejected by rules (Threat T-03-03).
 *
 * Note: unlike the trainer-scoped `findActiveAssignmentForClient` in
 * client.service.ts, `findMyActiveAssignment` drops the `trainerId` filter — the
 * client has no trainerId to pass and the rule does not require one.
 */

import { assignmentsCollection, sessionsCollection } from '@/firebase/firestore';
import { stripUndefinedDeep } from '@/lib/firestoreWrite';
import type { Assignment } from '@/types/assignment';
import type { Session } from '@/types/session';

// ────────────────────────────────────────────────────────────────────────────
// Reads
// ────────────────────────────────────────────────────────────────────────────

/**
 * Reads the CLIENT'S OWN active assignment (clientId + status only).
 *
 * NO `trainerId` filter — the client reads their own assignment and the rule
 * `isClient() && resource.data.clientId == request.auth.uid` does not require it.
 * Returns null when the client has no active assignment.
 */
export async function findMyActiveAssignment(
  clientId: string
): Promise<Assignment | null> {
  const snap = await assignmentsCollection()
    .where('clientId', '==', clientId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null; // RNFB v24: empty is a property, not a method
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Assignment;
}

/**
 * Duplicate guard (WORK-09): returns today's session for the client if one
 * already exists, else null. Filters `clientId == self` AND `date == todayStr`.
 */
export async function findTodaySession(
  clientId: string,
  todayStr: string
): Promise<Session | null> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('date', '==', todayStr)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ...doc.data(), id: doc.id } as Session;
}

// ────────────────────────────────────────────────────────────────────────────
// Write
// ────────────────────────────────────────────────────────────────────────────

/**
 * Finish write (WORK-06/07): persists a completed session once and returns the
 * new document id. `startedAt` / `completedAt` are ISO strings already present
 * in `data` — no serverTimestamp append. Runs through `stripUndefinedDeep` so
 * Firestore never receives `undefined` values.
 */
export async function createSession(data: Omit<Session, 'id'>): Promise<string> {
  const ref = await sessionsCollection().add(stripUndefinedDeep(data) as Session);
  return ref.id;
}
