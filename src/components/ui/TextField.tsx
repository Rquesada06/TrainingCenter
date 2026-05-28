/**
 * TextField — Reusable text input primitive (Obsidian Performance theme)
 * Phase 01 Plan 03
 *
 * Styling follows the Obsidian Performance design system:
 * - Background: #1A1A1A (surface) on #0E0E0E (base)
 * - Text: #FFFFFF (primary)
 * - Label: #888888 (secondary muted)
 * - Error: red-400 / red-500 (destructive)
 * - Border: muted (#444444) default, red on error
 */

import React from 'react';
import { TextInput, Text, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  /** Field label displayed above the input */
  label: string;
  /** Current value — must be controlled */
  value: string;
  /** Called when text changes */
  onChangeText: (value: string) => void;
  /** Validation error message — displayed below the input in red */
  error?: string;
}

export function TextField({ label, value, onChangeText, error, ...rest }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-[#888888] text-sm mb-1 font-sans">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#444444"
        className={[
          'bg-[#1A1A1A] text-white rounded-lg px-4 py-3 text-base font-sans',
          error ? 'border border-red-500' : 'border border-[#444444]',
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
