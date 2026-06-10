/**
 * Programs list screen — Phase 02 Plan 05 (PROG-06)
 *
 * Lists all programs owned by the trainer, sorted by name A-Z.
 * "+ Add" navigates to programs/new for creating a new program.
 * Tap a row → navigate to programs/[programId] for edit + assign.
 *
 * Design system: Obsidian Performance
 *   - Background: #0E0E0E
 *   - Surface: #1A1A1A
 *   - Text: #FFFFFF
 *   - Muted: #888888
 *   - Accent: #00FF66
 */

import React from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePrograms } from '@/hooks/usePrograms';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppBar } from '@/components/ui/AppBar';
import { AddButton } from '@/components/ui/AddButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { Program } from '@/types/program';

function ProgramListItem({ program, onPress }: { program: Program; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          {program.name}
        </Text>
        <Text style={{ color: '#888888', fontSize: 12, marginTop: 4 }}>
          {`${program.durationWeeks} week${program.durationWeeks === 1 ? '' : 's'}`}
        </Text>
        {program.description ? (
          <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {program.description}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: '#444444', fontSize: 20, marginLeft: 8 }}>›</Text>
    </Pressable>
  );
}

export default function ProgramsScreen() {
  const { data: programs, isLoading, error } = usePrograms();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <StatusBar barStyle="light-content" />

      <AppBar />
      <ScreenHeader
        eyebrow="Your Library"
        title="Programs"
        right={<AddButton onPress={() => router.push('/trainer/programs/new')} />}
      />

      {/* Body */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', textAlign: 'center' }}>
            Could not load programs. Check your connection and try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={programs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          renderItem={({ item }) => (
            <ProgramListItem
              program={item}
              onPress={() => router.push(`/trainer/programs/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="calendar-outline" size={40} color="#444444" />}
              title="No programs yet"
              message="Build a multi-week program by assigning routines to days."
              ctaLabel="+ New Program"
              onCta={() => router.push('/trainer/programs/new')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
