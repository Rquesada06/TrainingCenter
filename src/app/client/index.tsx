/**
 * Client Home Screen — Phase 03 Plan 03 (WORK-01, WORK-02, D-06)
 *
 * Derives exactly ONE of six workout states on open:
 *   no_assignment, starts_soon, rest, active, program_complete, completed_today
 *
 * State derivation order:
 *  1. No active assignment            → NoProgramCard (1a)
 *  2. assignment + computeTodayWorkout:
 *     - starts_soon                   → StartsInNCard (1b)
 *     - rest / program_complete       → RestDayCard (1c) / ProgramCompleteCard (1e)
 *     - active + todaySession != null → WorkoutDoneCard (1f, WORK-09 precedence)
 *     - active + no session           → ActiveWorkoutCard (1d)
 *
 * Guards:
 *  - Stale-date clear (D-14 / Pitfall 4): clears yesterday's persisted session on mount
 *  - Hydration gate (RESEARCH Pattern 5): waits for persist rehydration before
 *    evaluating Start vs Continue to avoid a flash
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Pressable, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useClientActiveAssignment } from '@/hooks/useClientActiveAssignment';
import { useTodaySession } from '@/hooks/useTodaySession';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { computeTodayWorkout, localTodayString } from '@/lib/workoutDayComputer';
import type { WorkoutDayResult } from '@/lib/workoutDayComputer';
import {
  NoProgramCard,
  StartsInNCard,
  RestDayCard,
  ActiveWorkoutCard,
  ProgramCompleteCard,
  WorkoutDoneCard,
} from '@/components/workout/HomeStateCards';

export default function ClientHomeScreen() {
  const router = useRouter();
  const uid = useAuthStore((s) => s.uid);
  const today = localTodayString();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: assignment,
    isLoading: aLoading,
    isError: aError,
    refetch: aRefetch,
  } = useClientActiveAssignment();

  const { data: todaySession, isLoading: sLoading } = useTodaySession();

  // ── SessionStore selectors ───────────────────────────────────────────────────
  const sessionDate = useSessionStore((s) => s.date);
  const sessionIsActive = useSessionStore((s) => s.isActive);
  const sessionClientId = useSessionStore((s) => s.clientId);
  const clearSession = useSessionStore((s) => s.clearSession);

  // ── Hydration gate (RESEARCH Pattern 5) ─────────────────────────────────────
  // Prevents "Start Workout" / "Continue Workout" flash while AsyncStorage rehydrates.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Handle case where store hydrated before this effect ran
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useSessionStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  // ── Stale-date clear (D-14 / Pitfall 4) ─────────────────────────────────────
  // Runs ONCE on mount before resume evaluation.
  // If the persisted session belongs to a previous day, wipe it.
  useEffect(() => {
    if (sessionDate !== null && sessionDate !== today) {
      clearSession();
    }
    // Empty dep array — intentionally runs only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (aLoading || sLoading || !hydrated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#00FF66" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (aError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: '#1A1A1A',
              borderWidth: 1,
              borderColor: '#EF4444',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              width: '100%',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              Couldn't load your workout.
            </Text>
            <Text style={{ color: '#888888', fontSize: 14, marginBottom: 12 }}>
              Check your connection and pull to refresh.
            </Text>
            <Pressable onPress={() => aRefetch()}>
              <Text style={{ color: '#00FF66', fontSize: 14, fontWeight: '600' }}>Retry</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── In-progress session flag (after hydration) ───────────────────────────────
  // True only if the store has an active session for today belonging to this user.
  const hasInProgressSession =
    hydrated &&
    sessionIsActive &&
    sessionDate === today &&
    sessionClientId === uid;

  // ── State derivation ─────────────────────────────────────────────────────────
  let card: React.ReactElement;

  if (!assignment) {
    // 1a — No program assigned
    card = <NoProgramCard />;
  } else {
    const result = computeTodayWorkout(assignment, today);

    if (result.state === 'starts_soon') {
      // 1b — Program starts in N days
      card = (
        <StartsInNCard
          programName={assignment.snapshot.name}
          daysUntilStart={result.daysUntilStart}
          startDate={assignment.startDate}
        />
      );
    } else if (result.state === 'rest') {
      // 1c — Rest day
      card = <RestDayCard today={today} />;
    } else if (result.state === 'program_complete') {
      // 1e — Program complete
      card = <ProgramCompleteCard programName={assignment.snapshot.name} />;
    } else {
      // result.state === 'active' — narrow the type explicitly
      const activeResult = result as Extract<WorkoutDayResult, { state: 'active' }>;
      if (todaySession != null) {
        // 1f — Already completed today (WORK-09 precedence over active)
        card = (
          <WorkoutDoneCard
            completedCount={todaySession.completedExerciseIds.length}
            total={todaySession.totalExercises}
            onView={() =>
              // Route exists after Plan 04; use as any to avoid type error on unscaffolded route
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              router.push({ pathname: '/client/workout/session' as any, params: { readOnly: 'true' } })
            }
          />
        );
      } else {
        // 1d — Active workout today
        card = (
          <ActiveWorkoutCard
            routineName={activeResult.day.routine?.name ?? 'Workout'}
            exerciseCount={activeResult.day.routine?.exercises.length ?? 0}
            exercises={activeResult.day.routine?.exercises ?? []}
            hasInProgressSession={hasInProgressSession ?? false}
            // Route exists after Plan 04; use as any to avoid type error on unscaffolded route
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStart={() => router.push('/client/workout/session' as any)}
          />
        );
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {card}
      </ScrollView>
    </SafeAreaView>
  );
}
