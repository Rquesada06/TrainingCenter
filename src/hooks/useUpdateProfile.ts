/**
 * useUpdateProfile — TanStack Query v5 mutation hook for editing a user's own profile.
 *
 * Phase 04 Plan 02 (PROF-01/02)
 *
 * Calls updateUserProfile(uid, partial) (photoURL and/or name) and invalidates:
 *   - ['user', uid]   — refreshes the profile screen + ClientPhoto re-render
 *   - ['client', uid] — keeps the trainer's client-profile cache in sync (same doc)
 *
 * Photo upload itself (storage().putFile) runs separately via uploadProfilePhoto;
 * this hook persists the resulting download URL (and/or name) to Firestore.
 *
 * Security: updateUserProfile only writes the non-privileged photoURL/name fields;
 * firestore.rules locks role/trainerId server-side (T-04-04).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserProfile } from '@/services/storage.service';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uid,
      partial,
    }: {
      uid: string;
      partial: { photoURL?: string; name?: string };
    }) => updateUserProfile(uid, partial),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['user', uid] });
      queryClient.invalidateQueries({ queryKey: ['client', uid] });
    },
  });
}
