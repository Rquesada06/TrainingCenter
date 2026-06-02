/**
 * useDeleteRoutine — TanStack Query v5 mutation for deleting a routine.
 *
 * Phase 02 Plan 04 (ROUT-06)
 *
 * Invalidates the trainer's routines list on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { deleteRoutine } from '@/services/routine.service';

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: (id: string) => deleteRoutine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', uid] });
    },
  });
}
