/**
 * RoutineBuilder — Master form component for creating/editing routines.
 *
 * Phase 02 Plan 04 (ROUT-01..06)
 *
 * Combines:
 * - RHF useForm + useFieldArray + zodResolver(routineSchema)
 * - SortableExerciseList for drag-reorder (ROUT-04)
 * - ExercisePickerSheet for adding exercises (ROUT-01)
 * - AlternativeExercisePicker for setting alternatives (ROUT-05)
 * - RoutineExerciseRow for per-exercise overrides + notes (ROUT-02, ROUT-03)
 *
 * On pick, seeds exercise defaults from the source Exercise document (first-pick defaults).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useExercises } from '@/hooks/useExercises';
import { routineSchema } from '@/validation/routine.schema';
import type { RoutineFormValues } from '@/validation/routine.schema';
import { TextField } from '@/components/ui/TextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RoutineExerciseRow } from './RoutineExerciseRow';
import { SortableExerciseList } from './SortableExerciseList';
import type { SortableField } from './SortableExerciseList';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import type { ExercisePickerSheetRef } from './ExercisePickerSheet';
import { AlternativeExercisePicker } from './AlternativeExercisePicker';
import type { AlternativeExercisePickerRef } from './AlternativeExercisePicker';
import type { Exercise } from '@/types/exercise';

export interface RoutineBuilderProps {
  defaultValues?: Partial<RoutineFormValues>;
  onSubmit: (values: RoutineFormValues) => Promise<void>;
  submitLabel: string;
  submitting?: boolean;
  onDelete?: () => void;
}

export function RoutineBuilder({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting = false,
  onDelete,
}: RoutineBuilderProps) {
  // ── Form ──────────────────────────────────────────────────────────────────
  // Explicit z.input/z.output types to avoid Pitfall 4 resolver type mismatch
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<z.input<typeof routineSchema>, unknown, z.output<typeof routineSchema>>({
    resolver: zodResolver(routineSchema),
    defaultValues: defaultValues ?? { name: '', exercises: [] },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'exercises',
  });

  // useFieldArray's `fields` holds INITIAL values only — setValue on a nested
  // field (e.g. picking an alternative) does not update it. Watch the live array
  // so rows re-render with the current alternativeExerciseId.
  const watchedExercises = watch('exercises');

  // ── Exercise name map for display ─────────────────────────────────────────
  const exercisesQuery = useExercises();
  const exercisesMap = useMemo<Record<string, Exercise>>(() => {
    const map: Record<string, Exercise> = {};
    for (const ex of exercisesQuery.data ?? []) {
      map[ex.id] = ex;
    }
    return map;
  }, [exercisesQuery.data]);

  // ── Picker state ──────────────────────────────────────────────────────────
  const pickerRef = useRef<ExercisePickerSheetRef>(null);
  const altPickerRef = useRef<AlternativeExercisePickerRef>(null);
  const [altPickerIndex, setAltPickerIndex] = useState<number | null>(null);

  // ── Picker handlers ───────────────────────────────────────────────────────
  const handleExercisesSelected = useCallback(
    (selected: Exercise[]) => {
      for (const ex of selected) {
        append({
          exerciseId: ex.id,
          name: ex.name,
          sets: ex.defaultSets ?? 3,
          reps: ex.defaultReps,
          duration: ex.defaultDuration,
          rest: ex.defaultRest ?? 60,
          notes: '',
          alternativeExerciseId: undefined,
          order: fields.length,
        });
      }
    },
    [append, fields.length]
  );

  const handleAlternativeSelected = useCallback(
    (ex: Exercise) => {
      if (altPickerIndex !== null) {
        setValue(`exercises.${altPickerIndex}.alternativeExerciseId`, ex.id);
      }
    },
    [altPickerIndex, setValue]
  );

  const openAlternativePicker = useCallback(
    (index: number) => {
      setAltPickerIndex(index);
      altPickerRef.current?.present();
    },
    []
  );

  // ── Drag-reorder sync ─────────────────────────────────────────────────────
  const handleReorder = useCallback(
    (newOrder: string[]) => {
      // newOrder is array of RHF field ids (not exerciseIds — the stable internal ids).
      // Map each id → the current field object and replace the array.
      const reordered = newOrder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((id) => fields.find((f) => f.id === id) as any)
        .filter(Boolean);
      if (reordered.length === fields.length) {
        replace(reordered);
      }
    },
    [fields, replace]
  );

  // ── Delete confirmation ───────────────────────────────────────────────────
  const handleDeletePress = useCallback(() => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Routine',
      'This cannot be undone. Active assignments will keep their snapshot.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }, [onDelete]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        No outer ScrollView: react-native-reanimated-dnd's <Sortable> renders its
        own FlatList (a VirtualizedList). Nesting it in a ScrollView triggers the
        "VirtualizedLists should never be nested" warning and breaks scroll/drag.
        Layout instead as fixed header → Sortable (the only vertical scroller) →
        fixed footer.
      */}
      <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
        {/* Fixed header: routine name + exercises label */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                label="Routine name"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
                placeholder="e.g. Push Day A"
              />
            )}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', flex: 1 }}>
              Exercises
            </Text>
            {errors.exercises?.root?.message || (errors.exercises as { message?: string })?.message ? (
              <Text style={{ color: '#F87171', fontSize: 13 }}>
                {(errors.exercises?.root?.message ?? (errors.exercises as { message?: string })?.message) as string}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Exercise list — Sortable owns the vertical scroll (flex:1) */}
        {fields.length > 0 ? (
          <View style={{ flex: 1 }}>
            <SortableExerciseList
              fields={fields as unknown as SortableField[]}
              onReorder={handleReorder}
              renderItem={({ item, index, dragHandle }) => {
                // Read the live alternative from the watched array, not the
                // stale useFieldArray `item`, so the row reflects the picker.
                const altId = watchedExercises?.[index]?.alternativeExerciseId;
                return (
                  <RoutineExerciseRow
                    key={item.id}
                    index={index}
                    control={control as never}
                    exerciseName={exercisesMap[item.exerciseId]?.name ?? item.name ?? item.exerciseId}
                    alternativeName={altId ? (exercisesMap[altId]?.name ?? null) : null}
                    onRemove={() => remove(index)}
                    onOpenAlternativePicker={() => openAlternativePicker(index)}
                    dragHandle={dragHandle}
                  />
                );
              }}
            />
          </View>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 32,
                borderWidth: 1,
                borderColor: '#2A2A2A',
                borderStyle: 'dashed',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#888888', fontSize: 14 }}>
                No exercises added yet
              </Text>
            </View>
          </View>
        )}

        {/* Fixed footer: add / submit / delete */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <View style={{ marginBottom: 12 }}>
            <PrimaryButton
              label="+ Add Exercises"
              variant="outline"
              onPress={() => pickerRef.current?.present()}
            />
          </View>

          <View style={{ marginBottom: onDelete ? 12 : 0 }}>
            <PrimaryButton
              label={submitLabel}
              onPress={handleSubmit(onSubmit as (data: z.output<typeof routineSchema>) => Promise<void>)}
              loading={submitting}
            />
          </View>

          {onDelete ? (
            <PrimaryButton
              label="Delete Routine"
              variant="outline"
              onPress={handleDeletePress}
            />
          ) : null}
        </View>
      </View>

      {/* Exercise picker bottom sheet */}
      <ExercisePickerSheet
        ref={pickerRef}
        onSelect={handleExercisesSelected}
      />

      {/* Alternative exercise picker bottom sheet */}
      <AlternativeExercisePicker
        ref={altPickerRef}
        excludeExerciseId={altPickerIndex !== null ? fields[altPickerIndex]?.exerciseId : undefined}
        onSelect={handleAlternativeSelected}
      />
    </>
  );
}
