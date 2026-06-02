/**
 * useExercises — TanStack Query v5 hook for the trainer's exercise list.
 *
 * Phase 02 Plan 02 (EXER-04, EXER-05, EXER-06)
 *
 * Returns the full list for the current trainer, sorted by name A-Z.
 * Client-side `filterExercises` is applied in the screen component to avoid
 * extra Firestore round-trips on every keystroke (EXER-04 instant search).
 *
 * EXER-06 defense-in-depth: `listExercises` includes `where('trainerId', '==', uid)`.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { listExercises } from '@/services/exercise.service';

export function useExercises() {
  const uid = useAuthStore((s) => s.uid);
  return useQuery({
    queryKey: ['exercises', uid],
    queryFn: () => listExercises(uid!),
    enabled: !!uid,
    staleTime: 30_000, // 30 s — exercise lists update infrequently
  });
}
