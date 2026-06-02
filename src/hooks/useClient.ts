/**
 * useClient — TanStack Query v5 hook for a single client document.
 *
 * Phase 02 Plan 03 (CLNT-03, CLNT-04)
 *
 * Fetches a single client user document by uid.
 * Used by the client profile screen ([clientId].tsx).
 */

import { useQuery } from '@tanstack/react-query';
import { getClient } from '@/services/client.service';

export function useClient(uid: string | undefined) {
  return useQuery({
    queryKey: ['client', uid],
    queryFn: () => getClient(uid!),
    enabled: !!uid,
  });
}
