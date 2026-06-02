/**
 * Create routine screen (ROUT-01..05)
 *
 * Phase 02 Plan 04
 *
 * Renders RoutineBuilder with the create mutation.
 * On successful save, navigates back to the routines list.
 */

import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateRoutine } from '@/hooks/useCreateRoutine';
import { RoutineBuilder } from '@/components/routines/RoutineBuilder';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import type { RoutineFormValues } from '@/validation/routine.schema';

export default function NewRoutineScreen() {
  const router = useRouter();
  const createMutation = useCreateRoutine();

  const handleSubmit = (values: RoutineFormValues) =>
    withSaveFeedback(
      () => createMutation.mutateAsync(values),
      () => router.back(),
      'Could not create routine',
    );

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
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' }}>
          New Routine
        </Text>
      </View>

      <RoutineBuilder
        submitLabel="Create Routine"
        submitting={createMutation.isPending}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}
