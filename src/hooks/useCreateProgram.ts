/**
 * useCreateProgram — TanStack Query v5 mutation for creating a program.
 *
 * Phase 02 Plan 05 (PROG-01)
 *
 * Invalidates the trainer's programs list on success.
 * Returns the new program id via mutateAsync.
 * Mirrors useCreateRoutine.ts (Plan 02-04) pattern exactly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createProgram } from '@/services/program.service';
import type { ProgramWeek } from '@/types/program';

export interface CreateProgramMutationInput {
  name: string;
  description?: string;
  durationWeeks: number;
  weeks?: ProgramWeek[];
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: (input: CreateProgramMutationInput) =>
      createProgram({ trainerId: uid!, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', uid] });
    },
  });
}
