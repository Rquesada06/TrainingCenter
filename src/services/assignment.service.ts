/**
 * Assignment service — Phase 02 Plan 05 (ASGN-01..04) + Phase 04 (HIST-02)
 *
 * Consolidates the assignment-related service surface so Plan 02-05 consumers
 * have one import path for both operations:
 *
 *   - callCreateAssignment: calls the createAssignment Cloud Function (ASGN-01, ASGN-03)
 *   - findActiveAssignmentForClient: re-exported from client.service (single source of truth)
 *   - getAssignment: single-doc getter by ID (Phase 04 — session detail exercise name resolution)
 *
 * The Cloud Function builds the immutable snapshot server-side (ASGN-03).
 * This service is the client-side caller and does NOT build the snapshot locally.
 */

import { callCreateAssignment } from '@/firebase/functions';
import { findActiveAssignmentForClient } from '@/services/client.service';
import { assignmentsCollection } from '@/firebase/firestore';
import type { Assignment } from '@/types/assignment';

// ────────────────────────────────────────────────────────────────────────────
// Single-doc reads (Phase 04 — HIST-02)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single assignment by document ID.
 *
 * Used by `useAssignment` in session detail to resolve exercise names from the
 * assignment snapshot (HIST-02, Option A — re-derive from snapshot).
 *
 * RNFB v24: `snap.exists()` is a METHOD (with parentheses).
 * Returns null when the document does not exist.
 */
export async function getAssignment(id: string): Promise<Assignment | null> {
  const snap = await assignmentsCollection().doc(id).get();
  if (!snap.exists()) return null; // RNFB v24: exists() is a METHOD
  return { ...snap.data()!, id: snap.id } as Assignment;
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

export { callCreateAssignment, findActiveAssignmentForClient };
