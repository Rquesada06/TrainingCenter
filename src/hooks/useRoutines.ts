/**
 * useRoutines — TanStack Query v5 hook for the trainer's routine list.
 *
 * Phase 02 Plan 04 (ROUT-07)
 *
 * Returns the full list for the current trainer, sorted by name A-Z.
 * Mirrors useExercises.ts (Plan 02-02) pattern exactly.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { listRoutines } from '@/services/routine.service';

export function useRoutines() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['routines', uid],
    queryFn: () => listRoutines(uid!),
    enabled: !!uid,
    staleTime: 30_000, // 30 s — routine lists update infrequently
  });
}
