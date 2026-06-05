/**
 * RpeStepper — Compact 1–10 RPE picker for per-set logging.
 * Phase 05 Plan 03 (LOG-01/D-01/D-03)
 *
 * Renders `[ − ] {value} [ + ]` + "Clear" affordance.
 * - Step: 0.5 (integer fallback acceptable per D-03)
 * - Clamp: 1.0–10.0
 * - NOT a free keypad (D-01) — stepper buttons only
 * - RPE is optional; blank displays "–" (en-dash)
 * - Clear returns to null (blank)
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface RpeStepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RPE_MIN = 1;
const RPE_MAX = 10;
const RPE_STEP = 0.5;
const RPE_DEFAULT_START = 5; // when null and + pressed, start at 5

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function RpeStepper({ value, onChange }: RpeStepperProps) {
  const handleDecrement = () => {
    if (value === null) return;
    const next = Math.max(RPE_MIN, value - RPE_STEP);
    // Round to 1 decimal to avoid floating point drift
    onChange(Math.round(next * 10) / 10);
  };

  const handleIncrement = () => {
    if (value === null) {
      // Start from the default when blank
      onChange(RPE_DEFAULT_START);
      return;
    }
    const next = Math.min(RPE_MAX, value + RPE_STEP);
    onChange(Math.round(next * 10) / 10);
  };

  const handleClear = () => {
    onChange(null);
  };

  // Format value: integer when whole number, one decimal for halves
  const displayValue = value === null
    ? '–'
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(1);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={{ now: value ?? undefined }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Decrement button */}
      <Pressable
        onPress={handleDecrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Decrease RPE"
        style={{
          width: 32,
          height: 32,
          borderWidth: 1,
          borderColor: '#444444',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="remove" size={16} color="#FFFFFF" />
      </Pressable>

      {/* Value display */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'JetBrainsMono-Regular',
          color: '#FFFFFF',
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {displayValue}
      </Text>

      {/* Increment button */}
      <Pressable
        onPress={handleIncrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Increase RPE"
        style={{
          width: 32,
          height: 32,
          borderWidth: 1,
          borderColor: '#444444',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </Pressable>

      {/* Clear affordance — only visible when a value is set */}
      {value !== null && (
        <Pressable
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear RPE"
        >
          <Text style={{ fontSize: 14, color: '#888888' }}>Clear</Text>
        </Pressable>
      )}
    </View>
  );
}
