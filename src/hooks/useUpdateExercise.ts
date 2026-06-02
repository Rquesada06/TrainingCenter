/**
 * useUpdateExercise — TanStack Query v5 mutation hook.
 *
 * Phase 02 Plan 02 (EXER-02)
 *
 * On success, invalidates the ['exercises', uid] query key so the
 * list screen reflects the updated exercise name/fields immediately.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { updateExercise } from '@/services/exercise.service';
import type { CreateExerciseInput } from '@/types/exercise';

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: ({ id, partial }: { id: string; partial: Partial<CreateExerciseInput> }) =>
      updateExercise(id, partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', uid] });
    },
  });
}
