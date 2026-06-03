/**
 * useFinishSession — TanStack Query v5 mutation hook (Phase 03 Plan 02, WORK-06/07).
 *
 * Writes a completed session, then invalidates ['todaySession', uid, today] so the
 * Home screen and the duplicate guard immediately reflect the finished workout.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { createSession } from '@/services/session.service';
import { localTodayString } from '@/lib/workoutDayComputer';
import type { Session } from '@/types/session';

export function useFinishSession() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();

  return useMutation({
    mutationFn: (data: Omit<Session, 'id'>) => createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySession', uid, today] });
    },
  });
}
