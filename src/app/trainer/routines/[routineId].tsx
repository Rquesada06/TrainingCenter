/**
 * Edit / delete routine screen (ROUT-06)
 *
 * Phase 02 Plan 04
 *
 * - Loads routine by ID (useRoutine)
 * - Pre-populates RoutineBuilder with existing values
 * - Save → updateRoutine mutation → navigate back
 * - Delete → confirm alert → deleteRoutine mutation → navigate back
 *
 * Delete confirmation text reinforces ASGN-03: active assignments
 * keep their immutable snapshot even after the routine is deleted.
 */

import React from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoutine } from '@/hooks/useRoutine';
import { useUpdateRoutine } from '@/hooks/useUpdateRoutine';
import { useDeleteRoutine } from '@/hooks/useDeleteRoutine';
import { RoutineBuilder } from '@/components/routines/RoutineBuilder';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import type { RoutineFormValues } from '@/validation/routine.schema';

export default function EditRoutineScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const { data, isLoading } = useRoutine(routineId);
  const updateMutation = useUpdateRoutine();
  const deleteMutation = useDeleteRoutine();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00FF66" size="large" />
      </SafeAreaView>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#888888', fontSize: 16 }}>Routine not found.</Text>
      </SafeAreaView>
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = (values: RoutineFormValues) =>
    withSaveFeedback(
      () => updateMutation.mutateAsync({ id: routineId!, partial: values }),
      () => router.back(),
      'Could not save routine',
    );

  const handleDelete = () => {
    Alert.alert(
      'Delete Routine',
      'This cannot be undone. Active assignments will keep their snapshot.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            withSaveFeedback(
              () => deleteMutation.mutateAsync(routineId!),
              () => router.back(),
              'Could not delete routine',
            ),
        },
      ]
    );
  };

  // ── Default values: map Routine → RoutineFormValues shape ─────────────────
  const defaultValues: Partial<RoutineFormValues> = {
    name: data.name,
    exercises: data.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      duration: ex.duration,
      rest: ex.rest,
      notes: ex.notes ?? '',
      alternativeExerciseId: ex.alternativeExerciseId,
      order: ex.order,
    })),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      {/* Screen header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' }} numberOfLines={1}>
          {data.name}
        </Text>
      </View>

      <RoutineBuilder
        defaultValues={defaultValues}
        submitLabel="Save Changes"
        submitting={updateMutation.isPending}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}
