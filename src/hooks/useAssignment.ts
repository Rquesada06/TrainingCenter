/**
 * useAssignment — TanStack Query v5 hook for a single assignment by ID (Phase 04, HIST-02)
 *
 * Fetches the assignment snapshot needed to resolve exercise names on the session
 * detail screen. Option A (re-derive from snapshot): the assignment doc is small,
 * already in TanStack Query cache via useActiveAssignment/useClientActiveAssignment
 * for active clients, and requires zero schema changes to Phase 3 session data.
 *
 * staleTime: 60 s — assignments are immutable snapshots once created; they never
 * change after assignment, so aggressive caching is safe.
 */

import { useQuery } from '@tanstack/react-query';
import { getAssignment } from '@/services/assignment.service';

export function useAssignment(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => getAssignment(assignmentId!),
    enabled: !!assignmentId,
    staleTime: 60_000, // assignments are immutable snapshots — safe to cache
  });
}
