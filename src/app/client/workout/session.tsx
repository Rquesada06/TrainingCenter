/**
 * Workout Session Screen — Phase 03 Plan 04 (WORK-03..08, D-07..D-14)
 *                       + Phase 05 Plan 03 (LOG-01..04, D-07/D-08/D-09)
 *                       + Phase 05 Plan 05 (TIMR-01..04)
 *
 * Active workout execution AND read-only completed view (D-12) — same screen,
 * routed via `readOnly` param.
 *
 * Active mode:
 *   - Header: back + routine name + GymHomeToggle
 *   - FlatList of exercise cards (single-open expand)
 *   - Per-set SetRow rows inside expanded weighted exercise cards (Phase 05)
 *   - Pinned FinishButton at bottom
 *   - RestTimerBar pinned above FinishButton when rest timer active (TIMR-01)
 *   - Resume / Start-over prompt on mount if prior in-progress session exists (D-14)
 *   - Navigation guard on back when session has progress (2D)
 *   - Finish: buildFinalizedSession → withSaveFeedback → clearSession → celebration
 *
 * Read-only mode (readOnly=true param):
 *   - Header title "Session Complete"; toggle disabled
 *   - Checkboxes show completedExerciseIds from Firestore (useTodaySession), non-interactive
 *   - FinishButton replaced by PrimaryButton outline "Close Session" → back
 *
 * Phase 05 Plan 03 wiring:
 *   - Prior sessions fetched once via useQuery + fetchSessionsForAssignment for prefill
 *   - seedExercise(resolvePrefill(exercise, priorSessions)) on first expand (LOG-03)
 *   - SetRow ×N per weighted exercise (LOG-01/02), sourcing from sessionStore.loggedSets
 *   - Collapsed card: "{checked}/{sets} sets logged" caption + left-edge accent (D-08)
 *   - buildFinalizedSession replaces inline sessionRecord build (LOG-04)
 *   - withSaveFeedback wrapper unchanged (S2 pattern)
 *   - Old sessions (no loggedExercises) still load without crashing (null-guard)
 *
 * Phase 05 Plan 05 wiring (TIMR):
 *   - useCountdownTimer for rest (auto-start on set check) + work (manual Start)
 *   - RestTimerBar mounted above bottom CTA when restTimer.isRunning (TIMR-01)
 *   - WorkTimerControl in timed-exercise expanded body (TIMR-02)
 *   - Both timers: absolute endsAt / foreground recompute / keep-awake / fire-once alarm (D-06)
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
import { useQuery } from '@tanstack/react-query';
import { useClientActiveAssignment } from '@/hooks/useClientActiveAssignment';
import { useTodaySession } from '@/hooks/useTodaySession';
import { useFinishSession } from '@/hooks/useFinishSession';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { resolveVariant } from '@/lib/variantResolver';
import { computeTodayWorkout, localTodayString } from '@/lib/workoutDayComputer';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import { getLastMode, setLastMode } from '@/lib/lastWorkoutMode';
import { buildFinalizedSession } from '@/lib/sessionFinalize';
import { resolvePrefill } from '@/lib/prefill';
import { fetchSessionsForAssignment } from '@/services/session.service';
import { GymHomeToggle } from '@/components/workout/GymHomeToggle';
import { ExerciseMedia } from '@/components/workout/ExerciseMedia';
import { SetRow } from '@/components/workout/SetRow';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { WorkTimerControl } from '@/components/workout/WorkTimerControl';
import type { WorkTimerState } from '@/components/workout/WorkTimerControl';
import { FinishButton } from '@/components/workout/FinishButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import type { AssignmentSnapshotExercise } from '@/types/assignment';
import type { LoggedExercise } from '@/types/session';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ResolvedItem {
  exercise: AssignmentSnapshotExercise;
  modeTag: 'gym_only' | 'home_only' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Secondary line below exercise name in the collapsed card (UI-SPEC A1).
 * Weighted: {sets}×{repsMin}–{repsMax} · RPE {targetRpe}
 * Timed:    {duration}s + Timed badge
 */
