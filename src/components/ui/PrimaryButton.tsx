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
  label: string;
  loading?: boolean;
  disabled?: boolean;
  /** 'solid' = #00FF66 filled (default); 'outline' = transparent with #444 border */
  variant?: 'solid' | 'outline';
}

export function PrimaryButton({ label, onPress, loading = false, disabled = false, variant = 'solid' }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={[
        'rounded-lg py-4 items-center justify-center border',
        isOutline
          ? 'bg-transparent border-[#444444]'
          : 'bg-[#00FF66] border-[#00FF66]',
        isDisabled ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#FFFFFF' : '#0E0E0E'} />
      ) : (
        <Text className={isOutline ? 'text-white font-semibold text-base' : 'text-[#0E0E0E] font-semibold text-base'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
