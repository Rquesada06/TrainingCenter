/**
 * useClientActiveAssignment — TanStack Query v5 hook (Phase 03 Plan 02).
 *
 * Reads the CLIENT'S OWN active assignment (client-scoped, no trainerId filter).
 * queryKey ['myActiveAssignment', uid] is the invalidation target for Plan 03/04.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { findMyActiveAssignment } from '@/services/session.service';

export function useClientActiveAssignment() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['myActiveAssignment', uid],
    queryFn: () => findMyActiveAssignment(uid!),
    enabled: !!uid,
    staleTime: 30_000, // 30 s — an active assignment changes infrequently
  });
}
