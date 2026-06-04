/**
 * SessionListItem — History row component
 * Phase 04 Plan 03 (HIST-01)
 *
 * Layout (UI-SPEC § 2):
 *   Pressable row bg=#1A1A1A, border=#444444, borderRadius=8
 *     Left column (flex=1): date (Body 16/400 #FFFFFF) + routineName (Label 14/400 #888888)
 *     Right: StatusBadge
 *
 * Date format: "Jun 3, 2026"
 * IMPORTANT: Append T00:00:00 before parsing to avoid UTC midnight timezone shift.
 *
 * Touch target: minHeight=44 (RN accessibility requirement)
 *
 * Design system: Obsidian Performance
 */

import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { StatusBadge } from '@/components/sessions/StatusBadge';
import type { Session } from '@/types/session';

export interface SessionListItemProps {
  session: Session;
  onPress: () => void;
}

function formatSessionDate(date: string): string {
  // Append T00:00:00 to prevent UTC midnight timezone shift (YYYY-MM-DD → local midnight)
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SessionListItem({ session, onPress }: SessionListItemProps) {
  const formattedDate = formatSessionDate(session.date);
  const routineLabel = session.routineName ?? 'Session';

  // Build accessibility label for screen readers
  const completed = session.completedExerciseIds.length;
  const total = session.totalExercises;
  const isComplete = completed === total;
  const statusLabel = isComplete
    ? 'Completed'
    : `Partial, ${completed} of ${total} exercises`;
  const accessibilityLabel = `${routineLabel} on ${formattedDate}, ${statusLabel}`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Left column: date + routine name */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '400',
            color: '#FFFFFF',
          }}
        >
          {formattedDate}
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: '#888888',
            marginTop: 2,
          }}
        >
          {routineLabel}
        </Text>
      </View>

      {/* Right: derived status badge */}
      <StatusBadge session={session} />
    </Pressable>
  );
}
