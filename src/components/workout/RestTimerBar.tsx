/**
 * RestTimerBar — Phase 05 Plan 05 (TIMR-01/TIMR-03/TIMR-04)
 *
 * Inline pinned rest-timer bar (UI-SPEC A4). Presentational only:
 * all timer arithmetic (absolute time/keep-awake/alarm) lives in useCountdownTimer.
 * This component only renders what it receives via props.
 *
 * Props:
 *   remainingMs — current remaining time (ms), 0 when not running
 *   totalMs     — original total duration (ms), used for progress track
 *   onSkip      — dismiss timer immediately (no alarm)
 *   onAdd15     — extend timer by 15 seconds
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMmSs } from '@/lib/timer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RestTimerBarProps {
  /** Remaining time in milliseconds (clamped ≥ 0 by the hook). */
  remainingMs: number;
  /** Original total duration in milliseconds (for the progress track). */
  totalMs: number;
  /** Called when the user presses Skip — no alarm fires. */
  onSkip: () => void;
  /** Called when the user presses +15s — extends the timer by 15s. */
  onAdd15: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FINAL_10S_MS = 10_000;
const BAR_HEIGHT = 56;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inline pinned rest-timer bar rendered above the finish CTA.
 * Visible only while a rest timer is active (caller controls mounting).
 * Timer arithmetic lives in useCountdownTimer — this component is presentational.
 */
export function RestTimerBar({
  remainingMs,
  totalMs,
  onSkip,
  onAdd15,
}: RestTimerBarProps) {
  const insets = useSafeAreaInsets();

  // Final 10s urgency: countdown + track flip to #FFD600
  const isUrgent = remainingMs <= FINAL_10S_MS && remainingMs > 0;
  const urgentColor = '#FFD600';
  const normalColor = '#FFFFFF';
  const countdownColor = isUrgent ? urgentColor : normalColor;
  const progressFill = isUrgent ? urgentColor : '#00FF66';

  // Progress track: remaining-shrinks (green drain from right)
  const progressRatio = totalMs > 0 ? remainingMs / totalMs : 0;

  const countdownText = formatMmSs(remainingMs);

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={`Rest timer, ${countdownText} remaining`}
      style={{
        position: 'absolute',
        bottom: BAR_HEIGHT + insets.bottom + 16 + 8, // sits above finish CTA (56px + insets + CTA padding)
        left: 0,
        right: 0,
        backgroundColor: '#0E0E0E',
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
        paddingHorizontal: 16,
        height: BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        justifyContent: 'center',
      }}
    >
      {/* Progress track (remaining-shrinks) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: '#2A2A2A',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${Math.round(progressRatio * 100)}%`,
            height: 4,
            backgroundColor: progressFill,
          }}
        />
      </View>

      {/* Content row: label + countdown + controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: label + countdown */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '400', color: '#888888' }}
          >
            Rest
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '600',
              fontFamily: 'JetBrainsMono-Regular',
              color: countdownColor,
            }}
          >
            {countdownText}
          </Text>
        </View>

        {/* Right: Skip + +15s controls */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={onSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Skip rest timer"
            style={{
              borderWidth: 1,
              borderColor: '#444444',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: '#888888' }}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={onAdd15}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Add 15 seconds"
            style={{
              borderWidth: 1,
              borderColor: '#444444',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: '#888888' }}>+15s</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
