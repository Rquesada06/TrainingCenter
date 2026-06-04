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
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

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
// Pagination + adherence reads (Phase 04 — HIST-01/03/04)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Page size for session history queries (HIST-01/03).
 * Exposed so useSessionHistory hook's getNextPageParam can reference the same constant.
 */
export const SESSION_PAGE_SIZE = 20;

/**
 * One page of session history results.
 *
 * `lastDoc` is the Firestore cursor to pass as `startAfter` on the next call.
 * It is `undefined` when `items.length < SESSION_PAGE_SIZE`, signalling the last page.
 */
export interface SessionPage {
  items: Session[];
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot<Session> | undefined;
}

/**
 * Fetch one page of sessions for a client, newest-first.
 *
 * Pass `cursor = undefined` for the first page. Pass `lastDoc` from the previous
 * result to fetch the next page (.startAfter cursor pagination — RNFB v24).
 *
 * Security: `where('clientId', '==', clientId)` ensures no cross-client reads.
 * Firestore sessions read rule (`resource.data.clientId == request.auth.uid` for
 * clients, `resource.data.trainerId == request.auth.uid` for trainers) enforces
 * this server-side as well (T-04-01).
 */
export async function fetchSessionPage(
  clientId: string,
  cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot<Session> | undefined
): Promise<SessionPage> {
  let q = sessionsCollection()
    .where('clientId', '==', clientId)
    .orderBy('date', 'desc')
    .limit(SESSION_PAGE_SIZE);

  if (cursor) {
    q = q.startAfter(cursor);
  }

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session));
  // lastDoc is defined only when the page is full — undefined signals last page.
  const lastDoc =
    items.length === SESSION_PAGE_SIZE
      ? (snap.docs[snap.docs.length - 1] as FirebaseFirestoreTypes.QueryDocumentSnapshot<Session>)
      : undefined;

  return { items, lastDoc };
}

/**
 * Fetch ALL sessions for a specific assignment (used to compute adherence — HIST-04).
 *
 * MVP assumption: session count per assignment is small (<200), so one query suffices.
 * Returns empty array when `snap.empty` (RNFB v24: `.empty` is a property).
 */
export async function fetchSessionsForAssignment(
  clientId: string,
  assignmentId: string
): Promise<Session[]> {
  const snap = await sessionsCollection()
    .where('clientId', '==', clientId)
    .where('assignmentId', '==', assignmentId)
    .get();

  if (snap.empty) return []; // RNFB v24: .empty is a PROPERTY, not a method
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Session));
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
