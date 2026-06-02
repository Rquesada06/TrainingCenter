/**
 * useClients — TanStack Query v5 hook for the trainer's client list.
 *
 * Phase 02 Plan 03 (CLNT-02, CLNT-05)
 *
 * Returns the full list of clients for the current trainer, sorted by name A-Z.
 * A trainer's uid IS their trainerId — clients are scoped to the signed-in trainer.
 *
 * T-02-03 defense-in-depth: `listClients` includes both role and trainerId WHERE filters.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { listClients } from '@/services/client.service';

export function useClients() {
  const trainerId = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['clients', trainerId],
    queryFn: () => listClients(trainerId!),
    enabled: !!trainerId,
    staleTime: 30_000, // 30s — client lists update infrequently
  });
}
