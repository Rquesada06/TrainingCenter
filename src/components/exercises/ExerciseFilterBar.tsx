/**
 * ExerciseFilterBar — Search + category + locationType filter controls.
 *
 * Phase 02 Plan 02 (EXER-04, EXER-05)
 *
 * EXER-04 (instant search): TextField fires onChangeText on EVERY keystroke.
 * No debounce needed — client-side filter on <200 items is instantaneous.
 *
 * EXER-05 (filter chips): category and locationType chips narrow results with
 * AND semantics (handled in filterExercises() in the parent screen).
 *
 * Obsidian Performance theme: base #0E0E0E, surface #1A1A1A, accent #00FF66, border #444444.
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import {
  EXERCISE_CATEGORIES,
  LOCATION_TYPES,
} from '@/validation/exercise.schema';
import type { ExerciseCategory, LocationType } from '@/types/exercise';

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────

export interface ExerciseFilterBarProps {
  search: string;
  onSearchChange: (s: string) => void;
  category: ExerciseCategory | null;
  onCategoryChange: (c: ExerciseCategory | null) => void;
  locationType: LocationType | null;
  onLocationTypeChange: (l: LocationType | null) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Chip style helpers (Obsidian Performance theme)
// ────────────────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: selected ? '#00FF66' : '#1A1A1A',
        borderWidth: 1,
        borderColor: selected ? '#00FF66' : '#444444',
      }}
    >
      <Text
        style={{
          color: selected ? '#0E0E0E' : '#FFFFFF',
          fontSize: 12,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function ExerciseFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  locationType,
  onLocationTypeChange,
}: ExerciseFilterBarProps) {
  return (
    <View style={{ backgroundColor: '#0E0E0E', paddingHorizontal: 16, paddingBottom: 8 }}>
      {/* ── Search input (EXER-04 instant filter) ── */}
      <View style={{ marginBottom: 10 }}>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search exercises..."
          placeholderTextColor="#444444"
          style={{
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            borderWidth: 1,
            borderColor: '#444444',
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* ── Category chips (EXER-05) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <FilterChip
          label="All"
          selected={category === null}
          onPress={() => onCategoryChange(null)}
        />
        {EXERCISE_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={cat}
            selected={category === cat}
            onPress={() => onCategoryChange(cat)}
          />
        ))}
      </ScrollView>

      {/* ── LocationType chips (EXER-05) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <FilterChip
          label="All"
          selected={locationType === null}
          onPress={() => onLocationTypeChange(null)}
        />
        {LOCATION_TYPES.map((loc) => (
          <FilterChip
            key={loc}
            label={loc}
            selected={locationType === loc}
            onPress={() => onLocationTypeChange(loc)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
