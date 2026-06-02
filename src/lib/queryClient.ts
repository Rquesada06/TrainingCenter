/**
 * Shared TanStack Query client (singleton).
 *
 * Mounted once at the app root via <QueryClientProvider> in src/app/_layout.tsx.
 * Every useQuery/useMutation/useQueryClient hook in the app reads from this
 * instance — without the provider, those hooks throw "No QueryClient set".
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Trainer content (exercises/routines/programs/clients) changes infrequently
      // within a session; a short stale window avoids redundant refetches.
      staleTime: 30_000,
      retry: 2,
    },
  },
});
