/**
 * ExerciseListItem — Row component for the exercise library list.
 *
 * Phase 02 Plan 02 (EXER-04, EXER-05)
 *
 * Shows name, category, and locationTypes. No image preview (Phase 4 polish).
 * Obsidian Performance theme: bg #1A1A1A, border #444, accent #00FF66.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Exercise } from '@/types/exercise';

export interface ExerciseListItemProps {
  exercise: Exercise;
  onPress: () => void;
}

export function ExerciseListItem({ exercise, onPress }: ExerciseListItemProps) {
  const locationLabel = exercise.locationTypes.join(' · ');
  const subtitle = `${exercise.category}  •  ${locationLabel}`;

  return (
    <Pressable
      onPress={onPress}
      className="bg-[#1A1A1A] border border-[#444444] rounded-lg p-4 mb-2"
      accessibilityRole="button"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text className="text-[#888888] text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {/* Chevron indicator */}
        <Text className="text-[#444444] text-lg">{'›'}</Text>
      </View>
    </Pressable>
  );
}
