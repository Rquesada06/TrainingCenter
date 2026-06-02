/**
 * Edit/delete exercise screen (EXER-02, EXER-03)
 *
 * Phase 02 Plan 02
 *
 * - Reads the exercise doc by id (useQuery with exerciseId-scoped key)
 * - Pre-populates ExerciseForm with current values
 * - Save: updates Firestore doc + invalidates exercises query
 * - Delete: shows Alert confirmation, deletes doc, navigates back
 *
 * Security (T-02-02 / EXER-06):
 *   If `getExercise(exerciseId)` throws with code 'firestore/permission-denied',
 *   the screen treats it as "not found" — another trainer's exercise id reveals
 *   neither its existence nor any field values.
 */

import React from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import { useUpdateExercise } from '@/hooks/useUpdateExercise';
import { useDeleteExercise } from '@/hooks/useDeleteExercise';
import { getExercise } from '@/services/exercise.service';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import type { ExerciseFormValues } from '@/validation/exercise.schema';

export default function EditExerciseScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();
  const updateMutation = useUpdateExercise();
  const deleteMutation = useDeleteExercise();

  // ── Load single exercise doc
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      try {
        return await getExercise(exerciseId);
      } catch (err: unknown) {
        // T-02-02: permission-denied from another trainer's exerciseId → treat as not found
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'firestore/permission-denied'
        ) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!exerciseId,
  });

  // ── Save handler (EXER-02)
  const handleSubmit = (values: ExerciseFormValues) =>
    withSaveFeedback(
      () => updateMutation.mutateAsync({ id: exerciseId, partial: values }),
      () => router.back(),
      'Could not save exercise',
    );

  // ── Delete handler (EXER-03) — always shows confirmation Alert
  const handleDelete = () => {
    Alert.alert(
      'Delete exercise',
      'This cannot be undone. Exercises used in routines will remain in those routines.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            withSaveFeedback(
              () => deleteMutation.mutateAsync(exerciseId),
              () => router.back(),
              'Could not delete exercise',
            ),
        },
      ]
    );
  };

  // ── Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Exercise', headerShown: true, headerStyle: { backgroundColor: '#0E0E0E' }, headerTintColor: '#FFFFFF' }} />
        <ActivityIndicator color="#00FF66" size="large" />
      </View>
    );
  }

  // ── Not found (deleted or permission-denied)
  if (isError || data === null || data === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Exercise', headerShown: true, headerStyle: { backgroundColor: '#0E0E0E' }, headerTintColor: '#FFFFFF' }} />
        <Text style={{ color: '#888888', fontSize: 16 }}>Exercise not found.</Text>
      </View>
    );
  }

  // ── Map Exercise → ExerciseFormValues (strip non-form fields)
  const defaultValues: Partial<ExerciseFormValues> = {
    name: data.name,
    description: data.description,
    category: data.category,
    locationTypes: data.locationTypes,
    defaultSets: data.defaultSets,
    defaultReps: data.defaultReps,
    defaultDuration: data.defaultDuration,
    defaultRest: data.defaultRest,
    videoUrl: data.videoUrl ?? '',
    imageUrl: data.imageUrl ?? '',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <Stack.Screen
        options={{
          title: data.name,
          headerShown: true,
          headerStyle: { backgroundColor: '#0E0E0E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF' },
        }}
      />
      <ExerciseForm
        defaultValues={defaultValues}
        submitLabel="Save changes"
        submitting={updateMutation.isPending || deleteMutation.isPending}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </View>
  );
}
