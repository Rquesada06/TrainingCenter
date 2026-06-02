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
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useExercises } from '@/hooks/useExercises';
import { filterExercises } from '@/firebase/exerciseFilter';
import { ExerciseFilterBar } from '@/components/exercises/ExerciseFilterBar';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
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
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>
            Exercises
          </Text>
          <PrimaryButton
            label="+ Add"
            onPress={() => router.push('/trainer/exercises/new')}
          />
        </View>

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
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                <Text style={{ color: '#888888', fontSize: 16, textAlign: 'center' }}>
                  {search || category || locationType
                    ? 'No exercises match your filters.'
                    : 'No exercises yet — tap Add to create one.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
