/**
 * RoutineExerciseRow — One exercise entry in the routine builder.
 *
 * Phase 02 Plan 04 (ROUT-02, ROUT-03, ROUT-05)
 *
 * Renders:
 * - Exercise name header + drag handle + remove button
 * - 4 numeric TextFields for sets/reps/duration/rest (ROUT-02)
 * - Notes field (ROUT-03)
 * - Alternative exercise selector (ROUT-05)
 *
 * Uses RHF Controller for all fields so values stay in the form state.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { TextField } from '@/components/ui/TextField';
import type { RoutineFormValues } from '@/validation/routine.schema';

export interface RoutineExerciseRowProps {
  index: number;
  control: Control<RoutineFormValues>;
  exerciseName: string;
  alternativeName: string | null;
  onRemove: () => void;
  onOpenAlternativePicker: () => void;
  dragHandle?: React.ReactNode;
}

export function RoutineExerciseRow({
  index,
  control,
  exerciseName,
  alternativeName,
  onRemove,
  onOpenAlternativePicker,
  dragHandle,
}: RoutineExerciseRowProps) {
  return (
    <View
      style={{
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#444444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
      }}
    >
      {/* Header row: name + drag handle + remove */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text
          style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}
          numberOfLines={1}
        >
          {exerciseName}
        </Text>
        {dragHandle ? (
          <View style={{ marginRight: 8 }}>{dragHandle}</View>
        ) : null}
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Remove exercise"
        >
          <Text style={{ color: '#888888', fontSize: 18, fontWeight: '400' }}>×</Text>
        </Pressable>
      </View>

      {/* Numeric overrides: sets / reps / duration / rest — ROUT-02 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Sets */}
        <View style={{ flex: 1 }}>
          <Controller
            name={`exercises.${index}.sets`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                label="Sets"
                value={String(field.value ?? '')}
                onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        {/* Reps */}
        <View style={{ flex: 1 }}>
          <Controller
            name={`exercises.${index}.reps`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                label="Reps"
                value={String(field.value ?? '')}
                onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        {/* Duration (s) */}
        <View style={{ flex: 1 }}>
          <Controller
            name={`exercises.${index}.duration`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                label="Dur (s)"
                value={String(field.value ?? '')}
                onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
        {/* Rest (s) */}
        <View style={{ flex: 1 }}>
          <Controller
            name={`exercises.${index}.rest`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                label="Rest (s)"
                value={String(field.value ?? '')}
                onChangeText={(v) => field.onChange(v ? Number(v) : undefined)}
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
        </View>
      </View>

      {/* Notes field — ROUT-03 */}
      <Controller
        name={`exercises.${index}.notes`}
        control={control}
        render={({ field }) => (
          <TextField
            label="Notes"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            placeholder="Optional — e.g. slow eccentric"
            multiline
          />
        )}
      />

      {/* Alternative exercise — ROUT-05 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: '#888888', fontSize: 13, marginRight: 8 }}>Alt:</Text>
        <Pressable onPress={onOpenAlternativePicker}>
          <Text
            style={{
              color: alternativeName ? '#00FF66' : '#888888',
              fontSize: 13,
              textDecorationLine: alternativeName ? 'none' : 'underline',
            }}
          >
            {alternativeName ?? '+ Add alternative'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
