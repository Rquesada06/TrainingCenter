/**
 * Workout stack layout — Phase 03 Plan 04
 *
 * Wraps the workout sub-route group (session + celebration).
 * `headerShown: false` on all screens — each screen manages its own header.
 * The celebration screen is declared as a modal presentation (UI-SPEC Screen 3).
 */

import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="session" />
      <Stack.Screen name="celebration" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
