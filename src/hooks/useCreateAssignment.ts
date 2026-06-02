/**
 * useCreateAssignment — TanStack Query v5 mutation for creating an assignment.
 *
 * Phase 02 Plan 05 (ASGN-01)
 *
 * Calls the createAssignment Cloud Function via callCreateAssignment.
 * On success, invalidates:
 *   - ['activeAssignment', clientId] — so the Clients tab reflects the new program
 *   - ['clients', trainerId] — so the list row re-renders with the new program name
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { callCreateAssignment } from '@/services/assignment.service';
import type { CreateAssignmentInput } from '@/types/assignment';

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const trainerId = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => callCreateAssignment(input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['activeAssignment', vars.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients', trainerId] });
    },
  });
}
