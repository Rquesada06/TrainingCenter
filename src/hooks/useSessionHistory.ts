/**
 * useSessionHistory — TanStack Query v5 useInfiniteQuery hook (Phase 04, HIST-01/03)
 *
 * Provides paginated, newest-first session history for a given client.
 * Works for both client (viewing own history) and trainer (viewing a client's history)
 * since the service function scopes by clientId — only the caller changes.
 *
 * Pagination uses Firestore's `.startAfter(lastDoc)` cursor. Each page returns up to
 * SESSION_PAGE_SIZE (20) sessions. When fewer than 20 are returned, `lastDoc` is
 * undefined and `hasNextPage` becomes false.
 *
 * staleTime: 60 s — session history is append-only; old pages don't change.
 *   Avoids visible list churn (back-to-top scroll) when user navigates away+back.
 * gcTime: 5 min — keep all loaded pages in cache while navigating to/from detail.
 *   (RESEARCH.md Pitfall 5 — background refetch re-fetches all pages; staleTime + gcTime
 *   prevents this from triggering too frequently.)
 *
 * UI usage:
 *   const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useSessionHistory(clientId);
 *   const sessions = data?.pages.flatMap((p) => p.items) ?? [];
 *   // FlatList: onEndReached={() => { if (!isFetchingNextPage && hasNextPage) fetchNextPage(); }}
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchSessionPage,
  SESSION_PAGE_SIZE,
} from '@/services/session.service';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Session } from '@/types/session';

export function useSessionHistory(clientId: string | undefined, trainerId?: string) {
  return useInfiniteQuery({
    queryKey: ['sessionHistory', clientId, trainerId ?? null],
    queryFn: ({ pageParam }) => fetchSessionPage(clientId!, pageParam, trainerId),
    initialPageParam: undefined as
      | FirebaseFirestoreTypes.QueryDocumentSnapshot<Session>
      | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.items.length < SESSION_PAGE_SIZE ? undefined : lastPage.lastDoc,
    enabled: !!clientId,
    staleTime: 60_000,       // 1 min — history is append-only (RESEARCH.md Pitfall 5)
    gcTime: 5 * 60_000,      // 5 min — keep pages in cache while navigating
  });
}
