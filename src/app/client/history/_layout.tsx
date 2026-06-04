/**
 * History stack layout — Phase 04 Plan 04 (HIST-01 / HIST-02)
 *
 * Wraps the client history sub-route group (list `index` + detail `[sessionId]`).
 * Mirrors `src/app/client/workout/_layout.tsx`: a Stack with `headerShown: false`
 * so the nested `[sessionId]` route renders as a pushed screen instead of leaking
 * into the client tab bar. Each screen manages its own header/safe area.
 */

import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[sessionId]" />
    </Stack>
  );
}
