/**
 * useUpdateProgram — TanStack Query v5 mutation for updating a program.
 *
 * Phase 02 Plan 05 (PROG-05 edit, PROG-02/03 grid updates)
 *
 * Invalidates both the list and the specific program on success.
 * Mirrors useUpdateRoutine.ts (Plan 02-04) pattern exactly.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { updateProgram } from '@/services/program.service';
import type { CreateProgramInput } from '@/types/program';

export interface UpdateProgramMutationInput {
  id: string;
  partial: Partial<CreateProgramInput>;
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  return useMutation({
    mutationFn: ({ id, partial }: UpdateProgramMutationInput) => updateProgram(id, partial),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['programs', uid] });
      queryClient.invalidateQueries({ queryKey: ['program', id] });
    },
  });
}
