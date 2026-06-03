import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAuthListener } from '@/firebase/auth';
import { queryClient } from '@/lib/queryClient';
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

  // Defensive fallback: a signed-in user with no resolved role must never land
  // on a blank screen (no Stack.Protected guard below would match). The auth
  // listener self-heals roleless docs to 'trainer', so this is a last resort.
  if (uid && role !== 'trainer' && role !== 'client') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, textAlign: 'center' }}>
          Setting up your account…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
