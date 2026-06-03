/**
 * useTodaySession — TanStack Query v5 hook (Phase 03 Plan 02, WORK-09).
 *
 * The duplicate guard: returns today's session doc if one already exists for the
 * client, else null. Short staleTime — freshness matters because this gates the
 * finish write. queryKey ['todaySession', uid, today] is invalidated by
 * useFinishSession on success.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { findTodaySession } from '@/services/session.service';
import { localTodayString } from '@/lib/workoutDayComputer';

export function useTodaySession() {
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();
  return useQuery({
    queryKey: ['todaySession', uid, today],
    queryFn: () => findTodaySession(uid!, today),
    enabled: !!uid,
    staleTime: 5_000, // short — this is the duplicate guard; freshness matters
  });
}
