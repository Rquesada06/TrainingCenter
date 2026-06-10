/**
 * Routines tab — trainer's routine library (ROUT-07)
 *
 * Phase 02 Plan 04
 *
 * - Loads all routines for the current trainer (useRoutines)
 * - FlatList sorted by name (Firestore orderBy already applied)
 * - Empty state + loading state
 * - Navigate to new.tsx (create) or [routineId].tsx (edit/delete)
 */

import React from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRoutines } from '@/hooks/useRoutines';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppBar } from '@/components/ui/AppBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { Routine } from '@/types/routine';

export default function RoutinesScreen() {
  const router = useRouter();
  const { data, isLoading } = useRoutines();

  const renderItem = ({ item }: { item: Routine }) => (
    <Pressable
      onPress={() => router.push(`/trainer/routines/${item.id}`)}
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>
        {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <AppBar />
        <ScreenHeader
          eyebrow="Your Library"
          title="Routines"
          right={
            <PrimaryButton
              label="+ Add"
              onPress={() => router.push('/trainer/routines/new')}
            />
          }
        />

        {/* Loading */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 32,
              flexGrow: 1,
            }}
            ListEmptyComponent={
              <EmptyState
                icon={<Ionicons name="list-outline" size={40} color="#444444" />}
                title="No routines yet"
                message="Create a routine by combining exercises from your library."
                ctaLabel="+ New Routine"
                onCta={() => router.push('/trainer/routines/new')}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
