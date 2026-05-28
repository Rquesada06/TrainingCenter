/**
 * Trainer navigation shell — Phase 01 Plan 02
 *
 * Stack navigator pointing at the (tabs) group.
 * headerShown: false — tabs have their own navigation chrome.
 * Real content ships in Phases 2-4.
 */

import { Stack } from 'expo-router';

export default function TrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
