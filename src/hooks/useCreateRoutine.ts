/**
 * useCreateRoutine — TanStack Query v5 mutation for creating a routine.
 *
 * Phase 02 Plan 04 (ROUT-01)
 *
 * Invalidates the trainer's routines list on success.
 * Mirrors useCreateExercise.ts pattern exactly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createRoutine } from '@/services/routine.service';
import type { CreateRoutineInput } from '@/types/routine';

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: (input: CreateRoutineInput) =>
      createRoutine({ trainerId: uid!, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', uid] });
    },
  });
}