function SecondaryLine({ exercise }: { exercise: AssignmentSnapshotExercise }) {
  if (exercise.timed) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
        {exercise.duration != null && (
          <Text style={{ fontSize: 14, color: '#888888', marginRight: 6 }}>
            {exercise.duration}s
          </Text>
        )}
        <View
          style={{
            backgroundColor: 'rgba(255,214,0,0.2)',
            borderWidth: 1,
            borderColor: '#FFD600',
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 14, color: '#FFD600' }}>Timed</Text>
        </View>
      </View>
    );
  }

  // Weighted secondary line. Use `!= null` (not `!== null`) so pre-prescription
  // snapshots — where these fields are `undefined`, not `null` — fall back to the
  // legacy `reps` / "{sets} sets" instead of rendering "?–?" and "RPE undefined".
  const min = exercise.repsMin ?? exercise.repsMax ?? null;
  const max = exercise.repsMax ?? exercise.repsMin ?? null;
  const repsText =
    min != null && max != null
      ? min === max
        ? `${exercise.sets}×${min}`
        : `${exercise.sets}×${min}–${max}`
      : exercise.reps != null
        ? `${exercise.sets}×${exercise.reps}`
        : `${exercise.sets} sets`;

  const rpeText = exercise.targetRpe != null ? ` · RPE ${exercise.targetRpe}` : '';

  return (
    <Text style={{ fontSize: 14, color: '#888888', marginTop: 2 }}>
      {repsText}{rpeText}
    </Text>
  );
}

/**
 * Mode-availability pill (D-10): yellow "gym only" / "home only" badge shown on a
 * card when the chosen mode has no valid variant for that exercise. Restored from
 * the v1.0 ExerciseRow — the Phase-5 card rework dropped it.
 */
function ModeTagPill({ tag }: { tag: 'gym_only' | 'home_only' }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,214,0,0.2)',
        borderWidth: 1,
        borderColor: '#FFD600',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 6,
      }}
    >
      <Text style={{ color: '#FFD600', fontSize: 13, fontWeight: '400' }}>
        {tag === 'gym_only' ? 'gym only' : 'home only'}
      </Text>
    </View>
  );
}

/**
 * Column header row for the set table (UI-SPEC A2).
 * Flex weights: SET 0.9 / PESO 2.6 / REPS 2.0 / RPE 2.2 / STATUS 1.6, gap 8.
 */
