/**
 * Program detail screen — Phase 02 Plan 05 (PROG-02, PROG-03, PROG-04, PROG-05, ASGN-01..04)
 *
 * Layout:
 *   - Section 1: Metadata (name, description, duration) + "Edit metadata" inline form
 *   - Section 2: WeekDayGrid — tap cell opens DayPickerSheet to assign routine/rest
 *   - Section 3: Actions — "Assign to Client" + "Delete Program"
 *
 * Grid edit flow:
 *   onCellPress(w, d) → DayPickerSheet.present(w, d)
 *   onSelect(w, d, choice) → update weeks[w].days[d] + call updateProgram mutation
 *
 * Assignment flow:
 *   "Assign to Client" → AssignProgramModal visible=true
 *   → picks client + start date → ASGN-02 overwrite check → CF call → onComplete → router.back()
 *
 * Delete flow:
 *   Alert.alert confirm → deleteProgram mutation → router.back()
 *
 * Error handling: withSaveFeedback wraps all write mutations.
 *
 * Design system: Obsidian Performance
 *   - Background: #0E0E0E
 *   - Surface: #1A1A1A
 *   - Text: #FFFFFF
 *   - Muted: #888888
 *   - Accent: #00FF66
 *   - Destructive: #EF4444
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useProgram } from '@/hooks/useProgram';
import { useUpdateProgram } from '@/hooks/useUpdateProgram';
import { useDeleteProgram } from '@/hooks/useDeleteProgram';
import { useRoutines } from '@/hooks/useRoutines';
import { withSaveFeedback } from '@/lib/mutationFeedback';
import { WeekDayGrid } from '@/components/programs/WeekDayGrid';
import { DayPickerSheet, type DayPickerSheetHandle } from '@/components/programs/DayPickerSheet';
import { AssignProgramModal } from '@/components/programs/AssignProgramModal';
import { ProgramMetaForm } from '@/components/programs/ProgramMetaForm';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { ProgramWeek } from '@/types/program';

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const dayPickerRef = useRef<DayPickerSheetHandle>(null);

  const { data: program, isLoading } = useProgram(programId);
  const { data: routines = [] } = useRoutines();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editMetaVisible, setEditMetaVisible] = useState(false);

  // Build routineNameMap for grid display
  const routineNameMap: Record<string, string> = {};
  for (const r of routines) {
    routineNameMap[r.id] = r.name;
  }

  const handleCellPress = (w: number, d: number) => {
    dayPickerRef.current?.present(w, d);
  };

  const handleDaySelect = (w: number, d: number, choice: string | 'rest' | null) => {
    if (!program) return;
    // Deep copy weeks and update the chosen cell
    const newWeeks: ProgramWeek[] = program.weeks.map((week, wi) =>
      wi === w
        ? { ...week, days: week.days.map((day, di) => (di === d ? choice : day)) }
        : week
    );
    withSaveFeedback(
      () => updateProgram.mutateAsync({ id: programId!, partial: { weeks: newWeeks } }),
      () => {
        // Invalidation handled by the hook
      },
      'Could not update day'
    );
  };

  const handleMetaSubmit = async (values: { name: string; description?: string; durationWeeks: number }) => {
    await withSaveFeedback(
      () =>
        updateProgram.mutateAsync({
          id: programId!,
          partial: {
            name: values.name,
            description: values.description,
            durationWeeks: values.durationWeeks,
          },
        }),
      () => {
        setEditMetaVisible(false);
      },
      'Could not update program'
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete program',
      'This cannot be undone. Active assignments will keep their snapshot.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            withSaveFeedback(
              () => deleteProgram.mutateAsync(programId!),
              () => {
                router.back();
              },
              'Could not delete program'
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00FF66" />
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#888888', fontSize: 16, textAlign: 'center' }}>
          Program not found.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#00FF66', fontSize: 15 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#1A1A1A',
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#00FF66', fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text
          style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', flex: 1 }}
          numberOfLines={1}
        >
          {program.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Section 1: Metadata */}
        <View
          style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>
            {program.name}
          </Text>
          <Text style={{ color: '#888888', fontSize: 13, marginTop: 4 }}>
            {`${program.durationWeeks} week${program.durationWeeks === 1 ? '' : 's'}`}
          </Text>
          {program.description ? (
            <Text style={{ color: '#888888', fontSize: 14, marginTop: 8 }}>
              {program.description}
            </Text>
          ) : null}
          <Pressable
            onPress={() => setEditMetaVisible(true)}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: '#00FF66', fontSize: 14 }}>Edit metadata</Text>
          </Pressable>
        </View>

        {/* Section 2: Week × Day grid */}
        <Text style={{ color: '#888888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Schedule
        </Text>
        <View style={{ marginBottom: 24 }}>
          <WeekDayGrid
            weeks={program.weeks}
            routineNameMap={routineNameMap}
            onCellPress={handleCellPress}
          />
        </View>

        {/* Section 3: Actions */}
        <PrimaryButton
          label="Assign to Client"
          onPress={() => setAssignModalVisible(true)}
        />
        <View style={{ marginTop: 12 }}>
          <PrimaryButton
            label="Delete Program"
            variant="outline"
            onPress={confirmDelete}
          />
        </View>
      </ScrollView>

      {/* DayPickerSheet */}
      <DayPickerSheet
        ref={dayPickerRef}
        onSelect={handleDaySelect}
      />

      {/* AssignProgramModal */}
      <AssignProgramModal
        visible={assignModalVisible}
        programId={programId!}
        onComplete={() => {
          setAssignModalVisible(false);
          router.back();
        }}
        onCancel={() => setAssignModalVisible(false)}
      />

      {/* Edit metadata modal */}
      <Modal
        visible={editMetaVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditMetaVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
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
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                Edit Program
              </Text>
              <Pressable onPress={() => setEditMetaVisible(false)}>
                <Text style={{ color: '#888888', fontSize: 16 }}>Cancel</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <ProgramMetaForm
                defaultValues={{
                  name: program.name,
                  description: program.description,
                  durationWeeks: program.durationWeeks,
                }}
                submitLabel="Save changes"
                onSubmit={handleMetaSubmit}
                submitting={updateProgram.isPending}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
