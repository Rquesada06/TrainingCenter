/**
 * Session detail — Phase 04 Plan 04 (HIST-02)
 *
 * Shows which exercises were completed vs skipped in a single session, re-deriving
 * exercise names from the immutable assignment snapshot (D-06, Option A — no schema
 * change, snapshot already cached). Shared across roles: both the client History tab
 * and the trainer client-profile list push `/client/history/{sessionId}`.
 *
 * Session lookup: read from the `['sessionHistory', uid]` infinite-query cache first
 * (no extra read when navigating from the list); fall back to a single-doc fetch via
 * getSession for cold deep links. The Firestore sessions read rule denies sessions
 * whose clientId/trainerId don't match the caller (T-04-08).
 */

import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useAssignment } from '@/hooks/useAssignment';
import { getSession } from '@/services/session.service';
import { resolveSessionExercises } from '@/lib/sessionDetail';
import { StatusBadge } from '@/components/sessions/StatusBadge';
import type { Session, LoggedExercise } from '@/types/session';
import type { SessionPage } from '@/services/session.service';
import type { InfiniteData } from '@tanstack/react-query';
import type { AssignmentSnapshotExercise } from '@/types/assignment';

function formatSessionDate(date: string): string {
  // Append T00:00:00 to prevent UTC midnight timezone shift (YYYY-MM-DD → local midnight).
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * One exercise row: name + completed status, with the per-set loads logged for it
 * (weight × reps @ RPE) underneath — surfaced for the client AND the coach who
 * opens this same screen (COAV-01). Null-guards v1.0 sessions with no per-set data.
 */
function ExerciseDetailRow({
  name,
  completed,
  logged,
}: {
  name: string;
  completed: boolean;
  logged?: LoggedExercise;
}) {
  const loggedSets =
    logged && !logged.timed
      ? logged.sets.filter((s) => s.completed && (s.weight != null || s.reps != null))
      : [];

  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons
          name={completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={completed ? '#00FF66' : '#444444'}
        />
        <Text
          style={{
            fontSize: 16,
            fontWeight: '400',
            color: completed ? '#FFFFFF' : '#888888',
            marginLeft: 10,
          }}
        >
          {name}
        </Text>
      </View>

      {loggedSets.length > 0 && (
        <View
          style={{
            marginLeft: 30,
            marginTop: 6,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {loggedSets.map((s) => (
            <View
              key={s.setNumber}
              style={{
                backgroundColor: '#0E0E0E',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{ fontSize: 13, color: '#FFFFFF', fontFamily: 'JetBrainsMono-Regular' }}
              >
                {s.weight != null ? `${s.weight}kg` : '–'} × {s.reps != null ? s.reps : '–'}
                {s.rpe != null ? `  @${s.rpe}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const uid = useAuthStore((s) => s.uid);
  const queryClient = useQueryClient();

  // 1. Try the infinite-query cache (no extra read when arriving from the list).
  const cached = queryClient
    .getQueryData<InfiniteData<SessionPage>>(['sessionHistory', uid, null])
    ?.pages.flatMap((p) => p.items)
    .find((s) => s.id === sessionId);

  // 2. Fall back to a single-doc fetch for cold deep links.
  const { data: fetched, isLoading: isSessionLoading } = useQuery<Session | null>({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: !cached && !!sessionId,
    staleTime: 60_000,
  });

  const session = cached ?? fetched ?? null;

  const { data: assignment, isLoading: isAssignmentLoading } = useAssignment(
    session?.assignmentId
  );

  // Session not yet resolved — show a brief loader.
  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {isSessionLoading ? (
            <ActivityIndicator color="#00FF66" size="large" />
          ) : (
            <Text style={{ color: '#888888', fontSize: 16 }}>Session not found.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const day =
    assignment?.snapshot.weeks[session.weekIndex]?.days[session.dayIndex];
  const { completed, skipped } = resolveSessionExercises(
    day,
    session.completedExerciseIds
  );

  // Fallback when the assignment is gone: show raw IDs (muted) so the row count
  // still matches what was recorded (UI-SPEC § 4 edge case).
  const assignmentMissing = !isAssignmentLoading && !assignment;
  const fallbackCompletedIds = session.completedExerciseIds;

  // Per-exercise logged loads (Phase 5 data), keyed by exerciseId. Empty for v1.0.
  const loggedById = new Map<string, LoggedExercise>(
    (session.loggedExercises ?? []).map((le) => [le.exerciseId, le])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header (renders immediately) ───────────────────────────────── */}
        <View style={{ marginBottom: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#FFFFFF' }}>
            {formatSessionDate(session.date)}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '400', color: '#888888', marginTop: 4 }}>
            {session.routineName ?? 'Session'}
          </Text>
          <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <StatusBadge session={session} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '400', color: '#888888', marginTop: 4 }}>
            {session.mode === 'gym' ? 'Gym' : 'Home'}
          </Text>
        </View>

        {/* ── Exercises card ─────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#1A1A1A', borderRadius: 8, padding: 16 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: '#888888', marginBottom: 8 }}
          >
            EXERCISES
          </Text>

          {session.totalExercises === 0 ? (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: '#888888',
                textAlign: 'center',
                paddingVertical: 16,
              }}
            >
              No exercise data for this session.
            </Text>
          ) : isAssignmentLoading ? (
            <ActivityIndicator color="#00FF66" style={{ paddingVertical: 16 }} />
          ) : assignmentMissing ? (
            // Assignment deleted — fall back to raw completed exercise IDs (muted).
            fallbackCompletedIds.map((id: string) => (
              <ExerciseDetailRow key={id} name={id} completed={false} />
            ))
          ) : (
            <>
              {completed.map((ex: AssignmentSnapshotExercise) => (
                <ExerciseDetailRow
                  key={ex.exerciseId}
                  name={ex.name}
                  completed
                  logged={loggedById.get(ex.exerciseId)}
                />
              ))}
              {skipped.map((ex: AssignmentSnapshotExercise) => (
                <ExerciseDetailRow
                  key={ex.exerciseId}
                  name={ex.name}
                  completed={false}
                  logged={loggedById.get(ex.exerciseId)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
