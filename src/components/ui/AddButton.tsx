/**
 * AddButton — the compact green "+ Add" pill used in screen headers across the
 * trainer view (standardised from the Programs screen). Soft press feedback.
 *
 * Uses a static StyleSheet base (always applied) + alignSelf so it always keeps
 * its intrinsic size regardless of the parent's flex layout.
 */

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

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
      android_ripple={{ color: '#00cc52' }}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#00FF66',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.8 },
  label: { color: '#0E0E0E', fontWeight: '700', fontSize: 14 },
});
