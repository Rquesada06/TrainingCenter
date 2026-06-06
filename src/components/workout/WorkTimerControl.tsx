/**
 * WorkTimerControl — Phase 05 Plan 05 (TIMR-02/TIMR-04)
 *
 * Timed-exercise Start pill + running row + done chip (UI-SPEC A3).
 * Presentational only: no endsAt/keep-awake/alarm logic here.
 * All timer state comes from the parent via props (driven by useCountdownTimer).
 *
 * States:
 *   idle    — accent "Start {duration}s" pill (manual Start, D-05)
 *   running — mm:ss countdown row + Skip / +15s controls
 *   done    — "Done" chip (#00FF66)
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMmSs } from '@/lib/timer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorkTimerState = 'idle' | 'running' | 'done';

export interface WorkTimerControlProps {
  /** Duration in seconds (trainer-prescribed). */
  durationSec: number;
  /** Current timer state. */
  state: WorkTimerState;
  /** Remaining time in milliseconds (used in running state). */
  remainingMs: number;
  /** Called when the user taps the Start pill. */
  onStart: () => void;
  /** Called when the user taps Skip while running. */
  onSkip: () => void;
  /** Called when the user taps +15s while running. */
  onAdd15: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FINAL_10S_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Timed-exercise timer control rendered inside the expanded timed exercise card.
 * Drives from useCountdownTimer state passed in via props — purely presentational.
 */
export function WorkTimerControl({
  durationSec,
  state,
  remainingMs,
  onStart,
  onSkip,
  onAdd15,
}: WorkTimerControlProps) {
  // ── Done chip ─────────────────────────────────────────────────────────────
  if (state === 'done') {
    return (
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(0,255,102,0.15)',
            borderWidth: 1,
            borderColor: '#00FF66',
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="checkmark" size={16} color="#00FF66" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#00FF66',
            }}
          >
            Done
          </Text>
        </View>
      </View>
    );
  }

  // ── Running state ─────────────────────────────────────────────────────────
  if (state === 'running') {
    const isUrgent = remainingMs <= FINAL_10S_MS && remainingMs > 0;
    const countdownColor = isUrgent ? '#FFD600' : '#FFFFFF';
    const progressFill = isUrgent ? '#FFD600' : '#00FF66';
    const totalMs = durationSec * 1_000;
    const progressRatio = totalMs > 0 ? remainingMs / totalMs : 0;

    return (
      <View style={{ marginVertical: 8 }}>
        {/* Countdown row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              fontFamily: 'JetBrainsMono-Regular',
              color: countdownColor,
            }}
          >
            {formatMmSs(remainingMs)}
          </Text>

          {/* Skip + +15s controls */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Skip work timer"
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

        {/* Progress track */}
        <View
          style={{
            height: 4,
            backgroundColor: '#2A2A2A',
            borderRadius: 2,
          }}
        >
          <View
            style={{
              width: `${Math.round(progressRatio * 100)}%`,
              height: 4,
              backgroundColor: progressFill,
              borderRadius: 2,
            }}
          />
        </View>
      </View>
    );
  }

  // ── Idle state: accent Start pill ─────────────────────────────────────────
  return (
    <Pressable
      onPress={onStart}
      accessibilityRole="button"
      accessibilityLabel={`Start ${durationSec} second timer`}
      style={{
        backgroundColor: '#00FF66',
        borderRadius: 8,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 8,
      }}
    >
      <Ionicons name="play" size={16} color="#0E0E0E" />
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#0E0E0E',
        }}
      >
        Start {durationSec}s
      </Text>
    </Pressable>
  );
}
