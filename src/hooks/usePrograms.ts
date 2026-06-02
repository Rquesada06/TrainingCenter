/**
 * usePrograms — TanStack Query v5 hook for the trainer's program list.
 *
 * Phase 02 Plan 05 (PROG-06)
 *
 * Returns the full list for the current trainer, sorted by name A-Z.
 * Mirrors useRoutines.ts (Plan 02-04) pattern exactly.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { listPrograms } from '@/services/program.service';

export function usePrograms() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['programs', uid],
    queryFn: () => listPrograms(uid!),
    enabled: !!uid,
    staleTime: 30_000, // 30s — program lists update infrequently
  });
}
