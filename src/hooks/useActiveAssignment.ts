/**
 * useActiveAssignment — TanStack Query v5 hook for a client's active assignment.
 *
 * Phase 02 Plan 03 (CLNT-02, CLNT-05)
 *
 * Also re-exports `findActiveAssignmentForClient` from the service so that
 * Plan 02-04 (programs/assignment) can import it directly for the ASGN-02
 * overwrite check without duplicating the query logic.
 *
 * Both exports are the single source of truth for the active-assignment query.
 */

import { useQuery } from '@tanstack/react-query';
import { findActiveAssignmentForClient } from '@/services/client.service';
import { useAuthStore } from '@/stores/authStore';

// Re-export for Plan 02-04 ASGN-02 overwrite check
export { findActiveAssignmentForClient };

/**
 * Returns the active assignment for a given clientId.
 * Returns null in data when no active assignment exists (CLNT-05 indicator trigger).
 *
 * staleTime: 10s — assignments update more frequently than client list.
 */
export function useActiveAssignment(clientId: string | undefined) {
  // A trainer's uid is required by the assignments read rule (defense-in-depth).
  const trainerId = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['activeAssignment', clientId, trainerId],
    queryFn: () => findActiveAssignmentForClient(clientId!, trainerId!),
    enabled: !!clientId && !!trainerId,
    staleTime: 10_000, // 10s
  });
}
