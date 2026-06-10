/**
 * Fab — floating "+" action button (StitchUI). Green circle pinned bottom-right,
 * used for "add" across the trainer screens. Matches the design's add affordance
 * and avoids the header-row layout entirely.
 *
 * Render path: a full-screen `absoluteFill` overlay (pointerEvents="box-none" so
 * touches fall through everywhere except the button) positions the button with
 * flex alignment + padding rather than bare `position:absolute` bottom/right
 * insets. On the New Architecture (Fabric), a lone absolute child of a flex
 * SafeAreaView gets layout-starved / not composited — the same bug that hid the
 * header AddButton. Giving the button a real measured parent sidesteps it.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface FabProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function Fab({ onPress, accessibilityLabel = 'Add' }: FabProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { paddingBottom: insets.bottom + 20 }]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={30} color="#0E0E0E" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 20,
    zIndex: 10,
  },
  fab: {
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
