/**
 * Fab — floating "+" action button (StitchUI). Green circle pinned bottom-right,
 * used for "add" across the trainer screens. Matches the design's add affordance
 * and avoids the header-row layout entirely.
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface FabProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function Fab({ onPress, accessibilityLabel = 'Add' }: FabProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + 20 },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="add" size={30} color="#0E0E0E" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
