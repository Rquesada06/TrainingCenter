/**
 * WeekDayGrid — Scrollable Week × Day grid for the program builder.
 *
 * Phase 02 Plan 05 (PROG-02, PROG-03, PROG-04)
 *
 * RESEARCH.md Pitfall 5: 7 columns × 320pt (iPhone SE) overflows without
 * horizontal scroll — outer ScrollView must be horizontal.
 *
 * Per CONTEXT.md D-2:
 *   - null day → renders "REST" (unassigned = REST per PROG-04)
 *   - 'rest' day → renders "REST" (explicit rest)
 *   - routineId string → renders routine name (truncated to 6 chars + Tailwind accent green)
 *
 * Design system: Obsidian Performance
 *   - Base: #0E0E0E
 *   - Surface: #1A1A1A
 *   - Border: #444444
 *   - REST label: #888888
 *   - Routine label: #00FF66
 *   - Header label: #888888
 */

import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import type { ProgramWeek } from '@/types/program';

const DAY_LABELS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];

export interface WeekDayGridProps {
  weeks: ProgramWeek[];
  routineNameMap: Record<string, string>;
  onCellPress: (weekIndex: number, dayIndex: number) => void;
}

export function WeekDayGrid({ weeks, routineNameMap, onCellPress }: WeekDayGridProps) {
  return (
    // Outer horizontal scroll to handle 7-column overflow on narrow screens (Pitfall 5)
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header row: empty week-label slot + D1–D7 */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {/* Empty slot for week label column */}
          <View style={{ width: 48 }} />
          {DAY_LABELS.map((label) => (
            <View
              key={label}
              style={{
                width: 56,
                height: 28,
                marginHorizontal: 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#888888', fontSize: 11 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Per-week rows */}
        {weeks.map((week, w) => (
          <View key={w} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {/* Week label */}
            <View
              style={{
                width: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11 }}>{`W${w + 1}`}</Text>
            </View>

            {/* 7 day cells */}
            {(week.days ?? []).map((day, d) => {
              const isRoutine = day && day !== 'rest';
              const cellLabel = isRoutine
                ? (routineNameMap[day as string]?.slice(0, 6) ?? '?')
                : 'REST';

              return (
                <Pressable
                  key={d}
                  onPress={() => onCellPress(w, d)}
                  style={{
                    width: 56,
                    height: 56,
                    marginHorizontal: 2,
                    marginVertical: 2,
                    backgroundColor: '#1A1A1A',
                    borderWidth: 1,
                    borderColor: '#444444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                  }}
                  accessibilityLabel={`Week ${w + 1} Day ${d + 1}: ${cellLabel}`}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: isRoutine ? '#00FF66' : '#888888',
                      textAlign: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {cellLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
