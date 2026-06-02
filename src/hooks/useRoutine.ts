/**
 * useRoutine — TanStack Query v5 hook for a single routine document.
 *
 * Phase 02 Plan 04 (ROUT-06)
 */

import { useQuery } from '@tanstack/react-query';
import { getRoutine } from '@/services/routine.service';

export function useRoutine(id: string | undefined) {
  return useQuery({
    queryKey: ['routine', id],
    queryFn: () => getRoutine(id!),
    enabled: !!id,
  });
}
