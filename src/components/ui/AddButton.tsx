/**
 * AddButton — the compact green "+ Add" pill used in screen headers across the
 * trainer view (standardised from the Programs screen). Soft press feedback.
 */

import React from 'react';
import { Pressable, Text } from 'react-native';

export interface AddButtonProps {
  label?: string;
  onPress: () => void;
}

export function AddButton({ label = '+ Add', onPress }: AddButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => ({
        backgroundColor: '#00FF66',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ color: '#0E0E0E', fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
