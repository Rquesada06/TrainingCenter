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

/** Minimal exercise shape for the today-card preview (structurally compatible with
 *  the snapshot day's routine exercises). */
export interface PreviewExercise {
  name: string;
  sets: number;
  reps?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  targetRpe?: number | null;
  timed?: boolean;
  duration?: number | null;
}

export interface ActiveWorkoutCardProps {
  routineName: string;
  exerciseCount: number;
  /** First few exercises to preview (numbered list); optional. */
  exercises?: PreviewExercise[];
  /** True when sessionStore has an in-progress session for today (after hydration). */
  hasInProgressSession: boolean;
  onStart: () => void;
}

/** "{sets} × {reps-range} · RPE {n}" or "{sets} × {duration}s" for a preview row. */
function previewLine(ex: PreviewExercise): string {
  if (ex.timed) {
    return ex.duration != null ? `${ex.sets} × ${ex.duration}s` : `${ex.sets} sets`;
  }
  const min = ex.repsMin ?? ex.repsMax ?? null;
  const max = ex.repsMax ?? ex.repsMin ?? null;
  let reps: string;
  if (min != null && max != null) reps = min === max ? `${min}` : `${min}–${max}`;
  else if (ex.reps != null) reps = `${ex.reps}`;
  else return `${ex.sets} sets`;
  const rpe = ex.targetRpe != null ? ` · RPE ${ex.targetRpe}` : '';
  return `${ex.sets} × ${reps}${rpe}`;
}

export function ActiveWorkoutCard({
  routineName,
  exerciseCount,
  exercises = [],
  hasInProgressSession,
  onStart,
}: ActiveWorkoutCardProps) {
  const ctaLabel = hasInProgressSession ? 'Continue Workout' : 'Start Workout';
  const preview = exercises.slice(0, 3);
  const remaining = exerciseCount - preview.length;

  return (
    <View className="bg-[#1A1A1A] border border-[#444444] rounded-xl p-6">
      <Text style={{ color: '#888888', fontSize: 14, fontWeight: '400', marginBottom: 4 }}>
        Today's Workout
      </Text>
      <Text
        style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 }}
        numberOfLines={2}
      >
        {routineName}
      </Text>
      <Text
        style={{
          color: '#888888',
          fontSize: 14,
          fontWeight: '400',
          marginBottom: preview.length > 0 ? 16 : 20,
        }}
      >
        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
      </Text>

      {preview.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          {preview.map((ex, i) => (
            <View
              key={`${ex.name}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: '#2A2A2A',
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: '#0E0E0E',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text
                  style={{ color: '#888888', fontSize: 12, fontFamily: 'JetBrainsMono-Regular' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}
                  numberOfLines={1}
                >
                  {ex.name}
                </Text>
                <Text style={{ color: '#888888', fontSize: 13, marginTop: 1 }}>
                  {previewLine(ex)}
                </Text>
              </View>
            </View>
          ))}
          {remaining > 0 && (
            <Text style={{ color: '#888888', fontSize: 13, marginTop: 8, marginLeft: 42 }}>
              +{remaining} more
            </Text>
          )}
        </View>
      )}

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
