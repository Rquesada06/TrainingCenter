/**
 * New exercise screen (EXER-01)
 *
 * Phase 02 Plan 02
 *
 * Creates a new exercise via useCreateExercise mutation.
 * On success, navigates back to the exercises list.
 * RHF + zodResolver(exerciseSchema) validates all fields before any Firestore write.
 */

import React from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import { useCreateExercise } from '@/hooks/useCreateExercise';
import type { ExerciseFormValues } from '@/validation/exercise.schema';

export default function NewExerciseScreen() {
  const router = useRouter();
  const mutation = useCreateExercise();

  const handleSubmit = async (values: ExerciseFormValues) => {
    await mutation.mutateAsync(values);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <Stack.Screen
        options={{
          title: 'New Exercise',
          headerShown: true,
          headerStyle: { backgroundColor: '#0E0E0E' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF' },
        }}
      />
      <ExerciseForm
        submitLabel="Create exercise"
        submitting={mutation.isPending}
        onSubmit={handleSubmit}
      />
    </View>
  );
}
