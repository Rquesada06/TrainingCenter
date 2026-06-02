/**
 * useCreateExercise — TanStack Query v5 mutation hook.
 *
 * Phase 02 Plan 02 (EXER-01)
 *
 * On success, invalidates the ['exercises', uid] query key so the
 * list screen refreshes immediately after creating a new exercise.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createExercise } from '@/services/exercise.service';
import type { CreateExerciseInput } from '@/types/exercise';

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: (input: CreateExerciseInput) => createExercise({ trainerId: uid!, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', uid] });
    },
  });
}
