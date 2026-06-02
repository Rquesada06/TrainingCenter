/**
 * useUpdateClient — TanStack Query v5 mutation hook for editing a client's profile.
 *
 * Phase 02 Plan 03 (CLNT-04)
 *
 * Calls updateClientProfile(uid, partial) and invalidates both:
 *   - ['clients', trainerId] — refreshes the trainer's client list
 *   - ['client', uid] — refreshes the specific client profile screen
 *
 * The server-side trainer-update-client Firestore rule ensures only the
 * owning trainer can update non-privileged fields (name). Role/trainerId/email
 * remain locked on the server regardless of what partial is passed.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { updateClientProfile } from '@/services/client.service';

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const trainerId = useAuthStore((s) => s.uid);

  return useMutation({
    mutationFn: ({ uid, partial }: { uid: string; partial: { name?: string } }) =>
      updateClientProfile(uid, partial),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['client', uid] });
    },
  });
}
