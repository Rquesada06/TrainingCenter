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
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRoutines } from '@/hooks/useRoutines';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
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
        {/* Header */}
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
            Routines
          </Text>
          <PrimaryButton
            label="+ Add"
            onPress={() => router.push('/trainer/routines/new')}
          />
        </View>

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
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 60,
                }}
              >
                <Text style={{ color: '#888888', fontSize: 16, textAlign: 'center' }}>
                  No routines yet — tap Add to create one.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
