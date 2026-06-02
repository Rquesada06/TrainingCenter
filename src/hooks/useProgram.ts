/**
 * useProgram — TanStack Query v5 hook for a single program.
 *
 * Phase 02 Plan 05 (PROG-05 edit)
 *
 * Mirrors useRoutine.ts (Plan 02-04) pattern exactly.
 */

import { useQuery } from '@tanstack/react-query';
import { getProgram } from '@/services/program.service';

export function useProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['program', id],
    queryFn: () => getProgram(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}
