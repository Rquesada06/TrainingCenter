/**
 * Celebration / Summary Screen — Phase 03 Plan 04 (WORK-07, D-12/D-13)
 *
 * Modal presentation (declared in workout/_layout.tsx).
 * Renders after a workout is finished — shows:
 *   - Completion count (X of Y in accent green / white)
 *   - Optional duration line (only when ≥ 1 minute elapsed)
 *   - Ratio-based motivational closer (5 options keyed by completedCount/total)
 *   - "Back to Home" button that invalidates todaySession and dismisses
 *
 * "Back to Home" triggers queryClient.invalidateQueries(['todaySession', uid, today])
 * so the Home screen transitions to State 1f (Workout Done) on return (WORK-07 / D-12).
 *
 * UI-SPEC Screen 3:
 *   - ribbon-outline 64px #00FF66
 *   - "Workout Complete!" 28px/600/#FFFFFF
 *   - "{completedCount} of {total} exercises done" 20px/400 (count in #00FF66, total in #FFFFFF)
 *   - duration line 16px/400/#888888 (hidden if < 1 min)
 *   - closer 14px/400/#888888
 *   - PrimaryButton solid "Back to Home"
 */

import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { localTodayString } from '@/lib/workoutDayComputer';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

// ─────────────────────────────────────────────────────────────────────────────
// Ratio-based motivational closer (UI-SPEC Screen 3)
// ─────────────────────────────────────────────────────────────────────────────

function getMotivationalCloser(completed: number, total: number): string {
  if (total === 0) return 'You showed up. That\'s what matters.';
  const ratio = completed / total;
  if (ratio >= 1.0) return 'Perfect session. Every rep counted.';
  if (ratio >= 0.8) return 'Strong effort. Almost a clean sweep.';
  if (ratio >= 0.5) return 'Solid work. Each session builds momentum.';
  if (ratio >= 0.25) return 'Good start. Every session moves you forward.';
  return 'You showed up. That\'s what matters.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration helper
// ─────────────────────────────────────────────────────────────────────────────

function getDurationMinutes(startedAt: string, completedAt: string): number | null {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return null;
  const minutes = Math.floor((endMs - startMs) / 60_000);
  return minutes >= 1 ? minutes : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CelebrationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();

  const params = useLocalSearchParams<{
    completed?: string;
    total?: string;
    startedAt?: string;
    completedAt?: string;
  }>();

  const completed = parseInt(params.completed ?? '0', 10);
  const total = parseInt(params.total ?? '0', 10);
  const durationMin = params.startedAt && params.completedAt
    ? getDurationMinutes(params.startedAt, params.completedAt)
    : null;

  const closer = getMotivationalCloser(completed, total);

  const handleBackToHome = () => {
    // Invalidate todaySession so Home screen transitions to State 1f (done state)
    queryClient.invalidateQueries({ queryKey: ['todaySession', uid, today] });
    router.dismissAll();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        {/* Hero icon */}
        <Ionicons name="ribbon-outline" size={64} color="#00FF66" style={{ marginBottom: 24 }} />

        {/* Primary heading */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '600',
            color: '#FFFFFF',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Workout Complete!
        </Text>

        {/* Completion count — X in accent, rest in white */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '400', color: '#00FF66' }}>{completed}</Text>
          <Text style={{ fontSize: 20, fontWeight: '400', color: '#FFFFFF' }}>
            {' of '}{total}{' exercises done'}
          </Text>
        </View>

        {/* Duration line — only shown when ≥ 1 minute */}
        {durationMin !== null && (
          <Text
            style={{
              fontSize: 16,
              fontWeight: '400',
              color: '#888888',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {`Finished in ${durationMin} min`}
          </Text>
        )}

        {/* Motivational closer */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: '#888888',
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          {closer}
        </Text>

        {/* CTA */}
        <View style={{ width: '100%' }}>
          <PrimaryButton
            label="Back to Home"
            onPress={handleBackToHome}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
