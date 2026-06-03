/**
 * GymHomeToggle — Session-level gym/home segmented toggle.
 * Phase 03 Plan 04 (WORK-05, D-08/D-09/D-11)
 *
 * Two-segment control that lets the client choose their workout environment
 * for the current session. The selection is persisted via lastWorkoutMode.ts.
 *
 * UI-SPEC New Components § GymHomeToggle:
 * - Active segment: bg-[#00FF66] text-[#0E0E0E] font-semibold
 * - Inactive segment: bg-transparent text-[#888888]
 * - Outer container: bg-[#1A1A1A] rounded-lg border-[#444444]
 * - Labels at 14px (Body size per typography scale)
 * - Minimum 44pt touch target (hitSlop)
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

export interface GymHomeToggleProps {
  mode: 'gym' | 'home';
  onChange: (mode: 'gym' | 'home') => void;
  disabled?: boolean;
}

const SEGMENTS: Array<'gym' | 'home'> = ['gym', 'home'];

export function GymHomeToggle({ mode, onChange, disabled = false }: GymHomeToggleProps) {
  return (
    <View className="flex-row bg-[#1A1A1A] rounded-lg border border-[#444444]">
      {SEGMENTS.map((seg) => {
        const isActive = mode === seg;
        const label = seg === 'gym' ? 'Gym' : 'Home';

        return (
          <Pressable
            key={seg}
            onPress={() => !disabled && onChange(seg)}
            className={[
              'px-4 py-2 rounded-lg items-center justify-center',
              isActive ? 'bg-[#00FF66]' : 'bg-transparent',
            ].join(' ')}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={`${label} mode`}
          >
            <Text
              style={{ fontSize: 14 }}
              className={isActive ? 'text-[#0E0E0E] font-semibold' : 'text-[#888888] font-normal'}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
