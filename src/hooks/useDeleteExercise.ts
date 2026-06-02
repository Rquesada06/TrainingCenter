/**
 * useDeleteExercise — TanStack Query v5 mutation hook.
 *
 * Phase 02 Plan 02 (EXER-03)
 *
 * On success, invalidates the ['exercises', uid] query key so the
 * deleted exercise is removed from the list immediately.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { deleteExercise } from '@/services/exercise.service';

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: (id: string) => deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', uid] });
    },
  });
}
