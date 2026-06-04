/**
 * Workout Session Screen — Phase 03 Plan 04 (WORK-03..08, D-07..D-14)
 *
 * Active workout execution AND read-only completed view (D-12) — same screen,
 * routed via `readOnly` param.
 *
 * Active mode:
 *   - Header: back + routine name + GymHomeToggle
 *   - FlatList of ExerciseRow (single-open expand, checkbox per exercise)
 *   - Pinned FinishButton at bottom
 *   - Resume / Start-over prompt on mount if prior in-progress session exists (D-14)
 *   - Navigation guard on back when session has progress (2D)
 *   - Finish: builds Session record → withSaveFeedback → clearSession → celebration
 *
 * Read-only mode (readOnly=true param):
 *   - Header title "Session Complete"; toggle disabled
 *   - Checkboxes show completedExerciseIds from Firestore (useTodaySession), non-interactive
 *   - FinishButton replaced by PrimaryButton outline "Close Session" → back
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClientActiveAssignment } from '@/hooks/useClientActiveAssignment';
import { useTodaySession } from '@/hooks/useTodaySession';
import { useFinishSession } from '@/hooks/useFinishSession';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { resolveVariant } from '@/lib/variantResolver';
import { computeTodayWorkout, localTodayString } from '@/lib/workoutDayComputer';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import { getLastMode, setLastMode } from '@/lib/lastWorkoutMode';
import { GymHomeToggle } from '@/components/workout/GymHomeToggle';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import { FinishButton } from '@/components/workout/FinishButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { Session } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ResolvedItem {
  exercise: AssignmentSnapshotExercise;
  modeTag: 'gym_only' | 'home_only' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ readOnly?: string }>();
  const readOnly = params.readOnly === 'true';

  // ── Auth ────────────────────────────────────────────────────────────────────
  const uid = useAuthStore((s) => s.uid);
  const trainerId = useAuthStore((s) => s.trainerId);
  const today = localTodayString();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: assignment } = useClientActiveAssignment();
  const { data: todaySession } = useTodaySession();
  const finishMutation = useFinishSession();

  // ── SessionStore ─────────────────────────────────────────────────────────────
  const storeMode = useSessionStore((s) => s.mode);
  const storeIsActive = useSessionStore((s) => s.isActive);
  const storeDate = useSessionStore((s) => s.date);
  const storeClientId = useSessionStore((s) => s.clientId);
  const storeCompletedIds = useSessionStore((s) => s.completedExerciseIds);
  const storeStartedAt = useSessionStore((s) => s.startedAt);
  const storeWeekIndex = useSessionStore((s) => s.weekIndex);
  const storeDayIndex = useSessionStore((s) => s.dayIndex);
  const storeAssignmentId = useSessionStore((s) => s.assignmentId);
  const startSession = useSessionStore((s) => s.startSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const toggleExercise = useSessionStore((s) => s.toggleExercise);
  const setMode = useSessionStore((s) => s.setMode);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [mode, setLocalMode] = useState<'gym' | 'home'>('gym');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const resumeShownRef = useRef(false);
  const sessionStartedRef = useRef(false);

  // ── Derive workout day ───────────────────────────────────────────────────────
  const workoutResult =
    assignment ? computeTodayWorkout(assignment, today) : null;
  const isActiveDay =
    workoutResult?.state === 'active';

  const weekIndex =
    isActiveDay ? workoutResult.weekIndex : null;
  const dayIndex =
    isActiveDay ? workoutResult.dayIndex : null;
  const day = isActiveDay ? workoutResult.day : null;
  const exercises = day?.routine?.exercises ?? [];
  const routineName = day?.routine?.name ?? 'Workout';

  // ── Hydration gate ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useSessionStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  // ── Seed mode from lastWorkoutMode on mount (D-09) ───────────────────────────
  useEffect(() => {
    getLastMode().then((savedMode) => {
      setLocalMode(savedMode);
      // Also align the store mode
      setMode(savedMode);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Resume / Start-over prompt (D-14) ────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (!uid || !assignment || weekIndex === null || dayIndex === null) return;
    if (readOnly) return;
    if (resumeShownRef.current) return;

    const hasInProgress =
      storeIsActive &&
      storeDate === today &&
      storeClientId === uid;

    if (hasInProgress) {
      resumeShownRef.current = true;
      sessionStartedRef.current = true;

      Alert.alert(
        'Resume workout?',
        'You have an unfinished workout. Resume where you left off?',
        [
          {
            text: 'Start over',
            style: 'destructive',
            onPress: () => {
              clearSession();
              startSession({
                clientId: uid,
                date: today,
                weekIndex: weekIndex!,
                dayIndex: dayIndex!,
                assignmentId: assignment.id,
                startedAt: new Date().toISOString(),
              });
              // Reset to last saved mode
              getLastMode().then((savedMode) => {
                setLocalMode(savedMode);
                setMode(savedMode);
              });
            },
          },
          {
            text: 'Resume',
            style: 'default',
            onPress: () => {
              // Keep existing store state; sync local mode from store
              setLocalMode(storeMode);
            },
          },
        ]
      );
    } else if (!sessionStartedRef.current) {
      // No in-progress session → start fresh
      sessionStartedRef.current = true;
      startSession({
        clientId: uid,
        date: today,
        weekIndex: weekIndex!,
        dayIndex: dayIndex!,
        assignmentId: assignment.id,
        startedAt: new Date().toISOString(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, uid, assignment, weekIndex, dayIndex]);

  // ── Navigation guard (2D) ────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (!readOnly && storeIsActive && storeCompletedIds.length > 0) {
      Alert.alert(
        'Leave workout?',
        'Your progress is saved. You can continue this workout later today.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'default', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [readOnly, storeIsActive, storeCompletedIds.length, router]);

  // ── Mode toggle (D-08/D-09/D-11) ────────────────────────────────────────────
  const handleModeChange = useCallback(
    (newMode: 'gym' | 'home') => {
      setLocalMode(newMode);
      setMode(newMode);
      setLastMode(newMode).catch(() => {});
    },
    [setMode]
  );

  // ── Expand/collapse (single-open) ────────────────────────────────────────────
  const handleToggleExpand = useCallback((exerciseId: string) => {
    setExpandedId((prev) => (prev === exerciseId ? null : exerciseId));
  }, []);

  // Marking an exercise done collapses it so the user flows to the next one.
  const handleToggleComplete = useCallback(
    (exerciseId: string) => {
      if (readOnly) return;
      const willComplete = !storeCompletedIds.includes(exerciseId);
      toggleExercise(exerciseId);
      if (willComplete) {
        setExpandedId((prev) => (prev === exerciseId ? null : prev));
      }
    },
    [readOnly, storeCompletedIds, toggleExercise]
  );

  // ── Finish flow (WORK-06/07, D-13) ──────────────────────────────────────────
  const handleFinish = useCallback(() => {
    if (!uid || !assignment || weekIndex === null || dayIndex === null) return;

    const completedAt = new Date().toISOString();
    const startedAt = storeStartedAt ?? completedAt;
    const completedCount = storeCompletedIds.length;
    const total = exercises.length;

    const sessionRecord: Omit<Session, 'id'> = {
      clientId: uid,
      trainerId: trainerId ?? assignment.trainerId,
      assignmentId: storeAssignmentId ?? assignment.id,
      date: today,
      weekIndex: storeWeekIndex ?? weekIndex,
      dayIndex: storeDayIndex ?? dayIndex,
      mode: storeMode,
      completedExerciseIds: [...storeCompletedIds],
      totalExercises: total,
      startedAt,
      completedAt,
      routineName,
    };

    withSaveFeedback(
      () => finishMutation.mutateAsync(sessionRecord),
      () => {
        clearSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push({
          pathname: '/client/workout/celebration' as any,
          params: {
            completed: String(completedCount),
            total: String(total),
            startedAt,
            completedAt,
          },
        });
      },
      'Could not save session'
    );
  }, [
    uid,
    assignment,
    weekIndex,
    dayIndex,
    trainerId,
    storeAssignmentId,
    storeWeekIndex,
    storeDayIndex,
    storeMode,
    storeCompletedIds,
    storeStartedAt,
    exercises.length,
    routineName,
    today,
    finishMutation,
    clearSession,
    router,
  ]);

  // ── Resolved exercise list (re-resolves on mode change per D-08) ─────────────
  const resolvedExercises: ResolvedItem[] = exercises.map((ex) =>
    resolveVariant(ex, mode)
  );

  // ── Read-only completed IDs (from Firestore, NOT sessionStore) ───────────────
  const readOnlyCompletedIds = todaySession?.completedExerciseIds ?? [];

  // ── Render ───────────────────────────────────────────────────────────────────
  const headerTitle = readOnly ? 'Session Complete' : routineName;
  const weekLabel =
    weekIndex !== null && dayIndex !== null
      ? `Week ${weekIndex + 1} · Day ${dayIndex + 1}`
      : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }} edges={['top']}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2A2A2A',
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{ fontSize: 20, fontWeight: '600', color: '#FFFFFF' }}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          {weekLabel !== '' && (
            <Text style={{ fontSize: 14, color: '#888888', marginTop: 1 }}>
              {weekLabel}
            </Text>
          )}
        </View>

        <GymHomeToggle
          mode={mode}
          onChange={handleModeChange}
          disabled={readOnly}
        />
      </View>

      {/* ── Exercise list ── */}
      <FlatList<ResolvedItem>
        data={resolvedExercises}
        keyExtractor={(item) => item.exercise.exerciseId}
        renderItem={({ item }) => {
          const exId = item.exercise.exerciseId;
          const isCompleted = readOnly
            ? readOnlyCompletedIds.includes(exId)
            : storeCompletedIds.includes(exId);

          return (
            <ExerciseRow
              exercise={item.exercise}
              modeTag={item.modeTag}
              isCompleted={isCompleted}
              onToggleComplete={() => handleToggleComplete(exId)}
              isExpanded={expandedId === exId}
              onToggleExpand={() => handleToggleExpand(exId)}
              readOnly={readOnly}
            />
          );
        }}
        contentContainerStyle={{
          paddingBottom: readOnly ? insets.bottom + 80 : insets.bottom + 96,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Bottom CTA ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 16,
          paddingTop: 8,
          backgroundColor: '#0E0E0E',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
        }}
      >
        {readOnly ? (
          <PrimaryButton
            label="Close Session"
            variant="outline"
            onPress={() => router.back()}
          />
        ) : (
          <FinishButton
            completedCount={storeCompletedIds.length}
            totalExercises={exercises.length}
            isPending={finishMutation.isPending}
            onFinish={handleFinish}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
