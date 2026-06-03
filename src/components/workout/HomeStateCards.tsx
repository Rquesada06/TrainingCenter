/**
 * HomeStateCards — Phase 03 Plan 03 (WORK-01, WORK-02, D-06)
 *
 * Six named card components for the Client Home screen, one per workout state.
 * Obsidian Performance design system. All copy follows the UI-SPEC Copywriting Contract.
 *
 * States:
 *  1a NoProgramCard        — no active assignment
 *  1b StartsInNCard        — program starts in N days (or tomorrow)
 *  1c RestDayCard          — rest day, rotating message keyed by weekday (D-15)
 *  1d ActiveWorkoutCard    — active workout today; Start or Continue CTA
 *  1e ProgramCompleteCard  — program finished, terminal state
 *  1f WorkoutDoneCard      — workout already completed today (WORK-09); View session CTA
 *
 * Base card: bg-[#1A1A1A] rounded-xl p-6 + border variant
 *   Non-interactive (1a, 1b, 1c, 1e):  border border-[#2A2A2A]
 *   Interactive (1d, 1f):              border border-[#444444]
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { parseDateOnly } from '@/lib/workoutDayComputer';

// ─────────────────────────────────────────────────────────────────────────────
// Rest-day rotating messages (D-15) — 7 entries, keyed by getDay() (0 = Sunday)
// ─────────────────────────────────────────────────────────────────────────────

const REST_MESSAGES: [string, string, string, string, string, string, string] = [
  'Recovery is where progress is made. Rest well.',        // 0 Sunday
  'Your muscles grow when you rest. Enjoy the day.',       // 1 Monday
  'Active rest: walk, stretch, breathe. You earned it.',  // 2 Tuesday
  'Rest is part of the plan. Trust the process.',         // 3 Wednesday
  'Recharge today. Tomorrow, you go harder.',             // 4 Thursday
  'Rest day. Your body is rebuilding. Let it.',           // 5 Friday
  'The work is done. Rest is the reward.',                // 6 Saturday
];

// ─────────────────────────────────────────────────────────────────────────────
// 1a — No Program Assigned
// ─────────────────────────────────────────────────────────────────────────────

export function NoProgramCard() {
  return (
    <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 items-center">
      <Ionicons name="fitness-outline" size={48} color="#444444" style={{ marginBottom: 16 }} />
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}
      >
        No program yet
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 22 }}
      >
        Your trainer hasn't assigned a program yet. Check back soon.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1b — Program Starts in N Days
// ─────────────────────────────────────────────────────────────────────────────

export interface StartsInNCardProps {
  programName: string;
  daysUntilStart: number;
  startDate: string; // YYYY-MM-DD
}

export function StartsInNCard({ programName, daysUntilStart, startDate }: StartsInNCardProps) {
  const heading =
    daysUntilStart === 1
      ? 'Your program starts tomorrow'
      : `Your program starts in ${daysUntilStart} days`;

  const formattedDate = parseDateOnly(startDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 items-center">
      <Ionicons name="calendar-outline" size={48} color="#00FF66" style={{ marginBottom: 16 }} />
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}
      >
        {heading}
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 22 }}
      >
        {programName} · First workout on {formattedDate}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1c — Rest Day
// ─────────────────────────────────────────────────────────────────────────────

export interface RestDayCardProps {
  /** YYYY-MM-DD of today (used to derive weekday for deterministic message) */
  today: string;
}

export function RestDayCard({ today }: RestDayCardProps) {
  const weekday = parseDateOnly(today).getDay(); // 0 (Sun) – 6 (Sat)
  const message = REST_MESSAGES[weekday];

  return (
    <View className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 items-center">
      <Ionicons name="moon-outline" size={48} color="#888888" style={{ marginBottom: 16 }} />
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}
      >
        Rest day
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 22 }}
      >
        {message}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1d — Active Workout
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveWorkoutCardProps {
  routineName: string;
  exerciseCount: number;
  /** True when sessionStore has an in-progress session for today (after hydration). */
  hasInProgressSession: boolean;
  onStart: () => void;
}

export function ActiveWorkoutCard({
  routineName,
  exerciseCount,
  hasInProgressSession,
  onStart,
}: ActiveWorkoutCardProps) {
  const ctaLabel = hasInProgressSession ? 'Continue Workout' : 'Start Workout';

  return (
    <View className="bg-[#1A1A1A] border border-[#444444] rounded-xl p-6">
      <Text
        style={{ color: '#888888', fontSize: 14, fontWeight: '400', marginBottom: 4 }}
      >
        Today's Workout
      </Text>
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 4 }}
        numberOfLines={2}
      >
        {routineName}
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 14, fontWeight: '400', marginBottom: 20 }}
      >
        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
      </Text>
      <PrimaryButton label={ctaLabel} onPress={onStart} variant="solid" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1e — Program Complete
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramCompleteCardProps {
  programName: string;
}

export function ProgramCompleteCard({ programName }: ProgramCompleteCardProps) {
  return (
    <View className="bg-[#1A1A1A] border border-[#444444] rounded-xl p-6 items-center">
      <Ionicons name="trophy-outline" size={48} color="#00FF66" style={{ marginBottom: 16 }} />
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}
      >
        Program complete
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 22 }}
      >
        You've finished {programName}. Talk to your trainer about what's next.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1f — Workout Already Completed Today
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkoutDoneCardProps {
  completedCount: number;
  total: number;
  onView: () => void;
}

export function WorkoutDoneCard({ completedCount, total, onView }: WorkoutDoneCardProps) {
  return (
    <View className="bg-[#1A1A1A] border border-[#444444] rounded-xl p-6 items-center">
      <Ionicons name="checkmark-circle" size={48} color="#00FF66" style={{ marginBottom: 16 }} />
      <Text
        style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}
      >
        Workout done!
      </Text>
      <Text
        style={{ color: '#888888', fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 22, marginBottom: 20 }}
      >
        {completedCount} of {total} exercises completed today.
      </Text>
      <PrimaryButton label="View session" onPress={onView} variant="outline" />
    </View>
  );
}
