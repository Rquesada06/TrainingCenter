/**
 * Exercises tab — trainer's exercise library (EXER-04, EXER-05, EXER-06)
 *
 * Phase 02 Plan 02
 *
 * - Loads all exercises for the current trainer (useExercises)
 * - Instant client-side filter on search + category + locationType (filterExercises)
 * - Empty state when no exercises exist
 * - Loading indicator while fetching
 * - Navigates to new.tsx (create) or [exerciseId].tsx (edit/delete)
 */

import React, { useState, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useExercises } from '@/hooks/useExercises';
import { filterExercises } from '@/firebase/exerciseFilter';
import { ExerciseFilterBar } from '@/components/exercises/ExerciseFilterBar';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppBar } from '@/components/ui/AppBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { ExerciseCategory, LocationType } from '@/types/exercise';

export default function ExercisesScreen() {
  const router = useRouter();
  const { data, isLoading } = useExercises();

  // ── Local filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [locationType, setLocationType] = useState<LocationType | null>(null);

  // ── Apply client-side filter to cached list (EXER-04 + EXER-05, no Firestore round-trip)
  const filtered = useMemo(
    () => filterExercises(data ?? [], { search, category: category ?? undefined, locationType: locationType ?? undefined }),
    [data, search, category, locationType]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <AppBar />
        <ScreenHeader
          eyebrow="Your Library"
          title="Exercises"
          right={
            <PrimaryButton
              label="+ Add"
              onPress={() => router.push('/trainer/exercises/new')}
            />
          }
        />

        {/* ── Filter bar (search + category + locationType) ── */}
        <ExerciseFilterBar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          locationType={locationType}
          onLocationTypeChange={setLocationType}
        />

        {/* ── Loading ── */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#00FF66" size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExerciseListItem
                exercise={item}
                onPress={() => router.push(`/trainer/exercises/${item.id}`)}
              />
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 32,
              flexGrow: 1,
            }}
            ListEmptyComponent={
              search || category || locationType ? (
                // Filter-active: message-only EmptyState (no CTA — Add would be misleading)
                <EmptyState
                  icon={<Ionicons name="search-outline" size={40} color="#444444" />}
                  title="No matches"
                  message="No exercises match your filters."
                />
              ) : (
                // No-data: actionable EmptyState with Add CTA
                <EmptyState
                  icon={<Ionicons name="barbell-outline" size={40} color="#444444" />}
                  title="No exercises yet"
                  message="Add exercises to your library to start building routines."
                  ctaLabel="+ Add Exercise"
                  onCta={() => router.push('/trainer/exercises/new')}
                />
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
