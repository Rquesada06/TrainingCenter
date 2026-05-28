/**
 * PrimaryButton — Obsidian Performance accent CTA button
 * Phase 01 Plan 03
 *
 * Accent color: #00FF66 (electric green) — the primary call-to-action
 * Text: #0E0E0E (dark on bright accent — ensures contrast)
 * Disabled / loading: opacity-50 (dims the accent)
 *
 * Styling follows the Obsidian Performance design system:
 *   background: #00FF66 (accent)
 *   label text: #0E0E0E (dark, high-contrast on green)
 *   loading/disabled: opacity-50
 */

import React from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

export interface PrimaryButtonProps extends Pick<PressableProps, 'onPress'> {
  /** Button label text */
  label: string;
  /** Shows a spinner and disables tap interaction */
  loading?: boolean;
  /** Dims the button and disables tap interaction */
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={[
        'bg-[#00FF66] rounded-lg py-4 items-center justify-center',
        isDisabled ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#0E0E0E" />
      ) : (
        <Text className="text-[#0E0E0E] font-semibold text-base">{label}</Text>
      )}
    </Pressable>
  );
}
