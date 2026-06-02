/**
 * Create program screen — Phase 02 Plan 05 (PROG-01)
 *
 * Meta-only create flow: user fills in name, description, durationWeeks.
 * After creation, navigates directly to the program's edit screen where
 * the Week×Day grid can be filled in.
 *
 * Two-step UX rationale: Creating with an empty grid and then editing
 * it is cleaner than creating with a grid that has no routines yet.
 *
 * Error handling: withSaveFeedback wraps mutateAsync.
 *
 * Design system: Obsidian Performance
 *   - Background: #0E0E0E
 *   - Header: #FFFFFF
 *   - Muted: #888888
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

import { useCreateProgram } from '@/hooks/useCreateProgram';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import { ProgramMetaForm } from '@/components/programs/ProgramMetaForm';
import type { ProgramFormValues } from '@/validation/program.schema';

export default function NewProgramScreen() {
  const createProgram = useCreateProgram();

  const handleSubmit = async (values: ProgramFormValues) => {
    await withSaveFeedback(
      async () => {
        const id = await createProgram.mutateAsync({
          name: values.name,
          description: values.description,
          durationWeeks: values.durationWeeks,
        });
        // Navigate to the edit screen with the new program id
        router.replace(`/trainer/programs/${id}`);
      },
      () => {
        // onSuccess callback — navigation already happened above
      },
      'Could not create program'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#1A1A1A',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
            New Program
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#888888', fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgramMetaForm
            submitLabel="Create program"
            onSubmit={handleSubmit}
            submitting={createProgram.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
