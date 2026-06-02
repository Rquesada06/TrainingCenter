/**
 * useUpdateRoutine — TanStack Query v5 mutation for updating a routine.
 *
 * Phase 02 Plan 04 (ROUT-06)
 *
 * Invalidates the trainer's routines list AND the individual routine on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { updateRoutine } from '@/services/routine.service';
import type { CreateRoutineInput } from '@/types/routine';

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: ({ id, partial }: { id: string; partial: Partial<CreateRoutineInput> }) =>
      updateRoutine(id, partial),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routines', uid] });
      queryClient.invalidateQueries({ queryKey: ['routine', variables.id] });
    },
  });
}
