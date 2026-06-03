/**
 * Trainer profile screen.
 *
 * Phase 02 — minimal profile with sign-out. Full profile editing (photo, etc.)
 * is a later phase; this provides the essential sign-out entry point.
 */

import React from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from '@/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { withSaveFeedback } from '@/lib/mutationFeedback';

export default function TrainerProfileScreen() {
  const uid = useAuthStore((s) => s.uid);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        // signOut triggers onAuthStateChanged → authStore.clear() → redirect to sign-in.
        onPress: () =>
          withSaveFeedback(() => signOut(), () => {}, 'Could not sign out'),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
          Profile
        </Text>

        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <Text style={{ color: '#888888', fontSize: 13, marginBottom: 4 }}>Role</Text>
          <Text style={{ color: '#00FF66', fontSize: 16, fontWeight: '600', marginBottom: 16 }}>
            Trainer
          </Text>
          <Text style={{ color: '#888888', fontSize: 13, marginBottom: 4 }}>User ID</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{uid ?? '—'}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }}>
          <PrimaryButton label="Sign out" variant="outline" onPress={handleSignOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}
