/**
 * Root layout — Phase 01 Plan 02
 *
 * Implements the auth-to-navigation pipeline:
 * 1. Holds native splash screen until Firebase fires its first auth event
 * 2. Routes each role to its own navigation shell via Stack.Protected
 *
 * Key constraints from RESEARCH:
 * - SplashScreen.preventAutoHideAsync() MUST be at module scope (not inside component)
 * - return null while !isLoaded (keeps native splash visible, prevents auth flash AUTH-05)
 * - Stack.Protected handles routing — do NOT use imperative redirect in useEffect
 * - sign-in Screen must be declared FIRST so it is the unauthenticated anchor (Pitfall 4)
 * - GestureHandlerRootView wraps the tree (required by expo-router + gesture-handler)
 */

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initAuthListener } from '@/firebase/auth';
import { useAuthStore } from '@/stores/authStore';

// MUST be at module scope — by the time the component renders, the splash
// may already be gone if called inside the component body.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoaded, uid, role } = useAuthStore();

  // Start the Firebase auth listener once on mount.
  // The listener populates authStore; unsubscribe on unmount.
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  // Hide the native splash screen only after auth state is known.
  // While !isLoaded, this effect does nothing — the splash stays up.
  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  // Return null while loading — native splash screen covers the UI.
  // This prevents any protected screen from flashing before auth resolves (AUTH-05).
  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/*
         * Unauthenticated anchor — MUST be first so sign-in is the fallback
         * when uid=null. Stack.Protected removes history entries when guard
         * flips false (Pitfall 4 prevention).
         */}
        <Stack.Protected guard={!uid}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>

        {/* Trainer shell — only visible when role === 'trainer' */}
        <Stack.Protected guard={uid !== null && role === 'trainer'}>
          <Stack.Screen name="(trainer)" />
        </Stack.Protected>

        {/* Client shell — only visible when role === 'client' */}
        <Stack.Protected guard={uid !== null && role === 'client'}>
          <Stack.Screen name="(client)" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}
