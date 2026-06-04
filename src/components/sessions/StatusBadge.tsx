/**
 * StatusBadge — Derived session completion status pill (D-05)
 * Phase 04 Plan 03
 *
 * Status is ALWAYS derived — there is no `status` field on Session.
 *   Completed: completedExerciseIds.length === totalExercises
 *   Partial:   anything else
 *
 * Completed variant: green pill (#00FF66 text / rgba(0,255,102,0.12) bg)
 * Partial variant:   yellow pill (#FFD600 text / rgba(255,214,0,0.12) bg)
 *
 * Design system: Obsidian Performance
 */

import React from 'react';
import { View, Text } from 'react-native';
import type { Session } from '@/types/session';

export interface StatusBadgeProps {
  session: Session;
}

export function StatusBadge({ session }: StatusBadgeProps) {
  const completed = session.completedExerciseIds.length;
  const total = session.totalExercises;
  const isComplete = completed === total;

  if (isComplete) {
    return (
      <View
        style={{
          backgroundColor: 'rgba(0,255,102,0.12)',
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
        accessibilityLabel="Status: Completed"
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#00FF66',
          }}
        >
          Completed
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,214,0,0.12)',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
      accessibilityLabel={`Status: Partial, ${completed} of ${total} exercises`}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#FFD600',
        }}
      >
        {`Partial ${completed}/${total}`}
      </Text>
    </View>
  );
}
