/**
 * useDeleteProgram — TanStack Query v5 mutation for deleting a program.
 *
 * Phase 02 Plan 05 (PROG-05 delete)
 *
 * Invalidates the trainer's programs list on success.
 * Mirrors useDeleteRoutine.ts (Plan 02-04) pattern exactly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { deleteProgram } from '@/services/program.service';

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: (id: string) => deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', uid] });
    },
  });
}
