import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initAuthListener } from '@/firebase/auth';
import { useAuthStore } from '@/stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoaded, uid, role } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  // Stack.Protected gates access but doesn't auto-navigate when guards flip.
  // Explicit replace drives the user to their role shell after login.
  // The !uid path is handled by index.tsx → Redirect("/sign-in") on initial load.
  useEffect(() => {
    if (!isLoaded || !uid) return;
    if (role === 'trainer') {
      router.replace('/trainer');
    } else if (role === 'client') {
      router.replace('/client');
    }
  }, [isLoaded, uid, role]);

  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!uid}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>

          <Stack.Protected guard={uid !== null && role === 'trainer'}>
            <Stack.Screen name="trainer" />
          </Stack.Protected>

          <Stack.Protected guard={uid !== null && role === 'client'}>
            <Stack.Screen name="client" />
          </Stack.Protected>
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