function SetTableHeader() {
  const headers: Array<{ label: string; flex: number }> = [
    { label: 'SET', flex: 0.9 },
    { label: 'PESO (KG)', flex: 2.6 },
    { label: 'REPS', flex: 2.0 },
    { label: 'RPE', flex: 2.2 },
    { label: 'STATUS', flex: 1.6 },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      {headers.map(({ label, flex }) => (
        <View key={label} style={{ flex, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: '#888888',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
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

  // ── Prior sessions for prefill (LOG-03/D-09) ─────────────────────────────────
  // Fetch ALL prior sessions for this assignment once on screen mount so
  // resolvePrefill can seed each set from last-session actuals (D-09).
  // Uses fetchSessionsForAssignment (plain async → Session[]), NOT the
  // paginated useSessionHistory infinite hook (plan pinned this).
  // Before the query resolves, resolvePrefill falls back to the trainer target
  // on empty priorSessions — no loading gate needed.
  const { data: priorSessions = [] } = useQuery({
    queryKey: ['priorSessions', uid, assignment?.id],
    queryFn: () =>
      uid && assignment?.id
        ? fetchSessionsForAssignment(uid, assignment.id)
        : Promise.resolve([]),
    enabled: !!uid && !!assignment?.id,
    staleTime: Infinity, // immutable for this screen lifetime
  });

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
  const storeLoggedSets = useSessionStore((s) => s.loggedSets);
  const startSession = useSessionStore((s) => s.startSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const toggleExercise = useSessionStore((s) => s.toggleExercise);
  const setMode = useSessionStore((s) => s.setMode);
  const setSetValue = useSessionStore((s) => s.setSetValue);
  const toggleSet = useSessionStore((s) => s.toggleSet);
  const seedExercise = useSessionStore((s) => s.seedExercise);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [mode, setLocalMode] = useState<'gym' | 'home'>('gym');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const resumeShownRef = useRef(false);
  const sessionStartedRef = useRef(false);
  // Track which exercises have been seeded so seedExercise is called at most once per exercise
  const seededExercisesRef = useRef<Set<string>>(new Set());

  // ── Timers (TIMR-01/02/03/04) ────────────────────────────────────────────────
  // Rest timer: auto-starts on set check (D-04); one at a time, last-check-wins
  const restTimer = useCountdownTimer();
  // Work timers: one per exercise (manual Start, D-05); stored by exerciseId
  // Using a record of states driven by useCountdownTimer instances is too many hooks.
  // Instead, use a single work timer + track which exercise owns it.
  const [workTimerExerciseId, setWorkTimerExerciseId] = useState<string | null>(null);
  const [workTimerState, setWorkTimerState] = useState<WorkTimerState>('idle');
  const workTimer = useCountdownTimer(() => {
    // On expiry: mark the timed exercise's implicit set complete (D-08)
    if (workTimerExerciseId) {
      toggleSet(workTimerExerciseId, 1);
    }
    setWorkTimerState('done');
  });

  // Rest timer total for progress track — stored when started
  const restTimerTotalMsRef = useRef(0);

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
              setLocalMode(storeMode);
            },
          },
        ]
      );
    } else if (!sessionStartedRef.current) {
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

  // ── Mode toggle ──────────────────────────────────────────────────────────────
  const handleModeChange = useCallback(
    (newMode: 'gym' | 'home') => {
      setLocalMode(newMode);
      setMode(newMode);
      setLastMode(newMode).catch(() => {});
    },
    [setMode]
  );

  // Seed prefill for a weighted exercise on first reveal (LOG-03/D-09).
  // Idempotent — seededExercisesRef tracks visited exercises so we seed once.
  // Used by both manual expand and guided auto-advance.
  const seedExerciseIfNeeded = useCallback(
    (exerciseId: string, exercise: AssignmentSnapshotExercise) => {
      if (
        exercise.timed ||
        readOnly ||
        seededExercisesRef.current.has(exerciseId)
      ) {
        return;
      }
      seededExercisesRef.current.add(exerciseId);
      const seeds = resolvePrefill(exercise, priorSessions);
      seedExercise(exerciseId, seeds);
    },
    [priorSessions, seedExercise, readOnly]
  );

  // ── Expand/collapse (single-open) — with prefill seed on first expand ──────
  const handleToggleExpand = useCallback(
    (exerciseId: string, exercise: AssignmentSnapshotExercise) => {
      const isOpening = expandedId !== exerciseId;
      setExpandedId((prev) => (prev === exerciseId ? null : exerciseId));
      if (isOpening) seedExerciseIfNeeded(exerciseId, exercise);
    },
    [expandedId, seedExerciseIfNeeded]
  );

  // ── Toggle per-exercise completion (v1.0 path, kept for compatibility) ─────
  const handleToggleComplete = useCallback(
    (exerciseId: string, nextExpandId: string | null) => {
      if (readOnly) return;
      const willComplete = !storeCompletedIds.includes(exerciseId);
      toggleExercise(exerciseId);
      if (willComplete) {
        setExpandedId(nextExpandId);
      }
    },
    [readOnly, storeCompletedIds, toggleExercise]
  );

  // ── Per-set done toggle + rest timer auto-start + guided auto-advance ───────
  // Checking a set (not unchecking) auto-starts the rest timer (TIMR-01, D-04)
  // and, once EVERY set is checked, collapses this exercise and expands the next
  // incomplete one (guided flow). Unchecking does neither (no timer restart).
  const handleToggleSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      exercise: AssignmentSnapshotExercise,
      nextExercise: AssignmentSnapshotExercise | null
    ) => {
      if (readOnly) return;

      // Determine whether this toggle is a CHECK or an UNCHECK (pre-toggle state)
      const before = useSessionStore.getState().loggedSets[exerciseId] ?? [];
      const wasCompleted =
        before.find((s) => s.setNumber === setNumber)?.completed ?? false;

      toggleSet(exerciseId, setNumber);

      // Only react on a CHECK — unchecking must not restart the timer or advance.
      if (!wasCompleted) {
        // Auto-start the rest timer from this exercise's rest seconds (TIMR-01)
        const restSec = exercise.rest;
        if (restSec && restSec > 0) {
          restTimerTotalMsRef.current = restSec * 1_000;
          restTimer.start(restSec);
        }

        // Guided auto-advance: when ALL sets are now checked, collapse this
        // exercise and expand (and seed) the next not-yet-finished one.
        const after = useSessionStore.getState().loggedSets[exerciseId] ?? [];
        const completedCount = after.filter((s) => s.completed).length;
        if (completedCount >= exercise.sets) {
          if (nextExercise) {
            seedExerciseIfNeeded(nextExercise.exerciseId, nextExercise);
            setExpandedId(nextExercise.exerciseId);
          } else {
            setExpandedId(null); // nothing left to advance to — collapse
          }
        }
      }
    },
    [readOnly, toggleSet, restTimer, seedExerciseIfNeeded]
  );

  // ── Finish flow (WORK-06/07, D-13, LOG-04) ──────────────────────────────────
  const handleFinish = useCallback(() => {
    if (!uid || !assignment || weekIndex === null || dayIndex === null) return;

    const completedAt = new Date().toISOString();
    const startedAt = storeStartedAt ?? completedAt;

    // Resolved exercise list for finalize payload
    const resolvedExerciseList = resolvedExercises.map((r) => r.exercise);

    // Build loggedExercises from live store state for buildFinalizedSession.
    // Null-guard: storeLoggedSets[id] may be empty for unstarted exercises.
    const loggedExercisesInput: LoggedExercise[] = resolvedExerciseList.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      timed: ex.timed,
      sets: storeLoggedSets[ex.exerciseId] ?? [],
    }));

    // Replace inline sessionRecord build with buildFinalizedSession (LOG-04).
    // buildFinalizedSession derives completedExerciseIds via the ≥1-set rule (D-08).
    const sessionRecord = buildFinalizedSession(
      {
        clientId: uid,
        trainerId: trainerId ?? assignment.trainerId,
        assignmentId: storeAssignmentId ?? assignment.id,
        date: today,
        weekIndex: storeWeekIndex ?? weekIndex,
        dayIndex: storeDayIndex ?? dayIndex,
        mode: storeMode,
        startedAt,
        completedAt,
        routineName,
      },
      resolvedExerciseList,
      loggedExercisesInput,
    );

    const completedCount = sessionRecord.completedExerciseIds.length;
    const total = sessionRecord.totalExercises;

    const doFinish = () => {
      // Keep the exact withSaveFeedback wrapper shape (S2 — unchanged from v1.0)
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
    };

    // Incomplete-confirm threshold uses per-exercise completion derived from sets (D-08, UI-SPEC A5).
    if (completedCount < total) {
      Alert.alert(
        'Finish session?',
        `You've logged ${completedCount} of ${total} exercises. Unlogged sets won't be saved. Finish anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', style: 'default', onPress: doFinish },
        ]
      );
    } else {
      doFinish();
    }
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
    storeLoggedSets,
    exercises.length,
    routineName,
    today,
    finishMutation,
    clearSession,
    router,
  ]);

  // ── Resolved exercise list (re-resolves on mode change) ─────────────────────
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
        renderItem={({ item, index }) => {
          const exId = item.exercise.exerciseId;
          const exercise = item.exercise;
          const isExpanded = expandedId === exId;

          // Live per-set state for this exercise (null-guard: old sessions have none)
          const liveSets = storeLoggedSets[exId] ?? [];
          const checkedCount = liveSets.filter((s) => s.completed).length;

          // Exercise complete when ≥1 set checked (D-08)
          const isCompleted = readOnly
            ? readOnlyCompletedIds.includes(exId)
            : checkedCount > 0;

          // Next not-yet-FINISHED exercise for guided auto-advance: the first one
          // after this whose checked sets are fewer than its total (so a partially
          // logged exercise still qualifies — only fully-complete ones are skipped).
          const nextExercise =
            resolvedExercises
              .slice(index + 1)
              .find((r) => {
                const rSets = storeLoggedSets[r.exercise.exerciseId] ?? [];
                return rSets.filter((s) => s.completed).length < r.exercise.sets;
              })
              ?.exercise ?? null;

          // Progress caption (UI-SPEC A1, D-08)
          const progressCaption = exercise.timed
            ? exercise.duration !== null
              ? `Hold ${exercise.duration}s`
              : null
            : `${checkedCount}/${exercise.sets} sets logged`;
          const captionColor = checkedCount >= 1 ? '#00FF66' : '#888888';

          // Complete left-edge accent (UI-SPEC A1 — replaces v1.0 strikethrough)
          const completedAccentStyle = isCompleted && !readOnly
            ? { borderLeftWidth: 3, borderLeftColor: '#00FF66' }
            : {};

          return (
            <View
              style={[
                {
                  backgroundColor: '#1A1A1A',
                  borderBottomWidth: 1,
                  borderBottomColor: '#2A2A2A',
                },
                completedAccentStyle,
              ]}
              accessibilityState={{ expanded: isExpanded }}
            >
              {/* Collapsed header row */}
              <Pressable
                onPress={() => handleToggleExpand(exId, exercise)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}, ${isCompleted ? 'complete' : 'incomplete'}`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '600',
                        color: '#FFFFFF',
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {exercise.name}
                    </Text>
                    {item.modeTag !== null && <ModeTagPill tag={item.modeTag} />}
                  </View>

                  {/* Secondary line: repsMin–repsMax or timed badge */}
                  <SecondaryLine exercise={exercise} />

                  {/* Progress caption */}
                  {progressCaption !== null && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: captionColor,
                        marginTop: 2,
                      }}
                    >
                      {progressCaption}
                    </Text>
                  )}
                </View>

                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#444444"
                />
              </Pressable>

              {/* Expanded detail section */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  {/* ── Weighted exercise: SetRow table (LOG-01/02) ── */}
                  {!exercise.timed ? (
                    <View>
                      {/* Column header */}
                      <SetTableHeader />

                      {/* One SetRow per set */}
                      {Array.from({ length: exercise.sets }, (_, i) => {
                        const setNumber = i + 1;
                        const liveSet = liveSets[i];

                        // isPrefilled: the set was seeded from prefill but not yet
                        // confirmed by the client (not checked and not yet edited).
                        // We track "edited" via whether the store set differs from
                        // the seed; for simplicity the SetRow manages its own editedState.
                        const isPrefilled = liveSet !== undefined && !liveSet.completed;

                        return (
                          <SetRow
                            key={setNumber}
                            setNumber={setNumber}
                            weight={liveSet?.weight ?? null}
                            reps={liveSet?.reps ?? null}
                            rpe={liveSet?.rpe ?? null}
                            completed={liveSet?.completed ?? false}
                            isPrefilled={isPrefilled}
                            readOnly={readOnly}
                            onChangeWeight={(val) =>
                              setSetValue(exId, setNumber, 'weight', val)
                            }
                            onChangeReps={(val) =>
                              setSetValue(exId, setNumber, 'reps', val)
                            }
                            onChangeRpe={(val) =>
                              setSetValue(exId, setNumber, 'rpe', val)
                            }
                            onToggleDone={() =>
                              handleToggleSet(exId, setNumber, exercise, nextExercise)
                            }
                          />
                        );
                      })}
                    </View>
                  ) : (
                    /* ── Timed exercise: WorkTimerControl (TIMR-02) ── */
                    (() => {
                      // Determine work timer state for this exercise
                      const isThisExercise = workTimerExerciseId === exId;
                      const timerState: WorkTimerState = isThisExercise
                        ? workTimerState
                        : isCompleted
                          ? 'done'
                          : 'idle';
                      const timerRemainingMs = isThisExercise
                        ? workTimer.remainingMs
                        : 0;

                      return (
                        <WorkTimerControl
                          durationSec={exercise.duration ?? 0}
                          state={timerState}
                          remainingMs={timerRemainingMs}
                          onStart={() => {
                            setWorkTimerExerciseId(exId);
                            setWorkTimerState('running');
                            workTimer.start(exercise.duration ?? 0);
                          }}
                          onSkip={() => {
                            workTimer.skip();
                            setWorkTimerState('idle');
                          }}
                          onAdd15={() => workTimer.add15()}
                        />
                      );
                    })()
                  )}

                  {/* ── Trainer notes + demo media (UI-SPEC A2/A3: retained, below the set table) ── */}
                  {exercise.notes !== null && (
                    <Text style={{ fontSize: 14, color: '#888888', marginTop: 8 }}>
                      {exercise.notes}
                    </Text>
                  )}
                  <ExerciseMedia
                    videoUrl={exercise.videoUrl}
                    imageUrl={exercise.imageUrl}
                  />
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{
          // Grow the bottom padding while the rest-timer bar is mounted so the
          // last set row is never hidden behind it (bar is ~56px above the CTA).
          paddingBottom:
            (readOnly ? insets.bottom + 80 : insets.bottom + 96) +
            (restTimer.isRunning ? 64 : 0),
        }}
        showsVerticalScrollIndicator={false}
        // Android clips offscreen subviews by default; with dynamic-height
        // expanded cells that blanks a set row when its height changes on
        // check/uncheck (row reappears only on re-expand). Disable the clipping.
        removeClippedSubviews={false}
      />

      {/* ── Rest-timer bar (pinned above the finish CTA while a rest is running) ── */}
      {restTimer.isRunning && (
        <RestTimerBar
          remainingMs={restTimer.remainingMs}
          totalMs={restTimerTotalMsRef.current}
          onSkip={() => restTimer.skip()}
          onAdd15={() => restTimer.add15()}
        />
      )}

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
          // "Finish Session" label per UI-SPEC A5 (FinishButton renders the label)
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
