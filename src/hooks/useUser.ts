/**
 * useUser — TanStack Query v5 hook for a single user document.
 *
 * Phase 04 Plan 02 (PROF-01)
 *
 * Reads any user's doc (trainer or client) from the 'users' collection.
 * Reuses getClient — a generic users-collection single-doc read that works for
 * any uid, not just clients — under the clearer ['user', uid] query key so the
 * profile screens and useUpdateProfile share one cache entry.
 *
 * Used by the profile screens (Wave 2 / 04-06) to render name + ClientPhoto.
 */

import { useQuery } from '@tanstack/react-query';
import { getClient } from '@/services/client.service';

export function useUser(uid: string | undefined) {
  return useQuery({
    queryKey: ['user', uid],
    queryFn: () => getClient(uid!),
    enabled: !!uid,
  });
}
