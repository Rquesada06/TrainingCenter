/**
 * Assignment service — Phase 02 Plan 05 (ASGN-01..04)
 *
 * Consolidates the assignment-related service surface so Plan 02-05 consumers
 * have one import path for both operations:
 *
 *   - callCreateAssignment: calls the createAssignment Cloud Function (ASGN-01, ASGN-03)
 *   - findActiveAssignmentForClient: re-exported from client.service (single source of truth)
 *
 * The Cloud Function builds the immutable snapshot server-side (ASGN-03).
 * This service is the client-side caller and does NOT build the snapshot locally.
 */

import { callCreateAssignment } from '@/firebase/functions';
import { findActiveAssignmentForClient } from '@/services/client.service';

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

export { callCreateAssignment, findActiveAssignmentForClient };
